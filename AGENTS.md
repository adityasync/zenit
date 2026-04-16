# AGENTS.md - E:\Project Workspace

This workspace contains multiple independent projects. Each has its own `package.json`, dependencies, and workflows.

## Projects

- **NexTick** - Empty directory, initialize as needed
- **ChaosParty** - Roblox game development
- **FlowChain** - Full-stack app with frontend/backend
- **autodetect** - Flutter mobile app
- **blackmint**, **kanyeBook**, **pixelmarket** - Web applications
- **chatJar**, **domain** - Various tools

## Common Commands

Run from project subdirectory:
```powershell
npm install
npm run dev
npm run build
npm run lint
```

## Existing Instructions

- `ChaosParty\.agents\skills\roblox-game-dev\SKILL.md` - Roblox dev guidance
- `autodetect\SUPABASE_SETUP.md` - Supabase configuration

## Merged Behavioral Guidelines

See `CLAUDE.md` for full behavioral guidelines. Key points:

1. **Think Before Coding** - State assumptions, surface tradeoffs, ask when unclear
2. **Simplicity First** - Minimum code that solves the problem, no speculative features
3. **Surgical Changes** - Touch only what needed, match existing style
4. **Goal-Driven Execution** - Define success criteria, verify at each step

## Investigation Order

When working in a specific project:
1. Read `package.json` for scripts and dependencies
2. Check for `README.md` or `*.md` docs
3. Look for `tsconfig.json`, `.eslintrc`, `vite.config.ts`, etc.
4. Inspect CI workflows in `.github/workflows/`