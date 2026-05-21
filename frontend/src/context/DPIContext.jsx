import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const BACKEND = 'http://localhost:3001';
const DPIContext = createContext(null);

const initialState = {
  connected: false,
  processing: false,
  processingMode: null,
  processingFile: null,
  processingComplete: false,
  error: null,
  stats: {
    total: 0, forwarded: 0, dropped: 0,
    tcp: 0, udp: 0, other: 0,
    bytes: 0, active_flows: 0, duration: 0,
  },
  packets: [],
  flows: {},
  appStats: [],
  sniList: [],
  rules: { ips: [], apps: [], domains: [] },
  threadStats: { config: { numLBs: 2, numFPs: 2 }, lbs: [], fps: [] },
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };

    case 'PROCESSING_START':
      return {
        ...state, processing: true, processingComplete: false,
        error: null, processingMode: action.payload.mode,
        processingFile: action.payload.filename,
      };

    case 'PROCESSING_COMPLETE':
      return { ...state, processing: false, processingComplete: true };

    case 'PROCESSING_ERROR':
      return { ...state, processing: false, error: action.payload };

    case 'UPDATE_STATS':
      return { ...state, stats: action.payload };

    case 'ADD_PACKET': {
      const packets = [action.payload, ...state.packets];
      if (packets.length > 500) packets.length = 500;
      return { ...state, packets };
    }

    case 'UPDATE_FLOW':
      return {
        ...state,
        flows: { ...state.flows, [action.payload.key]: action.payload },
      };

    case 'UPDATE_APP_STATS':
      return { ...state, appStats: action.payload };

    case 'UPDATE_SNI_LIST':
      return { ...state, sniList: action.payload };

    case 'UPDATE_RULES':
      return { ...state, rules: action.payload };

    case 'UPDATE_THREAD_STATS':
      return { ...state, threadStats: action.payload };

    case 'ENGINE_RESET':
      return {
        ...initialState,
        connected: state.connected,
        rules: state.rules,
      };

    default:
      return state;
  }
}

export function DPIProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(BACKEND, { reconnectionDelay: 1000, reconnectionAttempts: Infinity });
    socketRef.current = socket;

    socket.on('connect',    () => dispatch({ type: 'SET_CONNECTED', payload: true }));
    socket.on('disconnect', () => dispatch({ type: 'SET_CONNECTED', payload: false }));

    socket.on('processing_start',    d  => dispatch({ type: 'PROCESSING_START',    payload: d }));
    socket.on('processing_complete', () => dispatch({ type: 'PROCESSING_COMPLETE' }));
    socket.on('processing_error',    d  => dispatch({ type: 'PROCESSING_ERROR',    payload: d.error }));

    socket.on('stats',       d => dispatch({ type: 'UPDATE_STATS',    payload: d }));
    socket.on('packet',      d => dispatch({ type: 'ADD_PACKET',      payload: d }));
    socket.on('flow_update', d => dispatch({ type: 'UPDATE_FLOW',     payload: d }));
    socket.on('app_stats',   d => dispatch({ type: 'UPDATE_APP_STATS',payload: d }));
    socket.on('sni_list',    d => dispatch({ type: 'UPDATE_SNI_LIST', payload: d }));
    socket.on('rules',       d => dispatch({ type: 'UPDATE_RULES',    payload: d }));
    socket.on('thread_stats',d => dispatch({ type: 'UPDATE_THREAD_STATS', payload: d }));
    socket.on('engine_reset',() => dispatch({ type: 'ENGINE_RESET' }));

    return () => socket.disconnect();
  }, []);

  const api = useCallback({
    startDemo:        ()     => axios.post(`${BACKEND}/api/demo`),
    uploadPcap:       (form) => axios.post(`${BACKEND}/api/upload`, form),
    reset:            ()     => axios.post(`${BACKEND}/api/reset`),
    addIPRule:        (ip)   => axios.post(`${BACKEND}/api/rules/ip`, { ip }),
    removeIPRule:     (ip)   => axios.delete(`${BACKEND}/api/rules/ip/${encodeURIComponent(ip)}`),
    addAppRule:       (app)  => axios.post(`${BACKEND}/api/rules/app`, { app }),
    removeAppRule:    (app)  => axios.delete(`${BACKEND}/api/rules/app/${encodeURIComponent(app)}`),
    addDomainRule:    (d)    => axios.post(`${BACKEND}/api/rules/domain`, { domain: d }),
    removeDomainRule: (d)    => axios.delete(`${BACKEND}/api/rules/domain/${encodeURIComponent(d)}`),
    clearRules:       ()     => axios.post(`${BACKEND}/api/rules/clear`),
    setThreadConfig:  (numLBs, numFPs) => axios.post(`${BACKEND}/api/thread-config`, { numLBs, numFPs }),
  }, []);

  const flows = Object.values(state.flows);

  return (
    <DPIContext.Provider value={{ state, dispatch, api, flows }}>
      {children}
    </DPIContext.Provider>
  );
}

export function useDPI() {
  const ctx = useContext(DPIContext);
  if (!ctx) throw new Error('useDPI must be used within DPIProvider');
  return ctx;
}
