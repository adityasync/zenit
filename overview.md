# ZENIT ⚡ — Project Definition & Abstract

> *The Arc Browser of Indian Trading. Signal over Noise.*

---

## Abstract

**ZENIT** is an open, stateless, AI-native market intelligence cockpit designed exclusively for the Indian retail trading ecosystem. It aggregates live NSE/BSE market data, F&O intelligence, sector flows, and AI-generated move explanations into a **single fixed-viewport interface** — with zero login friction, zero page navigation, and zero paid API dependencies at launch.

Where existing Indian brokers (Zerodha, Upstox, Groww) optimize for transaction workflows, ZENIT optimizes for *decision-making*. It is not a broker. It does not execute trades. It is the layer you open *before* you trade — a cockpit that answers the question most dashboards ignore: **"Why is this moving, and should I care?"**

The entire product lives on one screen. No scrolling between sections. No page routing. Every widget occupies a fixed cell in a bento grid that fills the viewport exactly. Deeper data — stock detail, options chain, news feed — opens as an **overlay panel or modal on top of the live cockpit**, which remains running in the background. Dismiss the overlay, the cockpit is exactly where you left it.

The visual philosophy draws from Palantir's information compression, Plaintr's typographic minimalism, and Bloomberg's terminal-grade data density — rebuilt for a ₹5,000 laptop and a 4G mobile connection in Tier 2 India.

---

## 1. The Problem

The Indian retail market has exploded. Over **11 crore demat accounts** are active, and retail participation in F&O derivatives is at an all-time high. Yet the tools available are either:

- **Too noisy** — broker platforms overwhelm with widgets, banners, and alerts that obscure signal.
- **Too shallow** — news apps give headlines with no market context.
- **Too fragmented** — a trader needs five different tabs (screener, TradingView, NSE website, Reddit, ET Markets) to get a complete picture.
- **Too gated** — premium terminals like Bloomberg cost lakhs per year; enterprise-grade Indian tools are locked behind broker accounts and 2FA.

ZENIT closes this gap.

---

## 2. What ZENIT Does

ZENIT is a **read-only, stateless, single-page market cockpit**. There is one URL. There is one screen. Everything happens on it.

### 2.1 The Cockpit (Persistent Base Layer)

The cockpit is a **fixed-height bento grid** that fills the viewport on every device. It never scrolls. It never navigates away. All cells are live simultaneously:

- Index hero row: NIFTY 50, BANKNIFTY, SENSEX, NIFTY IT, NIFTY AUTO — updating every 5 seconds
- Live watchlist rail: symbol, LTP, % change, sparkline, delivery %
- Top gainers / losers cards with sparklines
- Sector strength heatmap (8 sectors, color-coded)
- Market breadth bar (Advances / Declines / Unchanged)
- Fear vs. Greed gauge (retail sentiment score)
- Delivery Breakout scanner (top 3 signals, amber badge)
- Market open / closed status indicator

### 2.2 Overlays (Open On Top of the Cockpit)

Deeper data opens as a panel or modal **over** the cockpit. The cockpit behind it stays live. Pressing `Esc` or clicking outside dismisses the overlay — no back button, no navigation.

| Trigger | Overlay Type | Content |
|---|---|---|
| Click any stock card | **Right slide-in panel** | Price chart, AI explanation, fundamentals, delivery trend, news |
| Click sector heatmap cell | **Center modal** | Sector index chart, top 5 movers in sector |
| Click "Options" widget | **Full-overlay drawer** | Live options chain, PCR, Max Pain, OI wall chart |
| Click news icon | **Right slide-in panel** | News timeline, AI-summarized headlines |
| Click breakout scanner | **Bottom sheet** | Full scanner results (up to 10 stocks) |
| `Cmd+K` | **Floating command modal** | AI Copilot — natural language market queries |

### 2.3 Mobile Layout (Swipeable Widget Stack)

On screens below 768px, the bento grid collapses into a **vertically stacked, full-width widget list**. A sticky bottom navigation bar lets users jump between sections without scrolling:

`[ Indices ]  [ Watchlist ]  [ Scanner ]  [ F&O ]  [ Copilot ]`

Each tab swaps the visible widget stack. Overlays still open as bottom sheets or full-screen panels. No routing, no page load — purely a view-state toggle.

---

## 3. Core Design Philosophy

ZENIT's visual language is built to claim the Palantir aesthetic honestly — not as a cosmetic reference, but as a structural discipline. Each principle below is a constraint, not a preference.

| Principle | Rule |
|---|---|
| **Single viewport, no scroll** | The cockpit fills exactly one screen height. Nothing lives below the fold. If it can't fit, it's an overlay. |
| **Information compression** | Every widget cell shows maximum useful data in minimum space. No padding for breathing room. No empty-state illustrations. A dim placeholder grid replaces missing data, never a friendly card. |
| **Monospace numerics** | All prices, percentages, OI values, and volume figures render in **JetBrains Mono**. This prevents layout shift during live updates and signals "this is a number, not prose." |
| **Color means something or it isn't there** | Green = positive. Red = negative. Amber = alert. Everything else is `zinc` neutrals. No blue accents, no gradient hero sections, no colored category tags for decoration. |
| **Border-as-structure** | Cell boundaries are `white/8%` — barely visible but defining. No card shadows, no elevated surfaces, no glassmorphism. Everything is flat, delineated by etched lines. |
| **Widget-first mental model** | Each cell is a self-contained instrument. It has a tiny all-caps label (`text-xs`, muted), the live data, and nothing else. No subtitles. No "what is this?" explanations. The user is assumed competent. |
| **Overlays, never navigation** | No routes. No page changes. Deeper data comes forward as a panel or modal. The cockpit stays alive beneath it. |
| **Mobile = swipeable stack** | Below 768px, the grid becomes a tab-based widget stack with a bottom nav bar. Same data, adapted geometry. Never a zoomed-out grid that's too small to read. |
| **Zero Friction** | No login. No 2FA. No account creation. Open the URL and the cockpit is live. |
| **AI-native** | The AI copilot is not a chatbot bolted on. It is the primary reasoning interface — the answer to "why" when the numbers alone don't explain. |

---

## 4. What ZENIT is NOT

- ❌ Not a broker. Does not execute trades.
- ❌ Not a portfolio tracker. Does not manage holdings.
- ❌ Not a research portal. Does not provide buy/sell recommendations.
- ❌ Not a multi-page app. There is exactly one screen. No routes, no back button.
- ❌ Not a scrollable dashboard. Everything visible fits within the viewport.
- ❌ Not a real-time alert system (v1). Push alerts are a v2 feature.
- ❌ Not a social platform. No comments, posts, or profiles.
- ❌ Not gated. No login, no account, no 2FA — ever.

---

## 5. Target Users

**Primary:** Retail swing traders and F&O enthusiasts who want faster market context without switching between 5 tabs.

**Secondary:** FinTech-aware investors who care about product aesthetics and want a Bloomberg-grade feel without the Bloomberg price tag.

**Tertiary:** Finance students and market enthusiasts who want to understand *why* markets move, not just *that* they moved.

---

## 6. Positioning

```
Bloomberg Terminal  →  data-complete, enterprise, ₹₹₹₹₹
Zerodha Kite       →  broker-first, trade-centric, cluttered
TradingView India  →  chart-heavy, community-driven
ET Markets / MC    →  news-first, low signal density

ZENIT              →  cockpit-first, AI-native, premium design, free
```

---

## 7. Technical Identity

| Property | Value |
|---|---|
| **Deployment Model** | Web-first + PWA |
| **Authentication** | None (stateless) |
| **Persistence** | `localStorage` only (watchlists, layout prefs) |
| **Real-time Protocol** | SSE (Server-Sent Events) from a proxy worker |
| **Database** | None (Redis as ephemeral hot cache) |
| **AI Model** | Claude API (Anthropic) via Cmd+K copilot |
| **Paid APIs** | None at launch |

---

## 8. Free API Stack Summary

| Layer | Source |
|---|---|
| Live prices & WebSocket ticks | Upstox API V3 (free tier) |
| Options chain / F&O | ICICI Breeze API (free) |
| Index data / market breadth | NSE public JSON endpoints |
| Gainers, losers, sector data | NSE public endpoints + `nsepython` |
| Fundamentals | Screener.in public pages |
| News headlines | Moneycontrol RSS, ET RSS, Google News RSS |
| Retail sentiment | Reddit public API (r/IndianStreetBets) |
| Historical OHLC | Yahoo Finance India (`yfinance`) |
| Prototyping helpers | `nsetools`, `nsepython` |

---

## 9. The Name

**ZENIT** — the point in the sky directly above an observer. The highest vantage point. The clearest view.

That's the product.

---

*Document version: 1.0 | Status: Pre-development | Classification: Internal*
