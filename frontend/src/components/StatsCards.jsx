import React, { useEffect, useRef } from 'react';
import { Activity, ArrowUpRight, Shield, GitBranch, Database, Clock } from 'lucide-react';
import { useDPI } from '../context/DPIContext';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function formatDuration(ms) {
  if (!ms) return '0s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function StatCard({ icon: Icon, label, value, subValue, color, bgColor, borderColor, percentage }) {
  const prevRef = useRef(value);
  const changed = prevRef.current !== value;
  useEffect(() => { prevRef.current = value; }, [value]);

  return (
    <div className="card card-glow p-4 flex flex-col gap-3 relative overflow-hidden">
      {/* Background gradient accent */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${color}, transparent 70%)` }} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
            <Icon size={14} style={{ color }} />
          </div>
          <span className="section-title">{label}</span>
        </div>
        {percentage !== undefined && (
          <span className="text-xs font-mono" style={{ color }}>
            {percentage}%
          </span>
        )}
      </div>

      <div>
        <div key={value} className={`text-2xl font-bold font-mono ${changed ? 'count-animate' : ''}`}
          style={{ color }}>
          {typeof value === 'string' ? value : value.toLocaleString()}
        </div>
        {subValue && (
          <div className="text-xs text-slate-500 mt-1 font-mono">{subValue}</div>
        )}
      </div>

      {/* Bottom bar */}
      {percentage !== undefined && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${Math.min(percentage, 100)}%`, background: color }} />
        </div>
      )}
    </div>
  );
}

export default function StatsCards() {
  const { state } = useDPI();
  const { stats } = state;

  const fwdPct = stats.total > 0 ? ((stats.forwarded / stats.total) * 100).toFixed(1) : 0;
  const dropPct = stats.total > 0 ? ((stats.dropped / stats.total) * 100).toFixed(1) : 0;

  const cards = [
    {
      icon: Activity,
      label: 'Total Packets',
      value: stats.total,
      subValue: `${formatBytes(stats.bytes)} · TCP: ${stats.tcp} · UDP: ${stats.udp}`,
      color: '#60a5fa',
      bgColor: 'rgba(59,130,246,0.1)',
      borderColor: 'rgba(59,130,246,0.25)',
    },
    {
      icon: ArrowUpRight,
      label: 'Forwarded',
      value: stats.forwarded,
      subValue: `${fwdPct}% of total traffic`,
      color: '#34d399',
      bgColor: 'rgba(16,185,129,0.1)',
      borderColor: 'rgba(16,185,129,0.25)',
      percentage: parseFloat(fwdPct),
    },
    {
      icon: Shield,
      label: 'Blocked',
      value: stats.dropped,
      subValue: `${dropPct}% of total traffic`,
      color: '#f87171',
      bgColor: 'rgba(239,68,68,0.1)',
      borderColor: 'rgba(239,68,68,0.25)',
      percentage: parseFloat(dropPct),
    },
    {
      icon: GitBranch,
      label: 'Active Flows',
      value: stats.active_flows,
      subValue: 'Unique connections tracked',
      color: '#c084fc',
      bgColor: 'rgba(192,132,252,0.1)',
      borderColor: 'rgba(192,132,252,0.25)',
    },
    {
      icon: Database,
      label: 'Data Volume',
      value: formatBytes(stats.bytes),
      subValue: `${stats.tcp.toLocaleString()} TCP / ${stats.udp.toLocaleString()} UDP`,
      color: '#fb923c',
      bgColor: 'rgba(251,146,60,0.1)',
      borderColor: 'rgba(251,146,60,0.25)',
    },
    {
      icon: Clock,
      label: 'Duration',
      value: formatDuration(stats.duration),
      subValue: stats.total > 0
        ? `~${stats.duration > 0 ? Math.round((stats.total / (stats.duration / 1000))).toLocaleString() : 0} pkt/s`
        : 'No processing yet',
      color: '#38bdf8',
      bgColor: 'rgba(56,189,248,0.1)',
      borderColor: 'rgba(56,189,248,0.25)',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 px-4 py-3">
      {cards.map(card => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
