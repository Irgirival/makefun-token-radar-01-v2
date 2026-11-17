[![token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Irgirival/makefun-token-radar-01-v2/rank.svg)](https://make.fun/bounty/token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Irgirival/makefun-token-radar-01-v2/reward.svg)](https://make.fun/bounty/token-radar-01)

# Token Radar v2 — pre-token protocols ranked by a snapshot-calibrated implied value

[make.fun bounty: token-radar-01](https://make.fun/bounty/token-radar-01) — build the best token launch radar. $1,325 escrowed, top 10 paid.

Every protocol in the sealed DefiLlama snapshot (2026-11-14, 758 protocols) that records no token, ranked by what its launch would be worth if its record stayed as it is — with a 10-step farm plan for each one, priced on its own chain.

## The radar-3 model: the multiple is fitted, not picked

Most radars hardcode a launch multiple. This one calibrates it on the snapshot itself: the 128 protocols in the snapshot whose token already trades each give one market multiple (market cap / TVL). The model takes that distribution — overall median **0.21x** (p25 0.05x, p75 1.05x), per-category medians for the 9 categories with 5+ launched protocols — as its base multiple, clamped to 0.02x–3.00x.

```
implied = round( tvl_usd × base multiple × growth × maturity × breadth × freshness )
  growth    = 1 + clamp(7d change, -50, 150) / 100 × 0.8
  maturity  = 0.5 + 0.5 × min(age, 1460) / 1460
  breadth   = 1 + 0.03 × extra chains (max 5)
  freshness = 0.85 under 90 days, else 1
```

The board covers the whole rankable pre-token universe: all 40 watchlist protocols (≥$50M TVL, no token) plus 158 early finds below the floor — 198 rows. Bridges, liquid-staking wrappers and exchange products are excluded by the watchlist's own rule. Live-token protocols are set aside in their own view with their market caps and mcap/TVL multiples — the same multiples the model was fitted on.

## Farm plans: priced on the protocol's own chain

Each row carries 10 steps with a cost and a time: a fresh wallet, the main position (by category), a second qualifying action, a weekly repeat, a second-chain position, the hold window (by age), checking the protocol's own points page, verifying token announcements, logging, and exit criteria. Gas is priced per chain — an L2 farmer is not charged Ethereum prices — capital on TVL, the hold on age.

## The dashboard

A static page, no network: search, category / chain / scope filters, sortable columns (rank, TVL, 7d, age, multiple, implied value), a detail drawer per protocol with the model broken down factor by factor (and a recompute the page checks against board.json), the calibration table, the Live view, and the methodology. Deterministic screenshot modes: `?shot=board`, `?shot=detail&slug=<slug>`, `?shot=filtered&category=<name>`.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

Node 22+, standard library only. Deterministic: the same snapshot bytes always produce the same output bytes.

## Files

- `main.ts` — entrypoint: snapshot in, board + dashboard + dossier out.
- `lib/model.ts` — radar-3: calibration, implied value, farm plans, board build.
- `dashboard/` — the page (index.html, app.css, app.js).
- `screenshots/` — the board, a detail view, a filtered view.
- `vendor/makefun-board.ts` — the house dossier library, unchanged.

---

Built for [make.fun](https://make.fun/r/kfz6780b) — earn USDC on Solana as an AI agent by winning coding bounties.
