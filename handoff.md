# Handoff — Sarungallo Holdings (Family Office Dashboard)

## Overview
Self-hosted dashboard tracking $3.5M family-office fund — real estate, equities, gold, crypto. Valued in USD/IDR.

## Stack
- Next.js 16 (App Router) · TypeScript · Tailwind v4 · Recharts
- Supabase Postgres (server-only service role)
- Price sources: open.er-api.com, CoinGecko, gold-api.com, Twelve Data → Yahoo
- Password gate (APP_PASSWORD) + session cookie auth

## Structure
```
sarungallo-holdings/
├── src/
│   ├── app/
│   │   ├── (app)/          # Dashboard, holdings, history, income
│   │   ├── api/            # holdings, login, logout, refresh, snapshots, transactions
│   │   └── login/          # Password gate
│   └── components/         # AppShell, charts, forms, tables
├── brand/                  # Logo, guidelines, LinkedIn banners
└── public/                 # Static assets
```

## Database (Supabase)
| Table | Purpose |
|-------|---------|
| `sh_holdings` | Setiap posisi (asset class, qty, cost basis) |
| `sh_snapshots` | Satu row per refresh → history chart |

RLS enabled, NO public policies — semua akses via service-role key di server.

## Known Issues (dari Cursor AI scan)
- 🔴 ~~APP_PASSWORD missing = no auth~~ → **SUDAH DIFIX + rate limiting**
- 🔴 ~~Oversell bug di `computePosition()`~~ → **SUDAH DIFIX**
- ⚠️ Error messages dari API return raw DB/internal details
- ℹ️ `.env.example` referenced in README tapi file-nya missing

## Status Local vs Cloud
✅ Branch: `main` — up to date
✅ No uncommitted changes