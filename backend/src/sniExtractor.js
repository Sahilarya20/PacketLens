/**
 * SNI Extractor - Extracts Server Name Indication from TLS Client Hello packets
 * Also extracts HTTP Host header from plaintext HTTP requests
 */

const TLS_HANDSHAKE_TYPE = 0x16;
const TLS_CLIENT_HELLO = 0x01;
const SNI_EXT_TYPE = 0x0000;
const SNI_HOST_NAME = 0x00;

function extractSNI(payload) {
  if (!payload || payload.length < 43) return null;

  // TLS Record: Content Type must be 0x16 (Handshake)
  if (payload[0] !== TLS_HANDSHAKE_TYPE) return null;

  // TLS version: must be 3.x
  if (payload[1] < 0x03 || payload[1] > 0x04) return null;

  // Record length
  if (payload.length < 5) return null;
  const recordLen = payload.readUInt16BE(3);
  if (payload.length < 5 + recordLen) return null;

  // Handshake type must be 0x01 (ClientHello)
  if (payload[5] !== TLS_CLIENT_HELLO) return null;

  // Handshake length (3 bytes)
  if (payload.length < 9) return null;
  const handshakeLen = (payload[6] << 16) | (payload[7] << 8) | payload[8];

  // Client Hello version (2 bytes) + Random (32 bytes) = 34 bytes after offset 9
  let offset = 9 + 2 + 32; // = 43

  if (offset >= payload.length) return null;

  // Session ID Length
  const sessionIdLen = payload[offset];
  offset += 1 + sessionIdLen;
  if (offset + 2 > payload.length) return null;

  // Cipher Suites Length
  const cipherLen = payload.readUInt16BE(offset);
  offset += 2 + cipherLen;
  if (offset + 1 > payload.length) return null;

  // Compression Methods Length
  const compLen = payload[offset];
  offset += 1 + compLen;
  if (offset + 2 > payload.length) return null;

  // Extensions Length
  const extLen = payload.readUInt16BE(offset);
  offset += 2;
  const extEnd = Math.min(offset + extLen, payload.length);

  // Iterate through extensions
  while (offset + 4 <= extEnd) {
    const extType = payload.readUInt16BE(offset);
    const extDataLen = payload.readUInt16BE(offset + 2);
    offset += 4;

    if (extType === SNI_EXT_TYPE) {
      // SNI extension found
      if (offset + 2 > extEnd) break;
      const sniListLen = payload.readUInt16BE(offset);
      offset += 2;

      if (offset + 1 > extEnd) break;
      const nameType = payload[offset];
      offset += 1;

      if (nameType !== SNI_HOST_NAME) break;

      if (offset + 2 > extEnd) break;
      const nameLen = payload.readUInt16BE(offset);
      offset += 2;

      if (offset + nameLen > extEnd) break;

      return payload.slice(offset, offset + nameLen).toString('utf8');
    }

    offset += extDataLen;
  }

  return null;
}

function extractHTTPHost(payload) {
  if (!payload || payload.length < 8) return null;

  const text = payload.toString('ascii', 0, Math.min(payload.length, 4096));
  const firstLine = text.split('\r\n')[0];

  // Must start with HTTP method
  const HTTP_METHODS = ['GET ', 'POST ', 'PUT ', 'DELETE ', 'HEAD ', 'OPTIONS ', 'PATCH ', 'CONNECT '];
  if (!HTTP_METHODS.some(m => firstLine.startsWith(m))) return null;

  const hostMatch = text.match(/\r\nHost:\s*([^\r\n]+)/i);
  if (hostMatch) {
    return hostMatch[1].trim().split(':')[0].toLowerCase();
  }

  return null;
}

function extractDNSQuery(payload) {
  if (!payload || payload.length < 12) return null;

  try {
    // DNS header: 12 bytes
    const flags = payload.readUInt16BE(2);
    const isQuery = (flags & 0x8000) === 0;
    if (!isQuery) return null;

    const questionCount = payload.readUInt16BE(4);
    if (questionCount === 0) return null;

    // Parse first question
    let offset = 12;
    const labels = [];

    while (offset < payload.length) {
      const len = payload[offset];
      if (len === 0) break;
      if (len > 63) break; // pointer, stop
      offset++;
      if (offset + len > payload.length) break;
      labels.push(payload.slice(offset, offset + len).toString('ascii'));
      offset += len;
    }

    return labels.length > 0 ? labels.join('.') : null;
  } catch {
    return null;
  }
}

module.exports = { extractSNI, extractHTTPHost, extractDNSQuery };
