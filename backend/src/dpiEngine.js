const PcapReader = require('./pcapReader');
const { parsePacket } = require('./packetParser');
const { extractSNI, extractHTTPHost, extractDNSQuery } = require('./sniExtractor');
const { FlowTracker } = require('./flowTracker');
const { sniToAppType } = require('./types');
const { v4: uuidv4 } = require('uuid');

const MAX_DISPLAY_PACKETS = 500;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class DPIEngine {
  constructor(rules, io) {
    this.rules = rules;
    this.io = io;
    this.flowTracker = new FlowTracker();
    this.stats = this._emptyStats();
    this.packets = [];
    this.sniMap = new Map();
    this.appCountMap = new Map();
    this.isProcessing = false;
    // ── Thread simulation ──────────────────────────────────
    this.threadConfig = { numLBs: 2, numFPs: 2 };
    this._initThreadStats();
  }

  _initThreadStats() {
    const { numLBs, numFPs } = this.threadConfig;
    this.lbStats = Array.from({ length: numLBs }, (_, i) => ({
      id: i, dispatched: 0,
    }));
    this.fpStats = Array.from({ length: numLBs * numFPs }, (_, i) => ({
      id: i, processed: 0,
    }));
  }

  _hashTuple(tuple) {
    const str = `${tuple.src_ip}:${tuple.src_port}-${tuple.dst_ip}:${tuple.dst_port}:${tuple.protocol}`;
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  _assignThread(tuple) {
    const { numLBs, numFPs } = this.threadConfig;
    const hash = this._hashTuple(tuple);
    const lbIdx = hash % numLBs;
    const fpIdx = (hash >> 4) % (numLBs * numFPs);
    return { lbIdx, fpIdx };
  }

  _emptyStats() {
    return {
      total: 0, forwarded: 0, dropped: 0,
      tcp: 0, udp: 0, other: 0,
      bytes: 0, startTime: null, endTime: null,
    };
  }

  reset() {
    this.flowTracker.clear();
    this.stats = this._emptyStats();
    this.packets = [];
    this.sniMap.clear();
    this.appCountMap.clear();
    this.isProcessing = false;
    this._initThreadStats();
  }

  setThreadConfig(numLBs, numFPs) {
    this.threadConfig = {
      numLBs: Math.min(Math.max(numLBs, 1), 4),
      numFPs: Math.min(Math.max(numFPs, 1), 4),
    };
    this._initThreadStats();
  }

  // ─── PCAP File Processing ──────────────────────────────────────────────────

  async processPcap(filePath) {
    this.reset();
    this.isProcessing = true;
    this.stats.startTime = Date.now();

    const reader = new PcapReader();
    reader.open(filePath);

    let packetIndex = 0;
    let batchCount = 0;

    while (reader.hasMore()) {
      const raw = reader.readNextPacket();
      if (!raw) break;

      this._processRawPacket(raw, packetIndex++);
      batchCount++;

      if (batchCount % 50 === 0) {
        this._emitLiveData();
        await sleep(5); // yield to event loop
      }
    }

    this.stats.endTime = Date.now();
    this.isProcessing = false;
    this._emitLiveData();
    this.io.emit('processing_complete', this.getReport());

    return this.getReport();
  }

  _processRawPacket(raw, index) {
    this.stats.total++;
    this.stats.bytes += raw.incl_len;

    const parsed = parsePacket(raw.data);
    if (!parsed.valid || !parsed.src_ip) {
      this.stats.forwarded++;
      return;
    }

    if (parsed.has_tcp) this.stats.tcp++;
    else if (parsed.has_udp) this.stats.udp++;
    else this.stats.other++;

    const tuple = {
      src_ip: parsed.src_ip, dst_ip: parsed.dst_ip,
      src_port: parsed.src_port, dst_port: parsed.dst_port,
      protocol: parsed.protocol,
    };

    // ── Thread assignment ──
    const { lbIdx, fpIdx } = this._assignThread(tuple);
    this.lbStats[lbIdx].dispatched++;
    this.fpStats[fpIdx].processed++;

    const flow = this.flowTracker.getOrCreate(tuple);
    flow.packet_count++;
    flow.byte_count += raw.incl_len;
    flow.last_seen = Date.now();

    // ── DPI Classification ──
    if (parsed.payload && parsed.payload.length > 0 && !flow.classified) {
      const dstPort = parsed.dst_port;
      const srcPort = parsed.src_port;

      if ((dstPort === 443 || dstPort === 8443) && !flow.sni) {
        const sni = extractSNI(parsed.payload);
        if (sni) {
          flow.sni = sni;
          flow.app_type = sniToAppType(sni);
          flow.classified = true;
          this.sniMap.set(sni, flow.app_type);
        }
      } else if ((dstPort === 80 || dstPort === 8080) && !flow.http_host) {
        const host = extractHTTPHost(parsed.payload);
        if (host) {
          flow.http_host = host;
          flow.app_type = 'HTTP';
          flow.classified = true;
          this.sniMap.set(host, 'HTTP');
        }
      } else if (dstPort === 53 || srcPort === 53) {
        const query = extractDNSQuery(parsed.payload);
        if (query) {
          flow.dns_query = query;
          this.sniMap.set(query, 'DNS');
        }
        flow.app_type = 'DNS';
      }
    }

    // Fallback classification by port
    if (flow.app_type === 'Unknown') {
      if (parsed.dst_port === 443 || parsed.src_port === 443) flow.app_type = 'HTTPS';
      else if (parsed.dst_port === 80 || parsed.src_port === 80) flow.app_type = 'HTTP';
      else if (parsed.dst_port === 53 || parsed.src_port === 53) flow.app_type = 'DNS';
    }

    // ── Blocking ──
    const sniOrHost = flow.sni || flow.http_host || flow.dns_query;
    const blockResult = this.rules.isBlocked(parsed.src_ip, flow.app_type, sniOrHost);

    let blocked = false;
    if (blockResult.blocked) {
      blocked = true;
      flow.blocked = true;
      flow.block_reason = blockResult.reason;
    } else if (flow.blocked) {
      blocked = true;
    }

    if (blocked) this.stats.dropped++;
    else this.stats.forwarded++;

    // ── App Stats ──
    const appKey = flow.app_type || 'Unknown';
    this.appCountMap.set(appKey, (this.appCountMap.get(appKey) || 0) + 1);

    // ── Build Packet Record ──
    const proto = parsed.protocol === 6 ? 'TCP' : parsed.protocol === 17 ? 'UDP' : `${parsed.protocol}`;
    const record = {
      id: uuidv4(),
      index: this.stats.total,
      timestamp: new Date(raw.ts_sec * 1000).toISOString(),
      src_ip: parsed.src_ip,
      dst_ip: parsed.dst_ip,
      src_port: parsed.src_port,
      dst_port: parsed.dst_port,
      protocol: proto,
      length: raw.incl_len,
      flags: parsed.tcp_flags_str || null,
      app_type: flow.app_type,
      sni: sniOrHost || null,
      blocked,
      block_reason: blocked ? (flow.block_reason || 'Flow blocked') : null,
      ttl: parsed.ttl,
    };

    this._addPacket(record);
    this.io.emit('packet', record);
    this.io.emit('flow_update', flow.toJSON());
  }

  // ─── Demo Traffic Generator ────────────────────────────────────────────────

  async generateDemoTraffic() {
    this.reset();
    this.isProcessing = true;
    this.stats.startTime = Date.now();

    const packets = this._buildDemoPackets();

    for (let i = 0; i < packets.length; i++) {
      this._processDemoPacket(packets[i], i);

      if (i % 10 === 0) {
        this._emitLiveData();
        await sleep(30);
      }
    }

    this.stats.endTime = Date.now();
    this.isProcessing = false;
    this._emitLiveData();
    this.io.emit('processing_complete', this.getReport());

    return this.getReport();
  }

  _processDemoPacket(pkt, index) {
    this.stats.total++;
    this.stats.bytes += pkt.length;

    if (pkt.protocol === 'TCP') this.stats.tcp++;
    else if (pkt.protocol === 'UDP') this.stats.udp++;
    else this.stats.other++;

    const protoNum = pkt.protocol === 'TCP' ? 6 : 17;
    const tuple = {
      src_ip: pkt.src_ip, dst_ip: pkt.dst_ip,
      src_port: pkt.src_port, dst_port: pkt.dst_port,
      protocol: protoNum,
    };

    // ── Thread assignment ──
    const { lbIdx, fpIdx } = this._assignThread(tuple);
    this.lbStats[lbIdx].dispatched++;
    this.fpStats[fpIdx].processed++;

    const flow = this.flowTracker.getOrCreate(tuple);
    flow.packet_count++;
    flow.byte_count += pkt.length;
    flow.last_seen = Date.now();

    if (pkt.sni && !flow.sni) {
      flow.sni = pkt.sni;
      flow.app_type = pkt.app_type;
      flow.classified = true;
      this.sniMap.set(pkt.sni, pkt.app_type);
    }

    if (!flow.classified && pkt.app_type) {
      flow.app_type = pkt.app_type;
    }

    const sniOrHost = flow.sni || flow.http_host || null;
    const blockResult = this.rules.isBlocked(pkt.src_ip, flow.app_type, sniOrHost);

    let blocked = false;
    if (blockResult.blocked) {
      blocked = true;
      flow.blocked = true;
      flow.block_reason = blockResult.reason;
    } else if (flow.blocked) {
      blocked = true;
    }

    if (blocked) this.stats.dropped++;
    else this.stats.forwarded++;

    const appKey = flow.app_type || 'Unknown';
    this.appCountMap.set(appKey, (this.appCountMap.get(appKey) || 0) + 1);

    const record = {
      id: uuidv4(),
      index: this.stats.total,
      timestamp: new Date().toISOString(),
      src_ip: pkt.src_ip,
      dst_ip: pkt.dst_ip,
      src_port: pkt.src_port,
      dst_port: pkt.dst_port,
      protocol: pkt.protocol,
      length: pkt.length,
      flags: pkt.flags || null,
      app_type: flow.app_type,
      sni: sniOrHost,
      blocked,
      block_reason: blocked ? (flow.block_reason || 'Flow blocked') : null,
      ttl: randInt(40, 128),
    };

    this._addPacket(record);
    this.io.emit('packet', record);
    this.io.emit('flow_update', flow.toJSON());
  }

  _buildDemoPackets() {
    const sites = [
      { sni: 'www.youtube.com', app_type: 'YouTube', dst_ip: '142.250.185.206', dst_port: 443 },
      { sni: 'www.facebook.com', app_type: 'Facebook', dst_ip: '157.240.214.35', dst_port: 443 },
      { sni: 'www.google.com', app_type: 'Google', dst_ip: '142.250.80.46', dst_port: 443 },
      { sni: 'www.netflix.com', app_type: 'Netflix', dst_ip: '54.74.217.81', dst_port: 443 },
      { sni: 'www.twitter.com', app_type: 'Twitter', dst_ip: '104.244.42.65', dst_port: 443 },
      { sni: 'www.instagram.com', app_type: 'Instagram', dst_ip: '157.240.241.174', dst_port: 443 },
      { sni: 'www.tiktok.com', app_type: 'TikTok', dst_ip: '23.160.0.196', dst_port: 443 },
      { sni: 'github.com', app_type: 'GitHub', dst_ip: '140.82.121.4', dst_port: 443 },
      { sni: 'discord.com', app_type: 'Discord', dst_ip: '162.159.136.232', dst_port: 443 },
      { sni: 'www.twitch.tv', app_type: 'Twitch', dst_ip: '151.101.2.167', dst_port: 443 },
      { sni: 'www.reddit.com', app_type: 'Reddit', dst_ip: '151.101.193.140', dst_port: 443 },
      { sni: 'open.spotify.com', app_type: 'Spotify', dst_ip: '35.186.224.25', dst_port: 443 },
      { sni: 'www.linkedin.com', app_type: 'LinkedIn', dst_ip: '108.174.10.10', dst_port: 443 },
      { sni: null, app_type: 'DNS', dst_ip: '8.8.8.8', dst_port: 53 },
      { sni: null, app_type: 'DNS', dst_ip: '1.1.1.1', dst_port: 53 },
      { sni: null, app_type: 'HTTP', dst_ip: '93.184.216.34', dst_port: 80 },
      { sni: 'zoom.us', app_type: 'Zoom', dst_ip: '170.114.0.4', dst_port: 443 },
      { sni: 'web.telegram.org', app_type: 'Telegram', dst_ip: '149.154.167.51', dst_port: 443 },
    ];

    const clientIPs = [
      '192.168.1.100', '192.168.1.101', '192.168.1.102', '192.168.1.103',
      '192.168.1.50', '192.168.2.100', '10.0.0.25', '10.0.0.50',
    ];

    const flagSequences = [
      ['SYN', 'SYN|ACK', 'ACK', 'PSH|ACK', 'PSH|ACK', 'ACK', 'FIN|ACK'],
    ];

    const all = [];

    for (let i = 0; i < 150; i++) {
      const site = sites[Math.floor(Math.random() * sites.length)];
      const clientIP = clientIPs[Math.floor(Math.random() * clientIPs.length)];
      const srcPort = randInt(49152, 65535);
      const numPkts = randInt(3, 20);
      const flags = flagSequences[0];

      for (let j = 0; j < numPkts; j++) {
        all.push({
          src_ip: clientIP,
          dst_ip: site.dst_ip,
          src_port: srcPort,
          dst_port: site.dst_port,
          protocol: site.dst_port === 53 ? 'UDP' : 'TCP',
          length: randInt(64, 1500),
          flags: flags[Math.min(j, flags.length - 1)],
          sni: j === 2 ? site.sni : null,
          app_type: site.app_type,
        });
      }
    }

    // Shuffle
    for (let i = all.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [all[i], all[j]] = [all[j], all[i]];
    }

    return all;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _addPacket(record) {
    this.packets.unshift(record);
    if (this.packets.length > MAX_DISPLAY_PACKETS) {
      this.packets.length = MAX_DISPLAY_PACKETS;
    }
  }

  _emitLiveData() {
    this.io.emit('stats', this.getStats());
    this.io.emit('app_stats', this.getAppStats());
    this.io.emit('sni_list', this.getSNIList());
    this.io.emit('thread_stats', this.getThreadStats());
  }

  getThreadStats() {
    return {
      config: { ...this.threadConfig },
      lbs: this.lbStats.map(lb => ({ ...lb })),
      fps: this.fpStats.map(fp => ({ ...fp })),
    };
  }

  getStats() {
    return {
      ...this.stats,
      active_flows: this.flowTracker.size(),
      duration: this.stats.startTime
        ? (this.stats.endTime || Date.now()) - this.stats.startTime
        : 0,
    };
  }

  getAppStats() {
    const total = this.stats.total || 1;
    return Array.from(this.appCountMap.entries())
      .map(([app, count]) => ({
        app,
        count,
        percentage: parseFloat(((count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);
  }

  getSNIList() {
    return Array.from(this.sniMap.entries())
      .map(([sni, app]) => ({ sni, app }))
      .sort((a, b) => a.sni.localeCompare(b.sni));
  }

  getFlows() {
    return this.flowTracker.getAllJSON()
      .sort((a, b) => b.packet_count - a.packet_count);
  }

  getReport() {
    return {
      stats: this.getStats(),
      app_stats: this.getAppStats(),
      sni_list: this.getSNIList(),
      flows: this.getFlows(),
      recent_packets: this.packets.slice(0, 100),
    };
  }
}

module.exports = DPIEngine;
