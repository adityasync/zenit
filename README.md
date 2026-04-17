# ZENIT

> The Arc Browser of Indian Trading. Signal over Noise.

An AI-native market intelligence cockpit designed exclusively for the Indian retail trading ecosystem.

## Features

- **Live Market Layer** — Real-time NIFTY 50, BANKNIFTY, SENSEX, and sector indices
- **Market Breadth** — Advances/Declines visualization
- **Watchlist** — Track your favorite stocks with local persistence
- **AI Copilot** — Natural language market queries (coming in Phase 2)
- **F&O Intelligence** — Options chain, OI analysis (coming in Phase 3)
- **Stock Detail Pages** — Deep-dive into any NSE symbol (coming in Phase 4)

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **Charts:** Lightweight Charts (TradingView)
- **Animation:** Framer Motion
- **Backend Worker:** Bun/Node.js
- **Cache:** Redis Cloud (free tier)
- **Real-time:** SSE (Server-Sent Events)

## Project Structure

```
ZENIT/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/stream/      # SSE endpoint
│   │   ├── page.tsx        # Main dashboard
│   │   └── layout.tsx      # Root layout
│   ├── components/         # React components
│   │   └── ui/             # shadcn/ui components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities & Redis client
│   └── types/              # TypeScript types
├── worker/                 # Ingestion worker (Bun)
│   └── src/
│       └── index.ts       # WebSocket + Redis pub/sub
├── public/                 # Static assets
└── package.json
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy the example env files and configure:

```bash
cp .env.example .env.local
cp worker/.env.example worker/.env
```

For development, you can leave Redis URL empty — the app runs in mock mode.

### 3. Redis Cloud (Optional)

1. Sign up at [Redis Cloud](https://redis.com/cloud/)
2. Create a free database
3. Copy the connection URL to `REDIS_URL`

### 4. Upstox API (Optional)

1. Register at [Upstox Developer](https://developer.upstox.com/)
2. Create a free app
3. Get your API Key and Access Token
4. Add to environment variables

### 5. Run Development

```bash
# Terminal 1: Next.js frontend
npm run dev

# Terminal 2: Worker (optional - for real data)
cd worker && bun install && bun run dev
```

## Development Phases

| Phase | Focus | Status |
|-------|-------|--------|
| 0 | Foundation - Scaffolding + Data Pipeline | ✅ In Progress |
| 1 | Core Dashboard - Indices, Watchlist, Movers | 📋 Planned |
| 2 | Intelligence - AI Copilot, News, Sentiment | 📋 Planned |
| 3 | F&O Intelligence - Options Chain, OI Analysis | 📋 Planned |
| 4 | Stock Detail Page - Deep-dive views | 📋 Planned |
| 5 | Polish - PWA, Performance, Accessibility | 📋 Planned |

## Design Philosophy

- **Signal over Noise** — Every element earns its place
- **Typography-first** — JetBrains Mono for numbers
- **Dark-native** — zinc-950 base, built for low-light
- **Zero Friction** — No login, no 2FA, open and use
- **AI-native** — AI is the primary reasoning layer

## Data Sources

| Layer | Source |
|-------|--------|
| Live prices | Upstox API V3 (free tier) |
| Indices | NSE public JSON endpoints |
| Options chain | ICICI Breeze API (free) |
| News | Moneycontrol, ET RSS |
| Historical | Yahoo Finance |

## License

MIT

---

*Document version: 1.0 | Status: Pre-development*
