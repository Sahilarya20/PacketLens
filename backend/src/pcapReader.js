const fs = require('fs');

const PCAP_GLOBAL_HEADER_SIZE = 24;
const PCAP_PACKET_HEADER_SIZE = 16;
const PCAP_MAGIC_NATIVE = 0xa1b2c3d4;
const PCAP_MAGIC_NANO = 0xa1b23c4d;
const PCAP_MAGIC_SWAPPED = 0xd4c3b2a1;
const PCAP_MAGIC_NANO_SWAPPED = 0x4d3cb2a1;

class PcapReader {
  constructor() {
    this.buffer = null;
    this.offset = 0;
    this.swapped = false;
    this.nano = false;
  }

  open(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    this.buffer = fs.readFileSync(filePath);
    this.offset = 0;

    const magic = this.buffer.readUInt32LE(0);
    if (magic === PCAP_MAGIC_NATIVE) {
      this.swapped = false; this.nano = false;
    } else if (magic === PCAP_MAGIC_NANO) {
      this.swapped = false; this.nano = true;
    } else if (magic === PCAP_MAGIC_SWAPPED) {
      this.swapped = true; this.nano = false;
    } else if (magic === PCAP_MAGIC_NANO_SWAPPED) {
      this.swapped = true; this.nano = true;
    } else {
      throw new Error(`Unsupported PCAP magic: 0x${magic.toString(16)}`);
    }

    const versionMajor = this.readUint16(4);
    const versionMinor = this.readUint16(6);
    const snaplen = this.readUint32(16);
    const network = this.readUint32(20);

    this.offset = PCAP_GLOBAL_HEADER_SIZE;

    return { versionMajor, versionMinor, snaplen, network };
  }

  readUint16(off) {
    return this.swapped ? this.buffer.readUInt16BE(off) : this.buffer.readUInt16LE(off);
  }

  readUint32(off) {
    return this.swapped ? this.buffer.readUInt32BE(off) : this.buffer.readUInt32LE(off);
  }

  readNextPacket() {
    if (this.offset + PCAP_PACKET_HEADER_SIZE > this.buffer.length) return null;

    const ts_sec = this.readUint32(this.offset);
    const ts_frac = this.readUint32(this.offset + 4);
    const incl_len = this.readUint32(this.offset + 8);
    const orig_len = this.readUint32(this.offset + 12);

    this.offset += PCAP_PACKET_HEADER_SIZE;

    if (incl_len > 65535 || this.offset + incl_len > this.buffer.length) return null;

    const data = Buffer.allocUnsafe(incl_len);
    this.buffer.copy(data, 0, this.offset, this.offset + incl_len);
    this.offset += incl_len;

    const ts_usec = this.nano ? Math.floor(ts_frac / 1000) : ts_frac;

    return { timestamp: ts_sec + ts_usec / 1e6, ts_sec, ts_usec, incl_len, orig_len, data };
  }

  hasMore() {
    return this.buffer !== null && this.offset < this.buffer.length - PCAP_PACKET_HEADER_SIZE;
  }

  countPackets() {
    let count = 0;
    let pos = PCAP_GLOBAL_HEADER_SIZE;
    while (pos + PCAP_PACKET_HEADER_SIZE <= this.buffer.length) {
      const incl_len = this.swapped
        ? this.buffer.readUInt32BE(pos + 8)
        : this.buffer.readUInt32LE(pos + 8);
      if (incl_len > 65535) break;
      pos += PCAP_PACKET_HEADER_SIZE + incl_len;
      count++;
    }
    return count;
  }
}

module.exports = PcapReader;
