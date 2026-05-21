const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const BlockingRules = require('./src/blockingRules');
const DPIEngine = require('./src/dpiEngine');

const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// ── App setup ────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: FRONTEND_ORIGIN, methods: ['GET', 'POST', 'DELETE'] },
});

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ── File upload ──────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${path.basename(file.originalname)}`),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pcap' || ext === '.pcapng') return cb(null, true);
    cb(new Error('Only .pcap / .pcapng files are allowed'));
  },
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
});

// ── DPI core ─────────────────────────────────────────────────────────────────
const rules = new BlockingRules();
const engine = new DPIEngine(rules, io);

// ── Socket.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Push current state to new client
  socket.emit('stats', engine.getStats());
  socket.emit('app_stats', engine.getAppStats());
  socket.emit('sni_list', engine.getSNIList());
  socket.emit('rules', rules.getAll());
  socket.emit('thread_stats', engine.getThreadStats());
  // Send recent packets and flows
  engine.packets.slice(0, 50).forEach(p => socket.emit('packet', p));
  engine.getFlows().slice(0, 30).forEach(f => socket.emit('flow_update', f));

  socket.on('disconnect', () => console.log(`[WS] Client disconnected: ${socket.id}`));
});

// ── REST API ─────────────────────────────────────────────────────────────────

// Upload and process PCAP
app.post('/api/upload', upload.single('pcap'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  res.json({ message: 'Processing started', filename: req.file.originalname });

  setImmediate(async () => {
    try {
      io.emit('processing_start', { filename: req.file.originalname, mode: 'pcap' });
      await engine.processPcap(req.file.path);
    } catch (err) {
      io.emit('processing_error', { error: err.message });
    } finally {
      fs.unlink(req.file.path, () => {});
    }
  });
});

// Demo mode
app.post('/api/demo', (req, res) => {
  if (engine.isProcessing) {
    return res.status(409).json({ error: 'Already processing' });
  }
  res.json({ message: 'Demo started' });
  setImmediate(async () => {
    io.emit('processing_start', { filename: 'Demo Traffic', mode: 'demo' });
    try {
      await engine.generateDemoTraffic();
    } catch (err) {
      io.emit('processing_error', { error: err.message });
    }
  });
});

// Reset engine
app.post('/api/reset', (req, res) => {
  engine.reset();
  io.emit('stats', engine.getStats());
  io.emit('app_stats', []);
  io.emit('sni_list', []);
  io.emit('engine_reset', true);
  res.json({ message: 'Engine reset' });
});

// Thread stats
app.get('/api/thread-stats', (req, res) => res.json(engine.getThreadStats()));

// Thread config
app.post('/api/thread-config', (req, res) => {
  const { numLBs, numFPs } = req.body;
  if (!numLBs || !numFPs || isNaN(numLBs) || isNaN(numFPs)) {
    return res.status(400).json({ error: 'numLBs and numFPs are required numbers' });
  }
  engine.setThreadConfig(parseInt(numLBs), parseInt(numFPs));
  io.emit('thread_stats', engine.getThreadStats());
  res.json({ message: 'Thread config updated', config: engine.threadConfig });
});

// Stats
app.get('/api/stats', (req, res) => res.json(engine.getStats()));

// Flows
app.get('/api/flows', (req, res) => res.json(engine.getFlows()));

// Packets
app.get('/api/packets', (req, res) => res.json(engine.packets));

// App stats
app.get('/api/app-stats', (req, res) => res.json(engine.getAppStats()));

// SNI list
app.get('/api/sni-list', (req, res) => res.json(engine.getSNIList()));

// Full report
app.get('/api/report', (req, res) => res.json(engine.getReport()));

// ── Blocking Rules ───────────────────────────────────────────────────────────

app.get('/api/rules', (req, res) => res.json(rules.getAll()));

app.post('/api/rules/ip', (req, res) => {
  const { ip } = req.body;
  if (!ip || typeof ip !== 'string') return res.status(400).json({ error: 'ip required' });
  rules.addIP(ip);
  io.emit('rules', rules.getAll());
  res.json({ message: `Blocked IP: ${ip}` });
});

app.delete('/api/rules/ip/:ip', (req, res) => {
  rules.removeIP(req.params.ip);
  io.emit('rules', rules.getAll());
  res.json({ message: `Unblocked IP: ${req.params.ip}` });
});

app.post('/api/rules/app', (req, res) => {
  const { app: appName } = req.body;
  if (!appName || typeof appName !== 'string') return res.status(400).json({ error: 'app required' });
  rules.addApp(appName);
  io.emit('rules', rules.getAll());
  res.json({ message: `Blocked App: ${appName}` });
});

app.delete('/api/rules/app/:app', (req, res) => {
  rules.removeApp(decodeURIComponent(req.params.app));
  io.emit('rules', rules.getAll());
  res.json({ message: `Unblocked App: ${req.params.app}` });
});

app.post('/api/rules/domain', (req, res) => {
  const { domain } = req.body;
  if (!domain || typeof domain !== 'string') return res.status(400).json({ error: 'domain required' });
  rules.addDomain(domain);
  io.emit('rules', rules.getAll());
  res.json({ message: `Blocked Domain: ${domain}` });
});

app.delete('/api/rules/domain/:domain', (req, res) => {
  rules.removeDomain(decodeURIComponent(req.params.domain));
  io.emit('rules', rules.getAll());
  res.json({ message: `Unblocked Domain: ${req.params.domain}` });
});

app.post('/api/rules/clear', (req, res) => {
  rules.clear();
  io.emit('rules', rules.getAll());
  res.json({ message: 'All rules cleared' });
});

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: err.message });
});

// ── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║           PacketLens v1.0 - Backend Server               ║
╠══════════════════════════════════════════════════════════╣
║  HTTP  → http://localhost:${PORT}                           ║
║  WS    → ws://localhost:${PORT}  (Socket.IO)               ║
╚══════════════════════════════════════════════════════════╝
  `);
});
