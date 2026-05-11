<div align="center">
  <img src="public/icons/logo.png" alt="Zennit Logo" width="200"/>
  <h1>Zennit</h1>
  <p><strong>The Arc Browser of Indian Trading. Signal over Noise.</strong></p>
  <p>An AI-native market intelligence cockpit built for the Indian retail trading ecosystem.</p>
</div>

---

## Overview

Zennit aggregates live NSE/BSE data, F&O intelligence, news, and AI analysis into a single, clean dashboard — no login, no friction, just signal. Designed for traders who need market context without the noise of traditional platforms, Zennit provides real-time insights through a fixed-viewport interface where all essential widgets live simultaneously.

## Key Features

- **Real-Time Market Data** — Live NIFTY 50, BANKNIFTY, SENSEX, and sector indices via Server-Sent Events
- **Market Breadth Visualization** — Advances/Declines bar showing market participation at a glance
- **Persistent Watchlist** — Track favorite stocks with localStorage persistence and sparkline charts
- **News Aggregation** — Curated feeds from major Indian financial outlets with AI summarization
- **AI Copilot** — Natural language market queries (Cmd+K) for instant context on price movements
- **F&O Intelligence** — Options chain analysis with Open Interest, PCR, and Max Pain calculations
- **Stock Detail Overlays** — Deep-dive views as slide-in panels without leaving the cockpit
- **Delivery Breakout Scanner** — Identifies stocks with institutional interest via delivery % spikes
- **Retail Sentiment Gauge** — Fear vs. Greed indicator from Reddit and social signals
- **Progressive Web App** — Installable experience with offline shell and mobile optimization

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript | UI framework with SSE support and optimal performance |
| **Styling** | Tailwind CSS, shadcn/ui | Utility-first styling with accessible, dark-mode native components |
| **Data Visualization** | Lightweight Charts (TradingView) | High-performance, canvas-based financial charts |
| **Animations** | Framer Motion | Physics-based animations for smooth UI interactions |
| **Real-time** | Server-Sent Events (SSE) | Efficient, unidirectional data streaming from server to client |
| **Backend** | Bun/Node.js (Worker) | WebSocket-capable worker for data ingestion and processing |
| **Caching** | Redis Cloud (Optional) | Ephemeral hot cache with pub/sub for real-time data distribution |
| **AI Processing** | GLM-4.5-flash (ZhipuAI/BigModel) | Natural language understanding for market query responses |
| **Deployment** | Vercel (Frontend), Railway/Fly.io (Worker) | Optimized platforms for SSE and worker processes |

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/zennit.git
cd zennit

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Configuration
For live market data, configure these in `.env.local`:
- **Redis Cloud** — Free tier available at [redis.com/cloud](https://redis.com/cloud/)
- **Upstox API** — Register at [developer.upstox.com](https://developer.upstox.com/) for free market data access

### Background Worker (Optional)
```bash
cd worker
bun install
bun run dev
```
The worker handles WebSocket ingestion and Redis pub/sub for real-time data flow.

## Project Structure
```
zennit/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # Backend-for-frontend route handlers
│   │   ├── page.tsx         # Main dashboard (single-page app)
│   │   └── layout.tsx       # Root layout
│   ├── components/          # Dashboard widgets & UI components
│   │   └── ui/              # shadcn/ui primitives
│   ├── hooks/               # Custom React hooks (useSSE, etc.)
│   ├── lib/                 # Utilities, Redis client, news aggregation
│   └── types/               # TypeScript type definitions
├── worker/                  # Ingestion worker (Bun)
└── public/                  # Static assets (icons, logos)
```

## Architecture & Design

### Core Principles
- **Single Page Interface**: No client-side routing; all interactions occur within a fixed viewport
- **Overlay System**: Detailed views (stocks, options, news) appear as panels/modals over the live cockpit
- **Stateless Design**: Persists only user preferences in localStorage; no accounts or authentication
- **Mobile-First**: Transforms into swipeable widget stack with bottom navigation on small screens

### Data Flow
1. **Ingestion Worker** maintains WebSocket connections (Upstox) and polls APIs (NSE, RSS)
2. **Processed data** stored in Redis with TTL-based expiration
3. **Next.js API routes** serve Server-Sent Events to subscribed clients
4. **Frontend consumes** SSE stream and updates React state in real-time
5. **Overlays fetch** additional data as needed without disrupting cockpit updates

### Key Technical Decisions
- **JetBrains Mono Typography** for numeric stability during live updates
- **zinc-950 Dark Base** optimized for extended trading sessions in low-light environments
- **Zero External State Management** – leverages React's useState/useCallback for simplicity
- **Graceful Degradation** – falls back to HTTP polling if SSE connections fail
- **Server-Side API Keys** – all secrets remain in worker processes, never exposed to clients

## Development Commands
```bash
npm run dev      # Start Next.js development server
npm run build    # Create production bundle
npm run start    # Serve production build
npm run lint     # Run ESLint for code quality
```

## Contributing
We welcome contributions from the community! To contribute:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows our existing style and includes relevant tests.

## License
This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Built with ❤️ for Indian traders</p>
  <p>Making market intelligence accessible, one signal at a time.</p>
</div>