import React, { useRef, useEffect, useState } from 'react';
import { Terminal, Pause, Play, Search, ChevronDown } from 'lucide-react';
import { useDPI } from '../context/DPIContext';

const APP_COLORS = {
  YouTube: '#FF0000', Facebook: '#1877F2', Google: '#4285F4', Netflix: '#E50914',
  Twitter: '#1DA1F2', Instagram: '#E1306C', TikTok: '#69C9D0', Amazon: '#FF9900',
  Microsoft: '#00A1F1', GitHub: '#238636', Discord: '#5865F2', WhatsApp: '#25D366',
  Telegram: '#2CA5E0', Zoom: '#2D8CFF', Twitch: '#9146FF', Reddit: '#FF4500',
  LinkedIn: '#0077B5', Spotify: '#1DB954', HTTPS: '#10b981', HTTP: '#f59e0b',
  DNS: '#8b5cf6', Unknown: '#6b7280', Apple: '#888',
};

function getAppColor(app) { return APP_COLORS[app] || '#6b7280'; }

function formatTime(iso) {
  if (!iso) return '--';
  try {
    const d = new Date(iso);
    return d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  } catch { return '--'; }
}

function SkeletonRows() {
  return Array.from({ length: 8 }).map((_, i) => (
    <tr key={i}>
      {[30, 70, 80, 80, 45, 55, 80, 50, 35, 55].map((w, j) => (
        <td key={j} style={{ padding: '8px 12px' }}>
          <div className="skeleton" style={{ height: 9, width: w }} />
        </td>
      ))}
    </tr>
  ));
}

export default function PacketFeed() {
  const { state } = useDPI();
  const { packets } = state;
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const [displayPackets, setDisplayPackets] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const tableRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!paused) {
      const filtered = filter
        ? packets.filter(p =>
            (p.src_ip || '').includes(filter) ||
            (p.dst_ip || '').includes(filter) ||
            (p.app_type || '').toLowerCase().includes(filter.toLowerCase()) ||
            (p.sni || '').toLowerCase().includes(filter.toLowerCase()) ||
            (p.protocol || '').toLowerCase().includes(filter.toLowerCase())
          )
        : packets;
      setDisplayPackets(filtered.slice(0, 300));
    }
  }, [packets, paused, filter]);

  useEffect(() => {
    if (autoScroll && !paused && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [displayPackets, autoScroll, paused]);

  const handleScroll = (e) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAutoScroll(nearBottom);
  };

  const isEmpty = packets.length === 0;

  return (
    <div className="card card-glow flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid #e2e8f0' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: 'rgba(8,145,178,0.1)', border: '1px solid rgba(8,145,178,0.25)' }}>
            <Terminal size={12} style={{ color: '#0891b2' }} />
          </div>
          <span className="section-title">Live Packet Feed</span>
          {!isEmpty && (
            <span className="badge font-mono"
              style={{ background: 'rgba(8,145,178,0.08)', color: '#0891b2', border: '1px solid rgba(8,145,178,0.2)' }}>
              {displayPackets.length} / {packets.length}
            </span>
          )}
          {paused && (
            <span className="badge"
              style={{ background: 'rgba(217,119,6,0.1)', color: '#d97706', border: '1px solid rgba(217,119,6,0.2)' }}>
              PAUSED
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
            <input
              type="text"
              placeholder="Filter packets…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="input text-[11px]"
              style={{ paddingLeft: 26, width: 160, height: 30 }}
            />
          </div>
          <button
            onClick={() => setPaused(p => !p)}
            className="btn flex items-center gap-1.5"
            style={{ padding: '5px 10px', fontSize: 11 }}>
            {paused ? <Play size={11} /> : <Pause size={11} />}
            {paused ? 'Resume' : 'Pause'}
          </button>
          {!autoScroll && (
            <button
              onClick={() => { setAutoScroll(true); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
              className="btn btn-primary"
              style={{ padding: '5px 10px', fontSize: 11 }}>
              <ChevronDown size={11} /> Latest
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div ref={tableRef} className="flex-1 overflow-auto" style={{ minHeight: 0 }} onScroll={handleScroll}>
        <table className="dpi-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Time</th>
              <th>Source</th>
              <th>Destination</th>
              <th>Proto</th>
              <th>Flags</th>
              <th>App</th>
              <th>SNI / Host</th>
              <th>Len</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <SkeletonRows />
            ) : displayPackets.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-10 text-xs" style={{ color: '#374151' }}>
                  No packets match the current filter
                </td>
              </tr>
            ) : (
              displayPackets.map((pkt, i) => {
                const appColor = getAppColor(pkt.app_type);
                const protoColor = pkt.protocol === 'TCP' ? '#60a5fa' : pkt.protocol === 'UDP' ? '#a78bfa' : '#94a3b8';
                const flagColors = { SYN: '#f59e0b', ACK: '#60a5fa', FIN: '#f87171', RST: '#ef4444', PSH: '#34d399', URG: '#c084fc' };
                const flags = pkt.flags && pkt.flags !== 'NONE' ? pkt.flags.split('|') : [];
                return (
                  <tr key={pkt.id || i} className={`${pkt.blocked ? 'row-blocked' : ''}`}>
                    <td className="font-mono text-[10px]" style={{ color: '#334155' }}>{pkt.index}</td>
                    <td className="font-mono text-[10px]" style={{ color: '#374151' }}>{formatTime(pkt.timestamp)}</td>
                    <td className="font-mono text-[11px]" style={{ color: '#94a3b8' }}>
                      {pkt.src_ip}{pkt.src_port ? <span style={{ color: '#334155' }}>:{pkt.src_port}</span> : ''}
                    </td>
                    <td className="font-mono text-[11px]" style={{ color: '#94a3b8' }}>
                      {pkt.dst_ip}{pkt.dst_port ? <span style={{ color: '#334155' }}>:{pkt.dst_port}</span> : ''}
                    </td>
                    <td>
                      <span className="badge font-mono"
                        style={{ background: `${protoColor}12`, color: protoColor, border: `1px solid ${protoColor}25` }}>
                        {pkt.protocol}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-0.5">
                        {flags.map(f => (
                          <span key={f} className="font-mono"
                            style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3,
                              background: `${flagColors[f] || '#6b7280'}15`,
                              color: flagColors[f] || '#9ca3af' }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {pkt.app_type && (
                        <span className="badge font-mono"
                          style={{ background: `${appColor}15`, color: appColor, border: `1px solid ${appColor}28` }}>
                          {pkt.app_type}
                        </span>
                      )}
                    </td>
                      <td className="font-mono text-[10px] max-w-[120px] truncate" style={{ color: '#0891b2' }}
                      title={pkt.sni || pkt.host}>
                      {pkt.sni || pkt.host || <span style={{ color: '#1e293b' }}>—</span>}
                    </td>
                    <td className="font-mono text-[11px]" style={{ color: '#475569' }}>{pkt.length}</td>
                    <td>
                      {pkt.blocked ? (
                        <span className="badge"
                          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.25)' }}>
                          BLOCK
                        </span>
                      ) : (
                        <span className="badge"
                          style={{ background: 'rgba(5,150,105,0.08)', color: '#059669', border: '1px solid rgba(5,150,105,0.18)' }}>
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      {!isEmpty && (
        <div className="flex items-center gap-3 px-4 py-1.5 flex-shrink-0"
          style={{ borderTop: '1px solid #e2e8f0' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full"
              style={{ background: paused ? '#d97706' : '#059669' }} />
            <span className="text-[10px] font-mono" style={{ color: '#374151' }}>
              {paused ? 'feed paused' : 'live feed'}
            </span>
          </div>
          <span className="text-[10px] font-mono ml-auto" style={{ color: '#1e293b' }}>
            {packets.length.toLocaleString()} total · showing {displayPackets.length} · ↕ scroll
          </span>
        </div>
      )}
    </div>
  );
}
