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
- [src/views/InvestDashboard.vue](src/views/InvestDashboard.vue): The entire application lives here — a large single-component dashboard handling all UI, financial calculations, and chart rendering

The dashboard implements:
- **DCF (Discounted Cash Flow)** valuation with 10-year projections and terminal value
- **WACC** calculation using CAPM (market rate `RM = 0.09` is hardcoded)
- **FCF** derived from `OCF - CapEx` inputs
- **Chart.js** charts for WACC sensitivity and FCF projection
- Traditional Chinese UI labels and valuation classification messages (估值友好/中性/高壓)

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
- `InvestDashboard.vue` uses direct DOM manipulation (`document.getElementById`) alongside Vue reactivity — this is intentional for the dense form-heavy UI.
