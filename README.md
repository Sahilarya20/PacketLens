# PacketLens 🔍

**v1.0 · Deep Packet Inspection Dashboard**

A real-time network traffic analysis tool that parses PCAP files, extracts TLS SNI, classifies applications, tracks flows, and enforces blocking rules — all through a live web dashboard.

🌐 **Live Demo:** [packet-lens.vercel.app](https://packet-lens-k2otv.vercel.app)

---

## Features

| Feature | Description |
|---|---|
| **PCAP Parsing** | Upload `.pcap` / `.pcapng` files for full packet analysis |
| **TLS SNI Extraction** | Parses TLS Client Hello to extract Server Name Indication from encrypted traffic |
| **HTTP Host Extraction** | Extracts host headers from plaintext HTTP traffic |
| **DNS Query Parsing** | Captures DNS queries from UDP packets |
| **Application Classification** | Identifies 20+ apps: YouTube, Netflix, Google, Discord, WhatsApp, Zoom, Spotify, etc. |
| **Flow Tracking** | Groups packets into TCP/UDP flows by 5-tuple (src IP, dst IP, src port, dst port, protocol) |
| **Real-time Dashboard** | Live updates via WebSocket (Socket.IO) |
| **IP / App / Domain Blocking** | Add and remove blocking rules that mark packets as DROPPED |
| **Thread Simulation** | Simulates multi-threaded load balancer + fast-path worker architecture |
| **Demo Mode** | Built-in synthetic traffic generator — no PCAP file needed |

---

## Tech Stack

### Frontend
- **React 18** + **Vite 5**
- **Tailwind CSS** — utility-first styling
- **Recharts** — application breakdown charts
- **Socket.IO Client** — real-time event streaming
- **Axios** — REST API calls
- **Lucide React** — icon set

### Backend
- **Node.js** + **Express**
- **Socket.IO** — WebSocket server
- **Multer** — PCAP file upload handling
- Custom binary parsers (no external packet library dependency):
  - Ethernet / IPv4 / IPv6 / VLAN frame parsing
  - TCP / UDP / ICMP protocol parsing
  - TLS ClientHello SNI extraction
  - DNS query parsing

---

## Project Structure

```
PacketLens/
├── backend/
│   ├── server.js              # Express + Socket.IO server
│   └── src/
│       ├── dpiEngine.js       # Core DPI processing engine
│       ├── packetParser.js    # Binary Ethernet/IP/TCP/UDP parser
│       ├── sniExtractor.js    # TLS SNI & HTTP Host extractor
│       ├── flowTracker.js     # TCP/UDP flow session tracker
│       ├── pcapReader.js      # PCAP/PCAPng file reader
│       ├── blockingRules.js   # IP / App / Domain block list
│       └── types.js           # App type definitions & classification map
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── DPIContext.jsx # Global state + Socket.IO connection
│   │   └── components/
│   │       ├── Header.jsx         # Status bar + action buttons
│   │       ├── StatsCards.jsx     # Packet counters overview
│   │       ├── PacketFeed.jsx     # Live scrolling packet list
│   │       ├── FlowTable.jsx      # Active flow sessions table
│   │       ├── SNIList.jsx        # Extracted SNI / domain list
│   │       ├── AppBreakdown.jsx   # Application pie/bar chart
│   │       ├── BlockingRules.jsx  # Rule management UI
│   │       └── ThreadStats.jsx    # Thread worker stats panel
│   └── index.html
├── vercel.json                # Vercel deployment config
└── .gitignore
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Clone the repository

```bash
git clone https://github.com/Sahilarya20/PacketLens.git
cd PacketLens
```

### 2. Start the Backend

```bash
cd backend
npm install
npm run dev        # uses nodemon for hot reload
# or
npm start          # production
```

The server starts on `http://localhost:3001`.

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### 4. Environment Variables

**Frontend** — create `frontend/.env`:
```env
VITE_BACKEND_URL=http://localhost:3001
```

**Backend** — create `backend/.env` (optional, defaults shown):
```env
PORT=3001
FRONTEND_ORIGIN=http://localhost:5173
```

---

## Usage

### Upload a PCAP File
1. Click **Upload PCAP** in the header
2. Select a `.pcap` or `.pcapng` file (max 200 MB)
3. The engine processes it in real-time — watch packets, flows, and SNIs populate live

### Demo Mode
Click **Demo Mode** to generate synthetic traffic without a PCAP file. Simulates traffic from YouTube, Netflix, Google, Discord, and more.

### Blocking Rules
In the **Blocking Rules** panel:
- **Block by IP** — drops all traffic from a source IP
- **Block by App** — drops all traffic classified as that application
- **Block by Domain** — drops all traffic matching an SNI/domain

Blocked packets appear in the feed with a `DROPPED` status.

### Reset
Click **Reset** to clear all state and start fresh.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/api/upload` | Upload a PCAP file (multipart/form-data, field: `pcap`) |
| `POST` | `/api/demo` | Start demo traffic generation |
| `POST` | `/api/reset` | Reset engine state |
| `GET` | `/api/stats` | Get current packet statistics |
| `GET` | `/api/flows` | Get all tracked flows |
| `GET` | `/api/packets` | Get recent packets (last 500) |
| `GET` | `/api/app-stats` | Get per-application traffic breakdown |
| `GET` | `/api/sni-list` | Get list of extracted SNIs/domains |
| `GET` | `/api/report` | Get full analysis report |
| `GET` | `/api/thread-stats` | Get thread worker statistics |
| `POST` | `/api/thread-config` | Update thread config (`{ numLBs, numFPs }`) |
| `GET` | `/api/rules` | Get all blocking rules |
| `POST` | `/api/rules/ip` | Add IP block rule (`{ ip }`) |
| `DELETE` | `/api/rules/ip/:ip` | Remove IP block rule |
| `POST` | `/api/rules/app` | Add app block rule (`{ app }`) |
| `DELETE` | `/api/rules/app/:app` | Remove app block rule |
| `POST` | `/api/rules/domain` | Add domain block rule (`{ domain }`) |
| `DELETE` | `/api/rules/domain/:domain` | Remove domain block rule |
| `POST` | `/api/rules/clear` | Clear all blocking rules |

### WebSocket Events (Socket.IO)

| Event | Direction | Description |
|---|---|---|
| `stats` | Server → Client | Updated packet counters |
| `packet` | Server → Client | New packet parsed |
| `flow_update` | Server → Client | Flow created or updated |
| `app_stats` | Server → Client | Updated app breakdown |
| `sni_list` | Server → Client | Updated SNI list |
| `rules` | Server → Client | Updated blocking rules |
| `thread_stats` | Server → Client | Updated thread worker stats |
| `processing_start` | Server → Client | Analysis started |
| `processing_complete` | Server → Client | Analysis finished |
| `processing_error` | Server → Client | Analysis error |
| `engine_reset` | Server → Client | Engine was reset |

---

## Deployment

### Frontend → Vercel

The `vercel.json` at the root handles everything:

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "framework": "vite"
}
```

Add environment variable in Vercel dashboard:
```
VITE_BACKEND_URL = https://your-backend.railway.app
```

### Backend → Railway

1. New Project → Deploy from GitHub → select this repo
2. Set **Root Directory** to `backend`
3. Add environment variable:
```
FRONTEND_ORIGIN = https://your-app.vercel.app
```
Railway auto-runs `npm start` on deploy.

---

## Recognized Applications

PacketLens classifies traffic into the following application types based on SNI / DNS / host patterns:

`Google` · `YouTube` · `Facebook` · `Twitter/X` · `Instagram` · `Netflix` · `TikTok` · `Amazon` · `Microsoft` · `Apple` · `GitHub` · `Discord` · `WhatsApp` · `Telegram` · `Zoom` · `Cloudflare` · `Twitch` · `Reddit` · `LinkedIn` · `Spotify` · `HTTP` · `HTTPS` · `DNS` · `Unknown`

---

## License

MIT © [Sahil Arya](https://github.com/Sahilarya20)
