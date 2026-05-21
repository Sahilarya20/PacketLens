const { ipToString } = require('./types');

const ETHERTYPE_IPV4 = 0x0800;
const ETHERTYPE_IPV6 = 0x86dd;
const ETHERTYPE_VLAN = 0x8100;
const PROTO_ICMP = 1;
const PROTO_TCP = 6;
const PROTO_UDP = 17;

const TCP_FLAGS = ['FIN', 'SYN', 'RST', 'PSH', 'ACK', 'URG', 'ECE', 'CWR'];

function macToString(buf, offset) {
  const parts = [];
  for (let i = 0; i < 6; i++) {
    parts.push(buf[offset + i].toString(16).padStart(2, '0'));
  }
  return parts.join(':');
}

function tcpFlagsToString(flags) {
  if (!flags && flags !== 0) return '';
  return TCP_FLAGS.filter((_, i) => flags & (1 << i)).join('|') || 'NONE';
}

function parsePacket(rawData) {
  const result = {
    valid: false,
    src_mac: null,
    dst_mac: null,
    ethertype: null,
    src_ip: null,
    dst_ip: null,
    src_ip_raw: 0,
    dst_ip_raw: 0,
    protocol: null,
    ttl: null,
    src_port: null,
    dst_port: null,
    tcp_flags: null,
    tcp_flags_str: null,
    seq_num: null,
    ack_num: null,
    has_tcp: false,
    has_udp: false,
    payload: null,
    total_length: rawData.length,
  };

  if (rawData.length < 14) return result;

  result.dst_mac = macToString(rawData, 0);
  result.src_mac = macToString(rawData, 6);
  result.ethertype = rawData.readUInt16BE(12);

  let offset = 14;

  // Handle VLAN tagging (802.1Q)
  if (result.ethertype === ETHERTYPE_VLAN) {
    if (rawData.length < offset + 4) return result;
    offset += 2; // skip TCI
    result.ethertype = rawData.readUInt16BE(offset);
    offset += 2;
  }

  if (result.ethertype === ETHERTYPE_IPV4) {
    if (rawData.length < offset + 20) return result;

    const versionIHL = rawData[offset];
    const ihl = (versionIHL & 0x0f) * 4;
    if (ihl < 20) return result;

    result.ttl = rawData[offset + 8];
    result.protocol = rawData[offset + 9];
    result.src_ip_raw = rawData.readUInt32BE(offset + 12);
    result.dst_ip_raw = rawData.readUInt32BE(offset + 16);
    result.src_ip = ipToString(result.src_ip_raw);
    result.dst_ip = ipToString(result.dst_ip_raw);

    offset += ihl;

    if (result.protocol === PROTO_TCP) {
      if (rawData.length < offset + 20) return result;
      result.has_tcp = true;
      result.src_port = rawData.readUInt16BE(offset);
      result.dst_port = rawData.readUInt16BE(offset + 2);
      result.seq_num = rawData.readUInt32BE(offset + 4);
      result.ack_num = rawData.readUInt32BE(offset + 8);
      const dataOffset = ((rawData[offset + 12] >> 4) & 0x0f) * 4;
      if (dataOffset < 20) return result;
      result.tcp_flags = rawData[offset + 13];
      result.tcp_flags_str = tcpFlagsToString(result.tcp_flags);
      offset += dataOffset;
    } else if (result.protocol === PROTO_UDP) {
      if (rawData.length < offset + 8) return result;
      result.has_udp = true;
      result.src_port = rawData.readUInt16BE(offset);
      result.dst_port = rawData.readUInt16BE(offset + 2);
      offset += 8;
    } else if (result.protocol === PROTO_ICMP) {
      result.src_port = 0;
      result.dst_port = 0;
    }

    result.payload = offset < rawData.length ? rawData.slice(offset) : Buffer.alloc(0);
    result.valid = true;

  } else if (result.ethertype === ETHERTYPE_IPV6) {
    if (rawData.length < offset + 40) return result;
    result.protocol = rawData[offset + 6];
    result.ttl = rawData[offset + 7]; // hop limit
    // Simplified IPv6 address display
    result.src_ip = 'IPv6:' + rawData.slice(offset + 8, offset + 24).toString('hex').match(/.{4}/g).join(':');
    result.dst_ip = 'IPv6:' + rawData.slice(offset + 24, offset + 40).toString('hex').match(/.{4}/g).join(':');
    result.src_ip = result.src_ip.substring(0, 20) + '...';
    result.dst_ip = result.dst_ip.substring(0, 20) + '...';
    offset += 40;
    result.payload = rawData.slice(offset);
    result.valid = true;
  }

  return result;
}

module.exports = { parsePacket, tcpFlagsToString };
