function makeFlowKey(src_ip, src_port, dst_ip, dst_port, protocol) {
  // Bidirectional key: always put the lower endpoint first
  const a = `${src_ip}:${src_port}`;
  const b = `${dst_ip}:${dst_port}`;
  if (a <= b) return `${a}|${b}|${protocol}`;
  return `${b}|${a}|${protocol}`;
}

class Flow {
  constructor(tuple) {
    this.key = makeFlowKey(tuple.src_ip, tuple.src_port, tuple.dst_ip, tuple.dst_port, tuple.protocol);
    this.src_ip = tuple.src_ip;
    this.dst_ip = tuple.dst_ip;
    this.src_port = tuple.src_port;
    this.dst_port = tuple.dst_port;
    this.protocol = tuple.protocol;
    this.sni = null;
    this.http_host = null;
    this.dns_query = null;
    this.app_type = 'Unknown';
    this.blocked = false;
    this.block_reason = null;
    this.packet_count = 0;
    this.byte_count = 0;
    this.start_time = Date.now();
    this.last_seen = Date.now();
    this.classified = false;
  }

  toJSON() {
    const proto = this.protocol === 6 ? 'TCP' : this.protocol === 17 ? 'UDP' : `${this.protocol}`;
    return {
      key: this.key,
      src_ip: this.src_ip,
      dst_ip: this.dst_ip,
      src_port: this.src_port,
      dst_port: this.dst_port,
      protocol: proto,
      sni: this.sni || this.http_host || this.dns_query || null,
      app_type: this.app_type,
      blocked: this.blocked,
      block_reason: this.block_reason,
      packet_count: this.packet_count,
      byte_count: this.byte_count,
      start_time: this.start_time,
      last_seen: this.last_seen,
    };
  }
}

class FlowTracker {
  constructor() {
    this.flows = new Map();
  }

  getOrCreate(tuple) {
    const key = makeFlowKey(tuple.src_ip, tuple.src_port, tuple.dst_ip, tuple.dst_port, tuple.protocol);
    if (!this.flows.has(key)) {
      this.flows.set(key, new Flow(tuple));
    }
    return this.flows.get(key);
  }

  getAll() {
    return Array.from(this.flows.values());
  }

  getAllJSON() {
    return Array.from(this.flows.values()).map(f => f.toJSON());
  }

  clear() {
    this.flows.clear();
  }

  size() {
    return this.flows.size;
  }
}

module.exports = { FlowTracker, Flow, makeFlowKey };
