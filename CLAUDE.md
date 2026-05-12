# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Zennit is a single-page real-time Indian stock market intelligence dashboard built with Next.js 14 (App Router), TypeScript, and Tailwind CSS. It aggregates live NSE/BSE data, F&O intelligence, news, and AI analysis into one fixed-viewport bento-grid interface. It does not execute trades.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Commands

```bash
npm run dev      # Start Next.js dev server
npm run build    # Production build
npm run start    # Serve production build
npm run lint     # ESLint (eslint-config-next defaults, no custom rules)
```

No test infrastructure exists. No test runner, no test files, no test scripts.

## Architecture

### Single-Page App Pattern

One page (`src/app/page.tsx`, ~1000+ lines, client component) renders the entire dashboard. No client-side routing. All state is local React `useState`/`useCallback` — no external state management library. localStorage used only for watchlist (`zenit:watchlist`, max 20 items).

### Real-Time Data Flow

- **Primary channel:** Server-Sent Events via `/api/stream` — pushes typed events (`indices`, `breadth`, `sectors`, `gainers`, `losers`, `tick`, `screener`, `news`) every 5s during market hours, 30s otherwise.
- **Client hook:** `src/hooks/useSSE.ts` — exponential backoff reconnection (max 5 attempts), auto-fallback to HTTP polling (`/api/stream-poll`) when SSE fails.
- **Caching:** Two-tier — in-memory `Map` in API routes + optional Redis (`src/lib/redis.ts`, falls back gracefully when `REDIS_URL` is unset).

### API Routes (Backend-for-Frontend)

25 Route Handlers in `src/app/api/*/route.ts` proxy external data sources. Key routes: `/api/stream` (SSE), `/api/quote`, `/api/indices`, `/api/options`, `/api/news`, `/api/history`, `/api/heatmap`, `/api/copilot`.

Data sources: Yahoo Finance (quotes/history), NSE India (options chain), a custom backend at `http://65.0.104.9` (stock data/search), RSS feeds from 6 Indian financial news outlets (news aggregation in `src/lib/news.ts`).

### UI Layer

- **Layout:** Bento grid (`src/components/bento-grid.tsx`), fixed viewport, no scroll between sections.
- **Overlays:** Deeper data opens as slide-in panels, modals, or bottom sheets.
- **Mobile:** Below 768px, grid collapses to tab-based widget stack with sticky bottom nav (`MobileNav`).
- **Components:** shadcn/ui (Radix + Tailwind + CVA) in `src/components/ui/`. Dashboard widgets in `src/components/`.
- **Styling:** Tailwind CSS, dark zinc-950 base theme, JetBrains Mono for numeric data.

### AI Copilot

`/api/copilot` uses GLM-4.5-flash (ZhipuAI/BigModel API). System prompt constrains responses to 2-4 sentences, uses ₹ symbol, prohibits buy/sell recommendations. `.env.example` lists `ANTHROPIC_API_KEY` but the copilot route currently uses the GLM API.

## Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

## Deployment

- **Vercel:** Primary deployment, Mumbai region (`bom1`). Cron job pre-fetches news every 2 minutes. SSE function max duration 300s.
- **Render:** Optional separate worker service (`zenit-worker`) via `render.yaml`.

## Environment Variables

See `.env.example`. Redis is optional (app works without it). Market data APIs (Upstox, ICICI Breeze) are optional for development.
