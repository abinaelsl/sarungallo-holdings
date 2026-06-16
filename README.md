# Sarungallo Holdings

A private family-office portfolio tracker. Real estate, equities, gold, and
crypto in one dashboard — valued in USD or IDR, with live price refresh that
saves a timestamped snapshot each time, so your value-over-time graphs build up.

Rebuilt from the original Base44 app as a self-hosted Next.js application you
fully own and deploy yourself.

## Features

- **Dashboard** — total value, total invested, unrealized P/L and return;
  allocation donut by asset class; sector breakdown; value-over-time chart; top
  movers.
- **Holdings** — add / edit / delete across four asset classes, with per-asset
  detail pages.
- **Live refresh** — one click fetches live prices + FX and writes a snapshot
  so history accumulates over time.
- **USD / IDR toggle** — every figure re-denominates instantly.
- **Password gate** — the whole app sits behind a single access password.

## Tech

Next.js (App Router) · TypeScript · Tailwind v4 · Recharts · Supabase (Postgres).

### Price sources (keyless-first)

| Asset      | Source                          | Key needed |
| ---------- | ------------------------------- | ---------- |
| FX (USD/IDR + all currencies) | open.er-api.com   | no |
| Crypto     | CoinGecko                       | no |
| Gold (spot, per troy ounce) | gold-api.com           | no |
| Stocks (IDX `.JK`, US, global) | Twelve Data → Yahoo fallback | **yes** (free) |

Get a free lifetime Twelve Data key at <https://twelvedata.com/pricing> for
reliable Indonesia Stock Exchange prices. Without it, equities fall back to
Yahoo, which is frequently rate-limited from server IPs.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

Required env vars are documented in `.env.example`. At minimum set
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## Database

Two tables live in Supabase, prefixed `sh_` so they coexist with anything else
in the project:

- `sh_holdings` — every position.
- `sh_snapshots` — one row per refresh (total value, cost, FX, per-class
  breakdown) — the basis of the history chart.

Both have Row Level Security enabled with **no public policies**: the app reaches
them only through the server-side service-role key. The public/anon key has no
access.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel (framework auto-detected as Next.js).
3. Add Environment Variables (Production + Preview):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_PASSWORD` (your chosen access password)
   - `SESSION_SECRET` (any long random string)
   - `TWELVEDATA_API_KEY` (free key)
4. Deploy, then add your custom domain under Project → Settings → Domains.

## Using it

1. Open the app and sign in with `APP_PASSWORD`.
2. **Holdings** → add positions (real estate uses a manual appraised value;
   stocks/gold/crypto are priced live).
3. Hit **Refresh** to pull live prices and save the first snapshot. Refresh
   whenever you want a new data point — the dashboard chart grows from them.
