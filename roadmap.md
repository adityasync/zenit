# ZENIT ⚡ — Software Requirements Specification (SRS) & Roadmap

> Version 1.0 | Status: Pre-development

---

## Part I: Software Requirements Specification

---

### 1. Introduction

#### 1.1 Purpose

This document defines the functional and non-functional requirements for **ZENIT**, an AI-native Indian stock market intelligence cockpit. It is intended for use by the development team, contributors, and technical reviewers.

#### 1.2 Scope

ZENIT is a web-based, stateless, read-only market dashboard built as a **single-page cockpit**. There is one URL, one viewport, and no page navigation. All widgets live in a fixed bento grid that fills the screen. Deeper data surfaces as overlays — slide-in panels, modals, or bottom sheets — on top of the live cockpit. It provides real-time NSE/BSE data, F&O intelligence, AI-powered move explanations, and retail sentiment analysis without requiring user authentication or any paid API subscriptions.

#### 1.3 Definitions

| Term | Definition |
|---|---|
| SSE | Server-Sent Events — unidirectional HTTP streaming from server to client |
| OI | Open Interest — the total number of outstanding derivative contracts |
| PCR | Put-Call Ratio — measure of bearish vs bullish derivatives activity |
| Delivery % | Percentage of traded volume taken to delivery (not squared off intraday) |
| TTL | Time-To-Live — expiry duration for Redis cache keys |
| PWA | Progressive Web App — installable web app with offline support |
| Bento Grid | Fixed-cell, viewport-height layout system. No scroll. Every cell is a live instrument. |
| Overlay | A panel, modal, or bottom sheet that opens on top of the cockpit without navigating away |
| Cockpit | The persistent base layer — the bento grid — which stays live beneath all overlays |
| View-state | A client-side toggle that changes which widgets are visible (mobile tabs) without any page load |

#### 1.4 Overview

This SRS is organized as follows:

- **Part I:** Functional and non-functional requirements
- **Part II:** System architecture and data flows
- **Part III:** API contracts and data sources
- **Part IV:** Roadmap with phased milestones

---

### 2. Overall Description

#### 2.1 Product Perspective

ZENIT is a standalone web application with a lightweight backend proxy worker. It does not integrate with any broker for trade execution. It consumes public and free-tier broker APIs and streams data to a Next.js frontend via Server-Sent Events.

#### 2.2 Product Functions (High-Level)

- Render a fixed-viewport bento grid cockpit with all core widgets live simultaneously
- Display live NSE/BSE indices and individual stock prices with no page reload
- Show top gainers, losers, and sector strength in real time
- Open stock detail as a right slide-in panel over the cockpit (no route change)
- Open options chain as a full-overlay drawer over the cockpit
- Open news feed as a right panel overlay
- Open breakout scanner results as a bottom sheet
- Detect and surface delivery breakout signals
- Aggregate and sentiment-score news and Reddit posts
- Provide an AI copilot (Cmd+K floating modal) for natural language market queries
- Allow the user to maintain a local watchlist stored in `localStorage` (no account required)
- On mobile: render widgets as a swipeable tab stack with bottom navigation bar

#### 2.3 User Classes

| Class | Description | Primary Need |
|---|---|---|
| Swing Trader | Holds positions 2–15 days | Delivery %, sector rotation, news context |
| F&O Trader | Day trades derivatives | OI walls, PCR, max pain, live chain |
| Passive Investor | Monitors portfolio | Fundamentals, news, AI explanations |
| FinTech Enthusiast | Curious about markets | Clean UI, AI copilot, sector flow |

#### 2.4 Constraints

- No paid APIs at v1. All data sources must be free or have a free tier.
- No database at v1. Redis is the only persistence layer (ephemeral).
- No user authentication at v1. Ever.
- **Single page only.** No Next.js route changes during user session. All view changes are overlay/state toggles.
- **No vertical scroll on the cockpit.** The bento grid must fit within `100dvh`. Content overflow is the widget's problem to solve internally (internal scroll within a panel is acceptable).
- Must function on a 4G mobile connection (target: <2s LCP).
- All API keys must be server-side only. No secrets in frontend bundles.

---

### 3. Functional Requirements

---

#### FR-01: Live Index Display

**Description:** The hero section shall display live NIFTY 50, BANKNIFTY, NIFTY IT, NIFTY AUTO, NIFTY PHARMA, and SENSEX with real-time price, change, and percentage change.

**Source:** NSE public JSON (`/api/allIndices`), streamed via SSE.

**Update frequency:** Every 5 seconds during market hours.

**Acceptance criteria:**

- Values update without page reload.
- Positive change shown in green; negative in red.
- Values rendered in JetBrains Mono font.
- Data source gracefully falls back to `nsepython` if NSE endpoint is rate-limited.

---

#### FR-02: Live Watchlist

**Description:** Users shall be able to maintain a personal watchlist stored in `localStorage`. Each watchlist card shall show symbol, LTP, % change, volume, and a sparkline for the last 15 candles.

**Source:** Upstox API V3 quote endpoint (free tier), via backend SSE proxy.

**Acceptance criteria:**

- Add/remove stocks via search modal (Cmd+K → "add RELIANCE").
- Watchlist persists across sessions via `localStorage`.
- Max 20 symbols in v1 watchlist.
- Sparkline renders with Lightweight Charts.

---

#### FR-03: Top Movers

**Description:** A live panel showing the top 5 gainers and top 5 losers by percentage change across NSE-listed stocks.

**Source:** NSE public endpoints (`/api/gainers`, `/api/losers`).

**Update frequency:** Every 30 seconds.

**Acceptance criteria:**

- Cards show symbol, sector tag, % change, and volume vs. 20-day avg volume ratio.
- Clicking a card opens the **Stock Detail slide-in panel** (FR-11). No page navigation.

---

#### FR-04: Sector Strength Heatmap

**Description:** A visual heatmap showing the performance of major NIFTY sectoral indices (BFSI, IT, Auto, Pharma, Metal, FMCG, Energy, Realty).

**Source:** NSE `/api/allIndices`.

**Acceptance criteria:**

- Cells colored by % change (-3% to +3% gradient, red to green).
- Cell size weighted by market cap or fixed.
- Hovering shows sector index value and 5-day trend.

---

#### FR-05: Market Breadth Widget

**Description:** Display Advances, Declines, and Unchanged count for NSE. Include a breadth bar visualization.

**Source:** NSE public endpoints.

**Update frequency:** Every 15 seconds.

**Acceptance criteria:**

- Rendered as a horizontal three-segment bar.
- Shows ratio text: e.g., "1,240 ↑ / 690 ↓ / 45 →".

---

#### FR-06: AI Copilot (Cmd+K)

**Description:** A floating command bar activated by Cmd+K (or Ctrl+K). Accepts natural language queries about the market and returns AI-generated explanations.

**AI Source:** Claude API (Anthropic). Context injected includes: current price, % change, volume vs avg, recent news headlines (last 3), delivery %, sector performance.

**Example queries:**

- *"Why is Tata Motors up 4% today?"*
- *"What's the OI situation on NIFTY 23000 CE?"*
- *"Is HDFC Bank showing any delivery breakout?"*

**Acceptance criteria:**

- Responds within 3 seconds for typical queries.
- Response is 3–6 sentences maximum. No hallucination on live data — copilot must only reference injected context.
- Gracefully handles out-of-market-hours queries.
- Rate limited at 20 queries/hour per IP (no auth).

---

#### FR-07: Delivery Breakout Detector

**Description:** A scanner that identifies stocks meeting all three conditions simultaneously: (1) Price up >1.5% intraday, (2) Volume >2x 20-day average, (3) Delivery % >60%.

**Source:** NSE delivery data + Upstox volume data.

**Update frequency:** Every 5 minutes.

**Acceptance criteria:**

- Shows up to 10 results sorted by delivery % descending.
- Each result shows symbol, % change, volume ratio, delivery %.
- Badge labeled "Breakout Signal" rendered in amber.

---

#### FR-08: Options Chain Overlay

**Description:** A live options chain that opens as a **full-screen overlay drawer** (triggered from the F&O widget on the cockpit or the mobile F&O tab). The cockpit continues streaming live data in the background while the overlay is open.

**Source:** ICICI Breeze API (free) or NSE public option chain endpoint.

**Columns:** Strike, CE OI, CE OI Change, CE LTP, CE IV | PE LTP, PE IV, PE OI Change, PE OI.

**Acceptance criteria:**

- Opens as a full-overlay drawer — not a new page, not a route change.
- Dismissed via `Esc` key or a close button. Cockpit resumes full focus.
- ATM strike highlighted.
- OI buildup highlighted in green; OI unwinding in red.
- PCR and Max Pain displayed in a header bar above the table.
- Expiry selector (dropdown) inside the overlay.
- On mobile: opens as a full-screen bottom sheet with internal vertical scroll.

---

#### FR-09: News Feed & AI Summarization

**Description:** An aggregated news stream pulling from Moneycontrol RSS, Economic Times RSS, and Google News RSS. News is grouped by stock symbol where possible.

**Acceptance criteria:**

- A compact news ticker or "latest 3 headlines" strip is visible on the cockpit at all times.
- Clicking the news widget or a headline opens a **right slide-in panel overlay** with the full news timeline.
- Raw headlines visible inside the panel with internal scroll. Cockpit stays live behind it.
- AI summary (1 sentence) generated per story and shown as a subheadline.
- Clicking a story opens source URL in a new tab.
- Stories older than 24 hours are not shown.
- Panel dismissed via `Esc` or clicking outside.

---

#### FR-10: Retail Sentiment Layer

**Description:** A live Fear vs. Greed indicator computed from Reddit r/IndianStreetBets posts (upvotes + comment sentiment) and Twitter finance hashtags.

**Source:** Reddit public API (no auth required for read-only), Twitter v2 free tier.

**Output:** A 0–100 scalar score displayed as a gauge widget with labels: "Extreme Fear / Fear / Neutral / Greed / Extreme Greed."

**Update frequency:** Every 10 minutes.

**Acceptance criteria:**

- Score computed from keyword sentiment (bull/bear/💎/🚀/📉/bagholding etc.) weighted by post upvotes.
- Shows top 3 most-discussed tickers from Reddit.

---

#### FR-11: Stock Detail Panel (Overlay)

**Description:** A right slide-in panel that opens over the cockpit when a user clicks any stock card anywhere in the cockpit. **There is no `/stock/[symbol]` route.** The cockpit stays live behind the panel. The panel has its own internal scroll.

**Triggered by:** Clicking any stock in the watchlist, top movers, breakout scanner, or sector overlay.

**Sections (within the panel, internally scrollable):**

- Hero price chart (candlestick + area toggle, Lightweight Charts, timeframes: 1D / 1W / 1M / 3M / 1Y)
- Volume bars overlay
- AI move explanation block (auto-generated on panel open, cached 15 min in Redis)
- Fundamentals row: PE, PB, ROCE, D/E, Promoter %, EPS (Screener.in)
- Delivery % trend (30-day bar chart)
- News timeline (symbol-filtered, last 10 stories)
- Peer comparison row (3 peers, static mapping v1)

**Acceptance criteria:**

- Panel slides in from the right (Framer Motion `x` animation).
- Cockpit grid remains visible and live to the left of the panel.
- Panel width: 40% of viewport on desktop; full-screen on mobile.
- Dismissed via `Esc`, swipe-right (mobile), or clicking the cockpit area.
- No URL change, no browser history entry, no back button required.
- Panel can be opened for a different stock without closing — it replaces the current content.

---

#### FR-12: PWA Support

**Description:** ZENIT shall be installable as a Progressive Web App on Android and iOS. When installed, it opens directly to the cockpit in full-screen standalone mode — no browser chrome, no address bar, no tab bar.

**Acceptance criteria:**

- Valid `manifest.json` with icons (192px, 512px).
- Service worker for offline shell rendering (cockpit layout loads instantly; live data resumes on reconnect).
- Install prompt shown on supported browsers.
- Launches in standalone mode.
- Bottom navigation bar (mobile) is touch-optimized with 48px tap targets.

---

### 4. Non-Functional Requirements

#### NFR-01: Performance

- Largest Contentful Paint (LCP): <2 seconds on 4G.
- Time to Interactive (TTI): <3 seconds.
- SSE reconnect on disconnect: <2 seconds.
- Redis cache hit rate target: >90% for repeated tick queries.

#### NFR-02: Reliability

- Backend worker uptime target: 99.5% during market hours (9:00 AM – 3:30 PM IST).
- Graceful degradation: if Upstox API is down, fall back to `nsepython` / NSE public endpoints.
- All API errors logged. User sees "data unavailable" badge, not a crash.

#### NFR-03: Security

- No API keys exposed in frontend bundles.
- All external API calls made server-side through the proxy worker.
- No user PII collected or stored.
- Rate limiting on AI copilot endpoint (20 req/hr per IP).

#### NFR-04: Scalability

- SSE broadcast architecture: one master upstream WebSocket connection per instrument, fan-out to N clients.
- Redis pub/sub handles fan-out.
- Horizontal scaling: worker is stateless; Redis is the shared state layer.

#### NFR-05: Accessibility

- WCAG 2.1 AA compliance for color contrast.
- All interactive elements keyboard-navigable.
- Screen reader labels on all chart elements.

---

### 5. Data Requirements

#### 5.1 Redis Key Schema

```
ticker:{SYMBOL}           → { ltp, change, pct, volume, delivery_pct, timestamp }  TTL: 5s
index:{INDEX_NAME}        → { value, change, pct }                                  TTL: 5s
gainers:top10             → [ { symbol, pct, volume_ratio } × 10 ]                  TTL: 30s
losers:top10              → [ { symbol, pct, volume_ratio } × 10 ]                  TTL: 30s
sector:{SECTOR}           → { pct, value }                                           TTL: 15s
breadth:market            → { advances, declines, unchanged }                        TTL: 15s
news:{SYMBOL}             → [ { headline, url, ai_summary, timestamp } ]             TTL: 10m
ai:insight:{SYMBOL}       → { explanation, generated_at }                            TTL: 15m
sentiment:retail          → { score, label, top_tickers }                            TTL: 10m
options:{SYMBOL}:{EXPIRY} → { chain, pcr, max_pain }                                 TTL: 30s
breakout:scanner          → [ { symbol, pct, vol_ratio, delivery_pct } ]             TTL: 5m
```

---

## Part II: System Architecture

---

### 6. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  DATA SOURCES                        │
│  Upstox WS  │  NSE Public  │  ICICI Breeze  │  RSS  │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│              INGESTION WORKER (Node/Bun)             │
│  - Maintains upstream WebSocket connections          │
│  - Polls NSE/RSS endpoints on schedule               │
│  - Runs sentiment analysis on Reddit/News            │
│  - Triggers AI summaries via Claude API              │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│                  REDIS (Hot Cache)                   │
│  - Pub/Sub for tick broadcasting                     │
│  - TTL-managed key-value store                       │
│  - No persistence (ephemeral)                        │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│              SSE ROUTE HANDLER (Next.js API)         │
│  - Subscribes to Redis pub/sub channels              │
│  - Streams events to connected clients               │
│  - Handles reconnects and heartbeats                 │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│              NEXT.JS DASHBOARD (Frontend)            │
│  - Consumes SSE stream                               │
│  - Renders bento grid with Framer Motion             │
│  - Lightweight Charts for price visualization        │
│  - AI Copilot modal (Cmd+K)                          │
│  - localStorage for watchlist/preferences            │
└─────────────────────────────────────────────────────┘
```

---

### 7. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend framework | Next.js 14 (App Router) | SSE support, RSC, Vercel deploy |
| Styling | Tailwind CSS | Utility-first, fast theming |
| Component library | shadcn/ui | Headless, dark-mode native |
| Animation | Framer Motion | Bento grid layout shifts |
| Charts | Lightweight Charts (TradingView) | High-performance, canvas-based |
| Backend worker | Node.js / Bun | Fast, WebSocket-capable |
| Cache layer | Redis Cloud (free tier) | Sub-ms pub/sub, TTL support |
| Frontend deployment | Vercel | SSE support, edge network |
| Worker deployment | Railway / Fly.io (free tier) | Long-running worker process |
| AI | Claude API (claude-sonnet) | Copilot + news summarization |

---

## Part III: API Contracts

---

### 8. Free API Reference

#### 8.1 Upstox API V3 (Free Tier)

- **Auth:** OAuth 2.0 (free developer account)
- **Endpoints used:**
  - `GET /v2/market-quote/quotes` — LTP, OHLCV for symbols
  - `WebSocket wss://api.upstox.com/v2/feed/market-data-feed` — real-time ticks
  - `GET /v2/market-quote/ohlc` — OHLC for historical
- **Rate limits:** 1000 req/day on free tier (mitigated by Redis caching)
- **Coverage:** NSE + BSE equities, indices, F&O

#### 8.2 ICICI Breeze API (Free)

- **Auth:** API key (free registration)
- **Endpoints used:**
  - `get_option_chain_quotes()` — full options chain with OI and Greeks
- **Coverage:** NIFTY, BANKNIFTY weekly/monthly expiry

#### 8.3 NSE Public JSON Endpoints

No auth required. Throttle respectfully.

```
https://www.nseindia.com/api/allIndices              → All index values
https://www.nseindia.com/api/equity-stockIndices     → Sector indices
https://www.nseindia.com/api/live-analysis-variations-gainers   → Gainers
https://www.nseindia.com/api/live-analysis-variations-loosers   → Losers
https://www.nseindia.com/api/market-status           → Market open/close state
https://www.nseindia.com/api/option-chain-equities   → Option chain (equities)
https://www.nseindia.com/api/option-chain-indices    → Option chain (indices)
```

**Important:** NSE requires session cookies. The backend worker must initiate a browser-like session (set `User-Agent`, fetch homepage first, then hit API).

#### 8.4 Screener.in (Public Pages)

- No API auth. Scrape public stock pages.
- Fields: PE, PB, ROCE, Dividend Yield, Debt/Equity, Promoter %
- Use `cheerio` / `puppeteer` for extraction.
- Cache results in Redis with 24-hour TTL.

#### 8.5 Yahoo Finance (`yfinance`)

- Free Python library. No auth.
- Use for: Historical OHLCV (`yf.download("RELIANCE.NS", period="1y")`)
- Use as fallback for fundamental data.

#### 8.6 RSS Feeds

| Source | URL |
|---|---|
| Moneycontrol | `https://www.moneycontrol.com/rss/latestnews.xml` |
| Economic Times | `https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms` |
| Google News India | `https://news.google.com/rss/search?q=NSE+stock+market&hl=en-IN` |

Parse with `rss-parser` (Node). Poll every 5 minutes. Pass to Claude API for 1-sentence summarization.

#### 8.7 Reddit Public API

```
GET https://www.reddit.com/r/IndianStreetBets/hot.json?limit=25
```

No auth required for public read. Parse posts for tickers (regex on NSE symbol list). Score sentiment on keywords. Cache for 10 minutes.

---

## Part IV: Roadmap

---

### ROADMAP.md

```
ZENIT ⚡ — Development Roadmap
```

---

#### 🟢 Phase 0: Foundation (Week 1–2)

**Goal:** Project scaffolding, toolchain setup, and first data pipeline working.

- [ ] Initialize Next.js 14 project with Tailwind + shadcn/ui
- [ ] Set up Redis Cloud free instance
- [ ] Set up Upstox developer account + OAuth flow (server-side)
- [ ] Set up ICICI Breeze API credentials
- [ ] Build ingestion worker scaffold (Bun/Node)
- [ ] Connect Upstox WebSocket → Redis pub/sub
- [ ] Build SSE route in Next.js API (`/api/stream`)
- [ ] Verify live tick data flowing to browser via SSE
- [ ] Define Redis key schema and TTL strategy
- [ ] Deploy worker to Railway (free tier)
- [ ] Deploy frontend to Vercel

**Milestone:** Live NIFTY price updating in browser via SSE ✓

---

#### 🟡 Phase 1: Core Dashboard MVP (Week 3–5)

**Goal:** Fully functional single-page cockpit, no AI yet.

- [ ] Fixed-height bento grid layout (fills `100dvh`, no vertical scroll)
- [ ] Framer Motion layout engine for grid cells
- [ ] Market open/closed status badge
- [ ] Hero indices row (NIFTY 50, BANKNIFTY, SENSEX, NIFTY IT, NIFTY AUTO)
- [ ] Top gainers / losers cards (NSE public API)
- [ ] Market breadth widget (Advances / Declines bar)
- [ ] Sector strength heatmap (8 sectors)
- [ ] Live watchlist rail (localStorage-backed)
  - [ ] Add/remove symbol via search modal
  - [ ] Sparkline mini-chart per card (Lightweight Charts)
- [ ] **Overlay system scaffold**
  - [ ] Right slide-in panel component (Framer Motion `x` animation)
  - [ ] Full-screen overlay drawer component
  - [ ] Bottom sheet component (mobile)
  - [ ] `Esc` key + outside-click dismissal for all overlay types
  - [ ] Cockpit stays live (SSE continues) while any overlay is open
- [ ] NSE session cookie handler in backend worker
- [ ] Delivery breakout scanner (logic + cockpit widget showing top 3, bottom sheet for full list)
- [ ] **Mobile layout**
  - [ ] Widget stack (single-column, full-width)
  - [ ] Bottom navigation bar: Indices / Watchlist / Scanner / F&O / Copilot
  - [ ] Tab view-state toggle (no routing)
  - [ ] Bottom sheet overlays for mobile
- [ ] PWA manifest + service worker

**Milestone:** Single-page cockpit publicly shareable, works on mobile, overlays functional ✓

---

#### 🔵 Phase 2: Intelligence Layer (Week 6–8)

**Goal:** AI copilot, news, and sentiment features.

- [ ] RSS aggregator in worker (Moneycontrol + ET + Google News)
- [ ] Per-headline Claude AI summarization (1 sentence)
- [ ] News timeline UI (filtered by symbol where possible)
- [ ] AI Copilot modal (Cmd+K)
  - [ ] Command bar UI with Framer Motion animation
  - [ ] Context injection (price, change, volume, news, delivery %)
  - [ ] Claude API integration (claude-sonnet)
  - [ ] Rate limiting (20 req/hr per IP)
  - [ ] Natural language query parsing
- [ ] Reddit sentiment scraper (r/IndianStreetBets)
- [ ] Fear vs. Greed gauge widget
- [ ] Top tickers from Reddit (ticker mention counter)
- [ ] Smart Sector Flow map (v1: static heatmap with live values)

**Milestone:** "Why is Tata Motors up?" answered correctly by AI ✓

---

#### 🟣 Phase 3: F&O Intelligence (Week 9–11)

**Goal:** Options chain, OI analysis, and F&O-grade widgets.

- [ ] Options chain viewer (NIFTY / BANKNIFTY)
  - [ ] ICICI Breeze integration
  - [ ] Expiry selector dropdown
  - [ ] ATM strike highlighting
  - [ ] OI buildup / unwinding coloring
- [ ] PCR (Put-Call Ratio) calculator
- [ ] Max Pain calculator
- [ ] OI wall visualization (bar chart of OI by strike)
- [ ] Block deals feed (NSE public disclosure)
- [ ] Bulk deals feed
- [ ] Insider trading activity widget (NSE SAST disclosures)

**Milestone:** Full F&O dashboard functional for NIFTY options ✓

---

#### ⚪ Phase 4: Stock Detail Panel (Week 12–13)

**Goal:** Full stock deep-dive as a slide-in panel overlay. No new route, no navigation.

- [ ] Right slide-in panel component (if not already done in Phase 1)
- [ ] Panel triggered from any stock card in the cockpit
- [ ] Hero price chart inside panel (candlestick + area toggle, Lightweight Charts)
  - [ ] Timeframe selector: 1D / 1W / 1M / 3M / 1Y
  - [ ] Volume bars overlay
- [ ] AI move explanation block (auto-generated on panel open)
- [ ] Fundamentals row (Screener.in scraper): PE, PB, ROCE, D/E, Promoter %, EPS
- [ ] Delivery % trend chart (30 days, bar chart)
- [ ] News timeline (symbol-filtered, last 10)
- [ ] Peer comparison row (3 peers, static mapping v1)
- [ ] Panel replaces content when different stock clicked — no close/reopen
- [ ] Mobile: panel opens as full-screen bottom sheet
- [ ] Swipe-right to dismiss (mobile)

**Milestone:** Full stock panel working for any NSE symbol, opened from cockpit ✓

---

#### 🔶 Phase 5: Polish, Performance & PWA (Week 14)

**Goal:** Production-ready, performant, installable.

- [ ] Performance audit (Lighthouse ≥ 90 on mobile)
- [ ] LCP optimization (<2s on 4G)
- [ ] Font subsetting (Inter + JetBrains Mono WOFF2)
- [ ] Skeleton loaders for all async sections
- [ ] Error boundaries + fallback states for each API
- [ ] SSE reconnect logic with exponential backoff
- [ ] PWA install prompt (Android + iOS)
- [ ] Offline shell (service worker caches last-known state)
- [ ] Dark mode finalization (zinc-950 base)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] README.md and contribution guide

**Milestone:** v1.0 public release ✓

---

#### 🚀 Phase 6: Post-Launch Expansion (v2 Backlog)

These are validated ideas for after v1.0 ships. Prioritized by user demand.

- [ ] **Telegram bot:** Send breakout scanner alerts and AI summaries to Telegram
- [ ] **Smart alerts:** Browser push notifications for user-defined price/delivery triggers
- [ ] **Historical rewind:** Replay a past trading day's market state
- [ ] **Portfolio analytics:** Input holdings (no login, localStorage-only) → P&L view
- [ ] **Collaborative watchlists:** Share a watchlist via URL
- [ ] **AI sector rotation summary:** Weekly AI briefing on which sectors are seeing institutional rotation
- [ ] **FII/DII data layer:** Aggregate NSE daily FII/DII provisional data
- [ ] **IPO tracker:** Upcoming IPO calendar with GMP sentiment
- [ ] **Options strategy builder:** Basic visual builder (bull call spread, iron condor) with AI explanation
- [ ] **Voice copilot:** Speak queries to the AI copilot

---

### Timeline Summary

| Phase | Focus | Duration | End State |
|---|---|---|---|
| 0 — Foundation | Scaffolding + data pipeline | 2 weeks | Live tick in browser |
| 1 — Core Dashboard | Main UI, watchlist, movers | 3 weeks | Shareable MVP |
| 2 — Intelligence | AI, news, sentiment | 3 weeks | Copilot working |
| 3 — F&O | Options chain, OI, deals | 3 weeks | F&O dashboard |
| 4 — Stock Detail | Per-stock deep-dive | 2 weeks | Full detail page |
| 5 — Polish | Performance, PWA, a11y | 1 week | v1.0 release |
| **Total** | | **~14 weeks** | |

---

### Known Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| NSE blocks scraper IP | Medium | Rotate user agents, add delays, use `nsepython` as fallback |
| Upstox free tier rate limits hit | Medium | Redis caching + batch quote calls |
| Reddit API rate limits | Low | Cache for 10 minutes; only fetch top 25 posts |
| Claude API costs spike | Low | Per-IP rate limit on copilot; cache AI responses (15 min TTL) |
| ICICI Breeze downtime | Low | Fallback to NSE public option chain endpoint |
| Vercel SSE timeout (30s) | High | Use Vercel edge streaming or self-host SSE on Railway |

---

*Document version: 1.0 | Last updated: April 2026 | Classification: Internal*
