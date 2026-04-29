# Pareto Extension

Pareto is a demo-safe Chrome MV3 extension MVP for professional Solana traders.
It turns supported trading and research pages into a compact command surface:
wallet labels, smart-money context, CT discourse signals, alt-wallet clusters, and
a simulated trade ticket are available directly on the page.

This MVP is intentionally not a custodial wallet and does not sign or submit real
transactions. It proves the workflow and UI before adding live data sources and
production execution infrastructure.

## Problem

Professional on-chain traders lose time by switching between X, Solscan,
Dexscreener, GMGN, Photon, Pump.fun, wallets, and routing tools. The useful
context is scattered:

- A wallet is just a string until another tool labels it.
- KOL calls are separated from real on-chain exits.
- Deleted posts and alt-wallet behavior are easy to miss.
- Standard wallet flows force the trader out of the research surface.

Pareto compresses that workflow into a browser extension overlay.

## MVP

The current MVP includes:

- Chrome MV3 extension scaffold with WXT, React, TypeScript, Bun, Biome, and Vitest.
- Content script that detects Solana-like addresses on supported pages and decorates
  them with Pareto badges.
- In-page inspector with local wallet intelligence, risk flags, CT context, and
  simulated buy/sell actions.
- Side panel command center with selected entity, PnL, win rate, smart followers,
  linked wallets, CT mentions, watchlist, and demo trade history.
- Local fixture page that mimics X, Solscan, and Dexscreener surfaces.
- Deterministic fallback profiles for unknown Solana-like addresses.

## Demo

Install dependencies:

```bash
bun install
```

Run WXT:

```bash
bun run dev
```

In another terminal, run the local demo fixture:

```bash
bun run demo
```

Open:

```text
http://127.0.0.1:4173
```

Load the WXT development extension in Chrome if WXT does not do it automatically,
then click any Pareto badge on the demo page. The same selected entity should also
appear in the Chrome side panel.

## Verification

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run verify
```

## Architecture

- `entrypoints/background.ts` keeps extension state in `browser.storage.local` and
  handles runtime messages.
- `entrypoints/content.ts` scans pages, decorates addresses, and renders the in-page
  Pareto inspector.
- `entrypoints/sidepanel/` contains the React side panel UI.
- `src/lib/` contains shared types, address helpers, deterministic fixtures, formatters,
  and trade simulation.
- `demo/index.html` is a local fixture surface for browser QA.

## Demo-Safe Limits

This repository does not include:

- Private-key import or seed phrase handling.
- Passkeys, Turnkey, or embedded MPC custody.
- Real Jupiter routing or transaction submission.
- Mainnet RPC/indexer calls.
- Live X, Helius, Birdeye, GMGN, Solscan, or Dexscreener integrations.

Those are deliberate production milestones.
