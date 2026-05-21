import React, { useState } from 'react';
import { Cpu, Server, Layers, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useDPI } from '../context/DPIContext';

function ThreadBar({ label, value, maxValue, color }) {
  const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] w-10 flex-shrink-0" style={{ color: '#64748b' }}>{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="font-mono text-[10px] w-12 text-right flex-shrink-0" style={{ color }}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function ConfigSlider({ label, value, min, max, onChange, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] w-24 flex-shrink-0" style={{ color: '#64748b' }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="flex-1 accent-blue-600"
        style={{ accentColor: color }}
      />
      <span
        className="font-mono text-xs font-bold w-6 text-center flex-shrink-0 px-1.5 py-0.5 rounded"
        style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
        {value}
      </span>
    </div>
  );
}

export default function ThreadStats() {
  const { state, api } = useDPI();
  const { threadStats } = state;
  const [configOpen, setConfigOpen] = useState(false);
  const [localLBs, setLocalLBs] = useState(threadStats?.config?.numLBs ?? 2);
  const [localFPs, setLocalFPs] = useState(threadStats?.config?.numFPs ?? 2);

  const config = threadStats?.config ?? { numLBs: 2, numFPs: 2 };
  const lbs = threadStats?.lbs ?? [];
  const fps = threadStats?.fps ?? [];

  const maxLBDispatched = Math.max(1, ...lbs.map(lb => lb.dispatched));
  const maxFPProcessed  = Math.max(1, ...fps.map(fp => fp.processed));
  const totalDispatched = lbs.reduce((s, lb) => s + lb.dispatched, 0);
  const totalProcessed  = fps.reduce((s, fp) => s + fp.processed, 0);

  const applyConfig = () => {
    api.setThreadConfig(localLBs, localFPs);
  };

  const LB_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#059669'];
  const FP_COLORS = ['#ea580c', '#dc2626', '#d97706', '#65a30d', '#0891b2', '#7c3aed', '#2563eb', '#db2777'];

  return (
    <div className="card card-glow flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Cpu size={14} style={{ color: '#2563eb' }} />
          <span className="section-title">Thread Architecture</span>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.2)' }}>
            {config.numLBs} LB × {config.numFPs} FP = {config.numLBs * config.numFPs} threads
          </span>
        </div>
        <button
          onClick={() => setConfigOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all"
          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
          <Settings size={11} />
          Config
          {configOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {/* Config panel */}
      {configOpen && (
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col gap-3"
          style={{ background: '#f8fafc' }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#94a3b8' }}>
            Configure Threads (applies on next run)
          </p>
          <ConfigSlider
            label="Load Balancers"
            value={localLBs}
            min={1} max={4}
            onChange={setLocalLBs}
            color="#2563eb"
          />
          <ConfigSlider
            label="FPs per LB"
            value={localFPs}
            min={1} max={4}
            onChange={setLocalFPs}
            color="#7c3aed"
          />
          <button
            onClick={applyConfig}
            className="self-end text-xs px-4 py-1.5 rounded-lg font-semibold transition-all btn-glow"
            style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)', color: '#2563eb' }}>
            Apply Config
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 flex flex-col gap-5 min-h-0">

        {/* ── Architecture diagram ── */}
        <div className="rounded-xl p-3 text-center text-[10px] font-mono"
          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
          <div className="flex items-center justify-center gap-1 flex-wrap">
            <span className="px-2 py-1 rounded" style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#2563eb' }}>
              Reader
            </span>
            <span>→</span>
            {Array.from({ length: config.numLBs }).map((_, i) => (
              <span key={i} className="px-2 py-1 rounded"
                style={{ background: `${LB_COLORS[i % LB_COLORS.length]}10`, border: `1px solid ${LB_COLORS[i % LB_COLORS.length]}30`, color: LB_COLORS[i % LB_COLORS.length] }}>
                LB{i}
              </span>
            ))}
            <span>→</span>
            {Array.from({ length: config.numLBs * config.numFPs }).map((_, i) => (
              <span key={i} className="px-2 py-1 rounded"
                style={{ background: `${FP_COLORS[i % FP_COLORS.length]}10`, border: `1px solid ${FP_COLORS[i % FP_COLORS.length]}30`, color: FP_COLORS[i % FP_COLORS.length] }}>
                FP{i}
              </span>
            ))}
            <span>→</span>
            <span className="px-2 py-1 rounded" style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#059669' }}>
              Output
            </span>
          </div>
        </div>

        {/* ── Load Balancer Stats ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Server size={12} style={{ color: '#2563eb' }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
              Load Balancers
            </span>
            <span className="text-[10px] font-mono ml-auto" style={{ color: '#94a3b8' }}>
              total: {totalDispatched.toLocaleString()} dispatched
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {lbs.length === 0 ? (
              <span className="text-[11px]" style={{ color: '#94a3b8' }}>No data yet — run Demo or upload PCAP</span>
            ) : (
              lbs.map((lb, i) => (
                <ThreadBar
                  key={lb.id}
                  label={`LB${lb.id}`}
                  value={lb.dispatched}
                  maxValue={maxLBDispatched}
                  color={LB_COLORS[i % LB_COLORS.length]}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Fast Path Stats ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers size={12} style={{ color: '#7c3aed' }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
              Fast Paths (DPI Workers)
            </span>
            <span className="text-[10px] font-mono ml-auto" style={{ color: '#94a3b8' }}>
              total: {totalProcessed.toLocaleString()} processed
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {fps.length === 0 ? (
              <span className="text-[11px]" style={{ color: '#94a3b8' }}>No data yet</span>
            ) : (
              fps.map((fp, i) => (
                <ThreadBar
                  key={fp.id}
                  label={`FP${fp.id}`}
                  value={fp.processed}
                  maxValue={maxFPProcessed}
                  color={FP_COLORS[i % FP_COLORS.length]}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Load distribution indicator ── */}
        {fps.length > 1 && totalProcessed > 0 && (() => {
          const ideal = totalProcessed / fps.length;
          const variance = fps.reduce((s, fp) => s + Math.abs(fp.processed - ideal), 0) / fps.length;
          const balance = Math.max(0, Math.round(100 - (variance / ideal) * 100));
          const balColor = balance >= 80 ? '#059669' : balance >= 50 ? '#d97706' : '#dc2626';
          return (
            <div className="rounded-lg p-3 flex items-center gap-3"
              style={{ background: `${balColor}08`, border: `1px solid ${balColor}20` }}>
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: '#64748b' }}>
                  Load Balance Score
                </div>
                <div className="text-xl font-bold font-mono" style={{ color: balColor }}>
                  {balance}%
                </div>
              </div>
              <div className="flex-1">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${balance}%`, background: balColor }} />
                </div>
                <div className="text-[10px] mt-1.5" style={{ color: '#94a3b8' }}>
                  {balance >= 80 ? 'Well balanced across threads' : balance >= 50 ? 'Moderate imbalance — normal for small captures' : 'High imbalance — consider more threads'}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
