import React, { useState, useMemo } from 'react';
import { GitBranch, ArrowUpDown } from 'lucide-react';
import { useDPI } from '../context/DPIContext';

const APP_COLORS = {
  YouTube: '#FF0000', Facebook: '#1877F2', Google: '#4285F4', Netflix: '#E50914',
  Twitter: '#1DA1F2', Instagram: '#E1306C', TikTok: '#69C9D0', Amazon: '#FF9900',
  Microsoft: '#00A1F1', GitHub: '#238636', Discord: '#5865F2', WhatsApp: '#25D366',
  Telegram: '#2CA5E0', Zoom: '#2D8CFF', Twitch: '#9146FF', Reddit: '#FF4500',
  LinkedIn: '#0077B5', Spotify: '#1DB954', HTTPS: '#10b981', HTTP: '#f59e0b',
  DNS: '#8b5cf6', Unknown: '#6b7280', Apple: '#888',
};

function formatBytes(b) {
  if (!b) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function getColor(app) { return APP_COLORS[app] || '#6b7280'; }

export default function FlowTable() {
  const { flows } = useDPI();
  const [sortKey, setSortKey] = useState('packet_count');
  const [sortDir, setSortDir] = useState('desc');
  const [filter, setFilter] = useState('');

  const sorted = useMemo(() => {
    let arr = flows;
    if (filter) {
      arr = arr.filter(f =>
        (f.src_ip || '').includes(filter) ||
        (f.dst_ip || '').includes(filter) ||
        (f.app_type || '').toLowerCase().includes(filter.toLowerCase()) ||
        (f.sni || '').toLowerCase().includes(filter.toLowerCase())
      );
    }
    return [...arr].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === 'number' && typeof bv === 'number')
        return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [flows, sortKey, sortDir, filter]);

  const handleSort = (key) => {
    if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortTh = ({ col, label }) => (
    <th onClick={() => handleSort(col)} className="cursor-pointer select-none transition-colors" style={{ color: sortKey === col ? '#2563eb' : undefined }}>
      <div className="flex items-center gap-1">
        {label}
        {sortKey === col && <ArrowUpDown size={9} style={{ color: '#2563eb' }} />}
      </div>
    </th>
  );

  return (
    <div className="card card-glow flex flex-col" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid #e2e8f0' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
            <GitBranch size={12} style={{ color: '#7c3aed' }} />
          </div>
          <span className="section-title">Active Flows</span>
          <span className="badge font-mono"
            style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)' }}>
            {sorted.length}
          </span>
        </div>
        <input
          type="text"
          placeholder="Filter flows…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg font-mono outline-none w-40"
          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155' }}
        />
      </div>

      <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
        <table className="dpi-table">
          <thead>
            <tr>
              <SortTh col="src_ip" label="Source" />
              <SortTh col="dst_ip" label="Destination" />
              <th>Proto</th>
              <th>App</th>
              <th>SNI</th>
              <SortTh col="packet_count" label="Pkts" />
              <SortTh col="byte_count" label="Bytes" />
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-xs" style={{ color: '#94a3b8' }}>
                  No flows tracked yet — run Demo Mode or upload a PCAP file
                </td>
              </tr>
            ) : (
              sorted.map(flow => {
                const color = getColor(flow.app_type);
                const proto = flow.protocol === 6 ? 'TCP' : flow.protocol === 17 ? 'UDP' : flow.protocol ?? '?';
                const protoColor = proto === 'TCP' ? '#2563eb' : proto === 'UDP' ? '#7c3aed' : '#94a3b8';
                return (
                  <tr key={flow.key} className={flow.blocked ? 'row-blocked' : ''}>
                    <td className="font-mono text-[11px]" style={{ color: '#475569' }}>
                      {flow.src_ip}
                      {flow.src_port ? <span style={{ color: '#94a3b8' }}>:{flow.src_port}</span> : ''}
                    </td>
                    <td className="font-mono text-[11px]" style={{ color: '#475569' }}>
                      {flow.dst_ip}
                      {flow.dst_port ? <span style={{ color: '#94a3b8' }}>:{flow.dst_port}</span> : ''}
                    </td>
                    <td>
                      <span className="badge font-mono"
                        style={{ background: `${protoColor}12`, color: protoColor, border: `1px solid ${protoColor}25` }}>
                        {proto}
                      </span>
                    </td>
                    <td>
                      {flow.app_type && (
                        <span className="badge font-mono"
                          style={{ background: `${color}14`, color, border: `1px solid ${color}30` }}>
                          {flow.app_type}
                        </span>
                      )}
                    </td>
                    <td className="font-mono text-[10px] max-w-[120px] truncate"
                      style={{ color: '#0891b2' }}
                      title={flow.sni || flow.http_host || ''}>
                      {flow.sni || flow.http_host || <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td className="font-mono text-[11px] text-right" style={{ color: '#334155' }}>
                      {(flow.packet_count || 0).toLocaleString()}
                    </td>
                    <td className="font-mono text-[11px]" style={{ color: '#64748b' }}>
                      {formatBytes(flow.byte_count)}
                    </td>
                    <td>
                      {flow.blocked ? (
                        <span className="badge"
                          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.25)' }}>
                          BLOCKED
                        </span>
                      ) : (
                        <span className="badge"
                          style={{ background: 'rgba(5,150,105,0.08)', color: '#059669', border: '1px solid rgba(5,150,105,0.2)' }}>
                          ACTIVE
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
