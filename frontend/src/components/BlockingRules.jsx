import React, { useState } from 'react';
import { ShieldOff, Plus, X, Trash2, Server, AppWindow, Globe } from 'lucide-react';
import { useDPI } from '../context/DPIContext';

const QUICK_APPS = [
  'YouTube', 'Facebook', 'Instagram', 'Twitter', 'TikTok',
  'Netflix', 'Twitch', 'Spotify', 'Discord', 'Telegram',
];

function RuleChip({ label, onRemove, color = '#f87171' }) {
  return (
    <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono"
      style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
      {label}
      <button onClick={onRemove}
        className="hover:opacity-70 transition-opacity ml-0.5"
        title={`Remove ${label}`}>
        <X size={10} />
      </button>
    </span>
  );
}

function AddField({ placeholder, onAdd, buttonLabel = 'Block', color = '#f87171' }) {
  const [value, setValue] = useState('');

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onAdd(v);
    setValue('');
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder={placeholder}
        className="flex-1 text-xs px-3 py-2 rounded-lg font-mono outline-none"
        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155' }}
      />
      <button
        onClick={submit}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all btn-glow"
        style={{ background: `${color}15`, border: `1px solid ${color}35`, color }}>
        <Plus size={11} /> {buttonLabel}
      </button>
    </div>
  );
}

export default function BlockingRules() {
  const { state, api } = useDPI();
  const { rules } = state;

  const [activeTab, setActiveTab] = useState('ip');

  const tabs = [
    { id: 'ip',     label: 'IP',     icon: Server,     count: rules.ips.length },
    { id: 'app',    label: 'App',    icon: AppWindow,  count: rules.apps.length },
    { id: 'domain', label: 'Domain', icon: Globe,      count: rules.domains.length },
  ];

  const totalRules = rules.ips.length + rules.apps.length + rules.domains.length;

  return (
    <div className="card card-glow flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <ShieldOff size={14} className="text-red-400" />
          <span className="section-title">Blocking Rules</span>
          {totalRules > 0 && (
            <span className="badge text-[10px]"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
              {totalRules} active
            </span>
          )}
        </div>
        {totalRules > 0 && (
          <button
            onClick={() => api.clearRules()}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded"
            title="Clear all rules">
            <Trash2 size={11} /> Clear all
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all relative"
            style={{ color: activeTab === tab.id ? '#2563eb' : '#64748b' }}>
            <tab.icon size={12} />
            {tab.label}
            {tab.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">

        {/* IP Tab */}
        {activeTab === 'ip' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-500">Block all traffic from a source IP address.</p>
            <AddField
              placeholder="e.g. 192.168.1.50"
              onAdd={ip => api.addIPRule(ip)}
              buttonLabel="Block IP"
            />
            <div className="flex flex-wrap gap-2">
              {rules.ips.map(ip => (
                <RuleChip key={ip} label={ip} onRemove={() => api.removeIPRule(ip)} />
              ))}
              {rules.ips.length === 0 && (
                <span className="text-xs text-slate-700">No IP rules configured</span>
              )}
            </div>
          </div>
        )}

        {/* App Tab */}
        {activeTab === 'app' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-500">Block all traffic classified as a specific application.</p>
            <AddField
              placeholder="e.g. YouTube, TikTok"
              onAdd={app => api.addAppRule(app)}
              buttonLabel="Block App"
            />
            {/* Quick-select buttons */}
            <div>
              <p className="text-[10px] text-slate-600 mb-2 uppercase tracking-wider">Quick block:</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_APPS.filter(a => !rules.apps.includes(a.toLowerCase())).map(appName => (
                  <button
                    key={appName}
                    onClick={() => api.addAppRule(appName)}
                    className="text-xs px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                    + {appName}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {rules.apps.map(app => (
                <RuleChip key={app} label={app} onRemove={() => api.removeAppRule(app)} />
              ))}
              {rules.apps.length === 0 && (
                <span className="text-xs text-slate-700">No app rules configured</span>
              )}
            </div>
          </div>
        )}

        {/* Domain Tab */}
        {activeTab === 'domain' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-500">
              Block any SNI/hostname containing this substring (case-insensitive).
            </p>
            <AddField
              placeholder="e.g. tiktok, ads.google"
              onAdd={d => api.addDomainRule(d)}
              buttonLabel="Block Domain"
            />
            <div className="flex flex-wrap gap-2">
              {rules.domains.map(domain => (
                <RuleChip key={domain} label={domain} onRemove={() => api.removeDomainRule(domain)} />
              ))}
              {rules.domains.length === 0 && (
                <span className="text-xs text-slate-700">No domain rules configured</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
