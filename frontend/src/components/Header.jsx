import React, { useRef } from 'react';
import { Shield, Upload, Play, RefreshCw, Wifi, WifiOff, Loader } from 'lucide-react';
import { useDPI } from '../context/DPIContext';

export default function Header() {
  const { state, api } = useDPI();
  const { connected, processing, processingFile, processingMode, stats } = state;
  const fileInputRef = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('pcap', file);
    api.uploadPcap(formData);
    e.target.value = '';
  };

  const handleDemo = () => api.startDemo();
  const handleReset = () => api.reset();

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200"
      style={{ background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

      {/* ── Brand ── */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)' }}>
            <Shield size={22} style={{ color: '#2563eb' }} />
          </div>
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-widest text-slate-800" style={{ letterSpacing: '0.15em' }}>
            PacketLens
          </h1>
          <p className="text-xs font-mono" style={{ color: '#2563eb', letterSpacing: '0.1em' }}>
            v1.0 · Deep Packet Inspection
          </p>
        </div>
      </div>

      {/* ── Processing status ── */}
      {processing && (
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <Loader size={14} className="animate-spin" style={{ color: '#d97706' }} />
          <span className="text-xs font-mono" style={{ color: '#d97706' }}>
            Processing {processingFile || 'traffic'}…
          </span>
          <span className="text-xs" style={{ color: '#64748b' }}>
            {stats.total.toLocaleString()} pkts
          </span>
        </div>
      )}

      {/* ── Connection + Actions ── */}
      <div className="flex items-center gap-3">
        {/* Connection badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: connected ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)',
            border: `1px solid ${connected ? 'rgba(5,150,105,0.3)' : 'rgba(220,38,38,0.3)'}`,
          }}>
          <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
          {connected
            ? <Wifi size={12} style={{ color: '#059669' }} />
            : <WifiOff size={12} style={{ color: '#dc2626' }} />}
          <span className="text-xs font-semibold" style={{ color: connected ? '#059669' : '#dc2626' }}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* Upload PCAP */}
        <input ref={fileInputRef} type="file" accept=".pcap,.pcapng" className="hidden" onChange={handleUpload} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={processing || !connected}
          className="btn-glow flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.3)', color: '#2563eb' }}>
          <Upload size={13} />
          Upload PCAP
        </button>

        {/* Demo */}
        <button
          onClick={handleDemo}
          disabled={processing || !connected}
          className="btn-glow flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.3)', color: '#059669' }}>
          <Play size={13} />
          Demo Mode
        </button>

        {/* Reset */}
        <button
          onClick={handleReset}
          disabled={processing}
          className="btn-glow flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)', color: '#dc2626' }}>
          <RefreshCw size={13} />
          Reset
        </button>
      </div>
    </header>
  );
}
