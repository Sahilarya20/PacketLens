import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { BarChart2, TrendingUp } from 'lucide-react';
import { useDPI } from '../context/DPIContext';

const APP_COLORS = {
  YouTube: '#FF0000', Facebook: '#1877F2', Google: '#4285F4', Netflix: '#E50914',
  Twitter: '#1DA1F2', Instagram: '#E1306C', TikTok: '#69C9D0', Amazon: '#FF9900',
  Microsoft: '#00A1F1', Apple: '#888888', GitHub: '#238636', Discord: '#5865F2',
  WhatsApp: '#25D366', Telegram: '#2CA5E0', Zoom: '#2D8CFF', Cloudflare: '#F48120',
  Twitch: '#9146FF', Reddit: '#FF4500', LinkedIn: '#0077B5', Spotify: '#1DB954',
  HTTPS: '#10b981', HTTP: '#f59e0b', DNS: '#8b5cf6', Unknown: '#6b7280',
};

function getColor(app) { return APP_COLORS[app] || '#6b7280'; }

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="dpi-tooltip" style={{ fontSize: 11 }}>
      <div className="font-bold mb-1" style={{ color: getColor(d.app) }}>{d.app}</div>
      <div style={{ color: '#94a3b8' }}>{d.count.toLocaleString()} packets</div>
      <div style={{ color: '#475569' }}>{d.percentage}% of total</div>
    </div>
  );
};

function SkeletonBars() {
  const widths = [90, 70, 85, 55, 65, 45];
  return (
    <div className="flex flex-col gap-2 p-3 pt-4">
      {widths.map((w, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="skeleton" style={{ width: 60, height: 9 }} />
          <div className="skeleton flex-1" style={{ height: 14, maxWidth: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}

export default function AppBreakdown() {
  const { state } = useDPI();
  const data = useMemo(() => (state.appStats || []).slice(0, 12), [state.appStats]);
  const hasData = data.length > 0;

  return (
    <div className="card card-glow flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid #e2e8f0' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)' }}>
            <BarChart2 size={12} style={{ color: '#2563eb' }} />
          </div>
          <span className="section-title">App Breakdown</span>
        </div>
        {hasData && (
          <span className="badge font-mono"
            style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.2)' }}>
            {data.length} apps
          </span>
        )}
      </div>

      {!hasData ? (
        <SkeletonBars />
      ) : (
        <div className="flex-1 overflow-auto p-3 min-h-0">
          <ResponsiveContainer width="100%" height={Math.max(data.length * 30, 120)}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
              <XAxis
                type="number"
                tick={{ fill: '#374151', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="app"
                width={76}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {data.map(entry => (
                  <Cell key={entry.app} fill={getColor(entry.app)} fillOpacity={0.8} />
                ))}
                <LabelList
                  dataKey="percentage"
                  position="right"
                  formatter={v => `${v}%`}
                  style={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* App legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 pt-2"
            style={{ borderTop: '1px solid #e2e8f0' }}>
            {data.map(d => (
              <div key={d.app} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: getColor(d.app) }} />
                <span className="text-[10px]" style={{ color: '#475569' }}>{d.app}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
