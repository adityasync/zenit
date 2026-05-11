# Zennit

> The Arc Browser of Indian Trading. Signal over Noise.

Zennit is an AI-native market intelligence cockpit built for the Indian retail trading ecosystem. It aggregates live NSE/BSE data, F&O intelligence, news, and AI analysis into a single, clean dashboard — no login, no friction, just signal.

## What's Inside

- **Real-Time Market Data** — Live NIFTY 50, BANKNIFTY, SENSEX, and sector indices streamed via SSE
- **Market Breadth** — Advances/Declines visualization at a glance
- **Watchlist** — Track your favorite stocks with local persistence
- **News Aggregation** — Curated feeds from 6 major Indian financial news outlets
- **AI Copilot** — Natural language market queries (coming in Phase 2)
- **F&O Intelligence** — Options chain, OI analysis (coming in Phase 3)
- **Stock Detail Pages** — Deep-dive into any NSE symbol (coming in Phase 4)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Charts | Lightweight Charts (TradingView) |
| Animation | Framer Motion |
| Real-time | Server-Sent Events (SSE) |
| Backend Worker | Bun/Node.js |
| Cache | Redis Cloud (optional, app works without it) |
| AI | GLM-4.5-flash (ZhipuAI/BigModel) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
# Clone the repo
git clone https://github.com/your-username/zennit.git
cd zennit

# Install dependencies
npm install

# Copy env files
cp .env.example .env.local

# Start the dev server
npm run dev
```

The app runs in mock mode by default — no API keys or Redis needed for development.

### Optional: Real Data

To pull live market data, configure these in `.env.local`:

- **Redis Cloud** — Sign up at [redis.com/cloud](https://redis.com/cloud/) for a free database, add the URL to `REDIS_URL`
- **Upstox API** — Register at [developer.upstox.com](https://developer.upstox.com/) for free API access

### Optional: Background Worker

```bash
cd worker
bun install
bun run dev
```

The worker handles WebSocket ingestion and Redis pub/sub for real-time data.

## Project Structure

```
zennit/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # 25+ backend-for-frontend route handlers
│   │   ├── page.tsx         # Main dashboard (single-page app)
│   │   └── layout.tsx       # Root layout
│   ├── components/          # Dashboard widgets & UI components
│   │   └── ui/              # shadcn/ui primitives
│   ├── hooks/               # Custom React hooks (useSSE, etc.)
│   ├── lib/                 # Utilities, Redis client, news aggregation
│   └── types/               # TypeScript type definitions
├── worker/                  # Ingestion worker (Bun)
└── public/                  # Static assets
```

## Architecture

Zennit is a single-page dashboard with no client-side routing. All state lives in React `useState`/`useCallback` — no external state management. Real-time data flows through Server-Sent Events with automatic fallback to HTTP polling.

Data sources include Yahoo Finance, NSE India endpoints, RSS feeds from Indian financial news outlets, and a custom backend for stock search.

## Design Philosophy

- **Signal over Noise** — Every element earns its place
- **Typography-first** — JetBrains Mono for numeric data
- **Dark-native** — zinc-950 base, built for low-light screens
- **Zero Friction** — No login, no 2FA, open and use
- **AI-native** — AI is the primary reasoning layer

## Development Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| 0 | Foundation — Scaffolding + Data Pipeline | In Progress |
| 1 | Core Dashboard — Indices, Watchlist, Movers | Planned |
| 2 | Intelligence — AI Copilot, News, Sentiment | Planned |
| 3 | F&O Intelligence — Options Chain, OI Analysis | Planned |
| 4 | Stock Detail Page — Deep-dive views | Planned |
| 5 | Polish — PWA, Performance, Accessibility | Planned |

## Commands

```bash
npm run dev      # Start Next.js dev server
npm run build    # Production build
npm run start    # Serve production build
npm run lint     # Run ESLint
```

## Contributing

Contributions are welcome! If you have ideas, bug fixes, or improvements, feel free to open an issue or submit a pull request.

## License

MIT
