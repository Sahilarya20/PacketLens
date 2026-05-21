import React, { useState } from 'react';
import { useDPI } from './context/DPIContext';
import Header from './components/Header';
import StatsCards from './components/StatsCards';
import PacketFeed from './components/PacketFeed';
import AppBreakdown from './components/AppBreakdown';
import SNIList from './components/SNIList';
import FlowTable from './components/FlowTable';
import BlockingRules from './components/BlockingRules';
import ThreadStats from './components/ThreadStats';
import { AlertTriangle, CheckCircle, Loader, Play, Upload } from 'lucide-react';

function ProcessingBanner({ state }) {
  const { processing, processingComplete, error, processingFile, stats } = state;

  if (error) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 text-sm"
        style={{ background: 'rgba(220,38,38,0.07)', borderBottom: '1px solid rgba(220,38,38,0.2)' }}>
        <AlertTriangle size={14} style={{ color: '#dc2626' }} className="flex-shrink-0" />
        <span className="text-xs" style={{ color: '#dc2626' }}>{error}</span>
      </div>
    );
  }

  if (processing) {
    const pct = stats.total > 0 && !isNaN(stats.total)
      ? Math.min(100, Math.round((stats.forwarded + stats.dropped) / Math.max(stats.total, 1) * 100))
      : 0;
    return (
      <div style={{ background: 'rgba(217,119,6,0.05)', borderBottom: '1px solid rgba(217,119,6,0.2)' }}>
        <div className="flex items-center gap-3 px-4 py-2 text-xs">
          <Loader size={12} className="animate-spin flex-shrink-0" style={{ color: '#d97706' }} />
          <span className="font-medium" style={{ color: '#d97706' }}>
            Processing <span className="font-mono">{processingFile}</span>
          </span>
          <span className="font-mono" style={{ color: '#64748b' }}>
            {stats.total.toLocaleString()} packets · {stats.forwarded.toLocaleString()} forwarded · {stats.dropped.toLocaleString()} blocked
          </span>
        </div>
        <div className="h-0.5 w-full" style={{ background: '#e2e8f0' }}>
          <div className="h-full transition-all duration-300"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #d97706, #f59e0b)' }} />
        </div>
      </div>
    );
  }

  if (processingComplete) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 text-xs"
        style={{ background: 'rgba(5,150,105,0.06)', borderBottom: '1px solid rgba(5,150,105,0.2)' }}>
        <CheckCircle size={12} style={{ color: '#059669' }} className="flex-shrink-0" />
        <span style={{ color: '#059669' }}>
          Processing complete — {stats.total.toLocaleString()} packets analysed,
          {' '}{stats.dropped.toLocaleString()} blocked ({stats.active_flows.toLocaleString()} unique flows)
        </span>
      </div>
    );
  }

  return null;
}

function EmptyState({ api, connected }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 py-20">
      {/* Animated shield */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(37,99,235,0.08)', border: '2px solid rgba(37,99,235,0.25)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ border: '2px solid #2563eb' }} />
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">DPI Engine Ready</h2>
        <p className="text-slate-500 text-sm max-w-md">
          Deep Packet Inspection with real-time flow tracking, TLS SNI extraction, and application classification.
        </p>
      </div>

      {!connected ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
          style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)', color: '#dc2626' }}>
          <AlertTriangle size={14} />
          Backend offline — start the Node.js server on port 3001
        </div>
      ) : (
        <div className="flex gap-4">
          <button
            onClick={() => api.startDemo()}
            className="btn-glow flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all"
            style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.3)', color: '#059669' }}>
            <Play size={16} />
            <div className="text-left">
              <div className="text-sm">Start Demo Mode</div>
              <div className="text-xs opacity-60">Generate synthetic traffic</div>
            </div>
          </button>
          <label className="btn-glow flex items-center gap-3 px-6 py-3 rounded-xl font-semibold cursor-pointer transition-all"
            style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.3)', color: '#2563eb' }}>
            <input type="file" accept=".pcap,.pcapng" className="hidden"
              onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                const fd = new FormData();
                fd.append('pcap', file);
                api.uploadPcap(fd);
                e.target.value = '';
              }} />
            <Upload size={16} />
            <div className="text-left">
              <div className="text-sm">Upload PCAP File</div>
              <div className="text-xs opacity-60">.pcap / .pcapng supported</div>
            </div>
          </label>
        </div>
      )}

      {/* Feature chips */}
      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
        {['TLS SNI Extraction', 'Flow Tracking', 'App Classification', 'IP/Domain Blocking', 'Real-time Analysis', 'PCAP Parsing'].map(f => (
          <span key={f} className="px-3 py-1.5 rounded-full text-xs"
            style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b' }}>
            ✓ {f}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const { state, api } = useDPI();
  const { stats, packets } = state;
  const hasData = stats.total > 0 || packets.length > 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Top bar */}
      <Header />

      {/* Processing / status banner */}
      <ProcessingBanner state={state} />

      {/* Main content */}
      {!hasData ? (
        <div className="flex-1 overflow-auto">
          <EmptyState api={api} connected={state.connected} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Stats row */}
          <StatsCards />

          {/* Main grid */}
          <div className="flex-1 min-h-0 grid gap-3 p-3 pt-0"
            style={{ gridTemplateRows: '1fr 1fr', gridTemplateColumns: '1fr 360px' }}>

            {/* Top-left: Packet Feed */}
            <div className="min-h-0 overflow-hidden">
              <PacketFeed />
            </div>

            {/* Top-right: App Breakdown */}
            <div className="min-h-0 overflow-hidden row-span-1">
              <AppBreakdown />
            </div>

            {/* Bottom-left: Flow Table */}
            <div className="min-h-0 overflow-hidden">
              <FlowTable />
            </div>

            {/* Bottom-right: Thread Stats / SNI / Rules */}
            <div className="min-h-0 overflow-hidden grid gap-3" style={{ gridTemplateRows: '1fr 1fr 1fr' }}>
              <ThreadStats />
              <SNIList />
              <BlockingRules />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
