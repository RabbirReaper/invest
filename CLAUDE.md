# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start frontend dev server (port 5173, with HMR)
npm run dev

# Start backend Express server (port 3000)
npm run start

# Build production bundle to dist/
npm run build

# Preview production build locally
npm run preview
```

For full local development, run both `npm run dev` (frontend) and `npm run start` (backend) concurrently in separate terminals. Vite proxies `/api` requests to the backend at `http://localhost:3000`.

## Architecture Overview

**Stock Investment Valuation Tool** — Vue 3 SPA with an Express.js backend acting as a Yahoo Finance proxy.

### Frontend (Vite + Vue 3)

- [src/main.js](src/main.js): App entry point, mounts Vue with router
- [src/App.vue](src/App.vue): Thin root component, only renders `<RouterView />`
- [src/router/index.js](src/router/index.js): Single route `/` → `InvestDashboard`
- [src/views/InvestDashboard.vue](src/views/InvestDashboard.vue): Orchestrator — owns all state and DOM-manipulation logic, renders 13 child components
- [src/utils/financial.js](src/utils/financial.js): Pure financial functions — `calcWACC`, `runDCF`, `fmtB`, `SCENARIO_MULT`, `SCENARIO_NOTE`
- [src/data/phases.js](src/data/phases.js): Static config for the 4 economic cycle phases (復甦/過熱/滯脹/衰退) — each carries default slider values and curated indicator links

**Component breakdown** (all in [src/components/](src/components/)):

| Component | Role |
|-----------|------|
| `AppTopBar` | Ticker input, fetch button, status display |
| `InputSidebar` | All sliders (rf, beta, dv, spread, tc, rm, g1, g2, gp, margin) and numeric inputs (shares, price, revenue, FCF, cash, debt) |
| `PhaseRow` | Economic cycle phase selector buttons |
| `CycleIndicators` | Per-phase indicator links and asset allocation display |
| `MetricsRow` | Summary metrics bar (WACC, IV, target price, upside) |
| `FinancialSummary` | FCF breakdown (OCF − CapEx) and normalization mode toggle |
| `DCFTable` | 10-year DCF projection table |
| `EVBreakdown` | Enterprise value → equity bridge table |
| `WACCChart` | Chart.js WACC sensitivity chart |
| `FCFChart` | Chart.js FCF projection chart |
| `SensitivityMatrix` | g1 × WACC sensitivity matrix with scenario tabs |
| `ConclusionPanel` | WACC/DCF/technical signal cards and action recommendation |
| `TradingViewChart` | Embedded TradingView widget |

**Data flow**: `InvestDashboard` reads all inputs via `document.getElementById` (intentional for the dense form-heavy UI), runs calculations using `financial.js` utilities, then writes results back to the DOM. Chart components expose an `update()` method called via template refs. The dashboard uses Vue `provide` to share the `sync`, `fcfFromComponents`, `autoFetch`, and phase-switching callbacks with child components.

The dashboard implements:
- **DCF** valuation with 10-year projections and Gordon Growth terminal value
- **WACC** via CAPM; market rate `RM` defaults to 9% but is slider-adjustable
- **FCF** from direct input or normalized as `Revenue × FCF margin %`
- Scenario multipliers (conservative 0.75×, normal 1.0×, optimistic 1.25×) applied to the sensitivity matrix
- Traditional Chinese UI labels and valuation signals (估值友好/中性/高壓)

### Backend ([server.js](server.js))

Express server with one purpose: proxy Yahoo Finance API requests to avoid CORS and authentication issues.

- `GET /api/yahoo/:ticker` — fetches `price`, `financialData`, `defaultKeyStatistics` from Yahoo Finance
- Yahoo Finance session (cookies + crumb token) is cached for 1 hour via `refreshYahooSession()`
- Serves the production SPA from `dist/` with SPA fallback routing

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Backend server port |
| `CORS_ORIGIN` | localhost regex | Allowed CORS origin |

No `.env` file is committed; set these in your shell or a local `.env` file (loaded via `dotenv`).

## Key Design Notes

- No test framework is configured.
- No linting tools are configured.
- Both `package-lock.json` and `yarn.lock` exist — prefer `npm` for consistency.
- The intentional hybrid pattern: `InvestDashboard.vue` uses `document.getElementById` for all input reads and result writes; Vue reactivity is only used for chart refs and `provide`/`inject` for callbacks. Do not refactor this to reactive data unless the entire component is rewritten.
- The backend fetches Yahoo Finance data from two endpoints in parallel: `quoteSummary` (price + financials) and `fundamentalsTimeSeries` (detailed cashflow series). The `fundamentalsTimeSeries` response is merged into the `quoteSummary` result before returning to the frontend.
