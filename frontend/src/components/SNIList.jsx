import React, { useMemo, useState } from 'react';
import { Globe, Search, ShieldOff, Shield } from 'lucide-react';
import { useDPI } from '../context/DPIContext';

const APP_COLORS = {
  YouTube: '#FF0000', Facebook: '#1877F2', Google: '#4285F4', Netflix: '#E50914',
  Twitter: '#1DA1F2', Instagram: '#E1306C', TikTok: '#69C9D0', Amazon: '#FF9900',
  Microsoft: '#00A1F1', GitHub: '#238636', Discord: '#5865F2', WhatsApp: '#25D366',
  Telegram: '#2CA5E0', Zoom: '#2D8CFF', Twitch: '#9146FF', Reddit: '#FF4500',
  LinkedIn: '#0077B5', Spotify: '#1DB954', HTTPS: '#10b981', HTTP: '#f59e0b',
  DNS: '#8b5cf6', Unknown: '#6b7280', Apple: '#888',
};

export default function SNIList() {
  const { state } = useDPI();
  const { sniList, rules } = state;
  const [filter, setFilter] = useState('');

  const enriched = useMemo(() => {
    let list = sniList.map(item => ({
      ...item,
      isBlocked: rules.domains.some(d => item.sni.toLowerCase().includes(d)) ||
                 rules.apps.includes(item.app.toLowerCase()),
    }));
    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter(i => i.sni.toLowerCase().includes(q) || i.app.toLowerCase().includes(q));
    }
    return list;
  }, [sniList, rules, filter]);

  const blockedCount = enriched.filter(e => e.isBlocked).length;

  return (
    <div className="card card-glow flex flex-col h-full" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)' }}>
            <Globe size={12} style={{ color: '#22d3ee' }} />
          </div>
          <span className="section-title">SNI / Domains</span>
          {enriched.length > 0 && (
            <span className="badge font-mono"
              style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.2)' }}>
              {enriched.length}
            </span>
          )}
          {blockedCount > 0 && (
            <span className="badge"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              {blockedCount} blocked
            </span>
          )}
        </div>
        {sniList.length > 5 && (
          <div className="relative">
            <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
            <input
              type="text"
              placeholder="Search…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="input text-[11px]"
              style={{ paddingLeft: 22, width: 110, height: 26 }}
            />
          </div>
        )}
      </div>

      {enriched.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Globe size={24} style={{ color: '#1e293b' }} />
          <span className="text-xs" style={{ color: '#334155' }}>No domains detected yet</span>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-2" style={{ minHeight: 0 }}>
          <div className="flex flex-col gap-1">
            {enriched.map(item => {
              const color = APP_COLORS[item.app] || '#6b7280';
              return (
                <div key={item.sni}
                  className="flex items-center justify-between px-3 py-2 rounded-lg transition-all"
                  style={{
                    background: item.isBlocked ? 'rgba(220,38,38,0.06)' : '#f8fafc',
                    border: item.isBlocked ? '1px solid rgba(220,38,38,0.2)' : '1px solid #e2e8f0',
                  }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="font-mono text-[11px] truncate" style={{ color: '#475569' }} title={item.sni}>
                      {item.sni}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <span className="badge text-[10px]"
                      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                      {item.app}
                    </span>
                    {item.isBlocked && (
                      <ShieldOff size={11} style={{ color: '#f87171' }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
