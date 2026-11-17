// Token Radar's value model, "radar-3": one sealed snapshot in, one ranked board out.
//
// The difference from a hand-tuned formula: the launch multiple is CALIBRATED
// from the snapshot itself. The snapshot carries 129 protocols whose token
// already trades, each with a market cap and a TVL. Their market-cap-per-TVL
// dollar is the market's own record of what a launched protocol is worth
// relative to its size, so the model takes that distribution — overall and per
// category — as its base multiple, and never hardcodes one. A protocol's
// implied value is its TVL times its category's calibrated multiple, adjusted
// by the snapshot's own figures for that protocol: its seven-day TVL growth,
// how long it has run with no token, and how many chains it reaches.
//
//   base multiple = the category's median mcap/TVL among the snapshot's
//                   launched protocols (5 or more launched in the category),
//                   else the overall median (0.205 here), clamped to
//                   [0.02, 3.00] so one outlier never sets the board.
//   growth factor = 1 + clamp(change_7d, -50, 150) / 100 x 0.8
//                   A protocol gaining TVL fast is worth more than a shrinking
//                   one of the same size; a 7-day fall cuts value, it never
//                   erases it. Unknown growth counts as 0.
//   maturity      = 0.5 + 0.5 x min(age_days, 1460) / 1460
//                   Age is the days since DefiLlama first listed the protocol:
//                   the longer it has run with no token on record, the more
//                   pent-up the launch. Unknown age counts as 365 days.
//   breadth       = 1 + 0.03 x min(chains - 1, 5)
//                   A protocol live on more chains reaches more farmers.
//   freshness     = 0.85 when age_days < 90, else 1
//                   A protocol younger than a quarter has barely been tested.
//   implied       = max(1, round(tvl_usd x base multiple x growth factor
//                                  x maturity x breadth x freshness))
//
// Live-token protocols (a market cap, a CoinGecko id or a symbol on record)
// are never ranked by this model. They are set aside in a separate Live view
// carrying the market's own capitalisation and its mcap/TVL multiple, so the
// board never mixes a model's claim with a market's fact — and the Live view
// is the calibration set the model was fitted on, shown beside it.
// "Records no token" is DefiLlama's record, never proof the protocol has none.
//
// The board ranks every protocol in the snapshot that records no token and is
// not an exchange product, a versioned pool, a wrapped/staked product named as
// one, or a bridge or liquid-staking wrapper. The snapshot's watchlist (40
// protocols at or above the $50M floor) is the floor, never the ceiling: the
// board also carries every rankable pre-token protocol below the floor, so the
// radar covers the whole pre-token universe the snapshot records.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** One category's calibrated multiple, fitted on the snapshot's launched protocols. */
export interface CategoryCalibration {
  category: string;
  launched: number;
  median: number;
}

/** The calibration the model was fitted on: the market's own multiples. */
export interface Calibration {
  launched: number;
  overall_median: number;
  overall_p25: number;
  overall_p75: number;
  by_category: CategoryCalibration[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  multiple_floor: number;
  multiple_cap: number;
  min_category_launched: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  breadth_step: number;
  breadth_max_chains: number;
  freshness_age_days: number;
  freshness_factor: number;
}

export const MODEL: ModelConstants = {
  multiple_floor: 0.02,
  multiple_cap: 3.0,
  min_category_launched: 5,
  growth_weight: 0.8,
  growth_floor: -50,
  growth_cap: 150,
  maturity_floor: 0.5,
  maturity_range: 0.5,
  maturity_days: 1460,
  unknown_age_days: 365,
  breadth_step: 0.03,
  breadth_max_chains: 5,
  freshness_age_days: 90,
  freshness_factor: 0.85,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-3';

/** How many live-token protocols the Live view carries, by market cap. */
export const LIVE_ROWS = 24;

/** Why a row is on the board: the watchlist, or an early find below the floor. */
export type Scope = 'watchlist' | 'early';

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  scope: Scope;
  age_days: number | null;
  implied_value_usd: number;
  model: {
    base_multiple: number;
    category_median: number;
    category_launched: number;
    growth_pct: number;
    growth_factor: number;
    maturity_factor: number;
    breadth_factor: number;
    freshness_factor: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, farm plan included verbatim. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  scope: Scope;
  base_multiple: number;
  category_median: number;
  category_launched: number;
  growth_factor: number;
  maturity_factor: number;
  breadth_factor: number;
  freshness_factor: number;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value and its multiple. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  mcap_tvl: number | null;
}

/** Everything the dashboard needs: the board, the live set, the calibration and the model. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  calibration: Calibration;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a sorted array, or null when it is empty. */
function medianOf(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** A quantile of a sorted array by linear interpolation, or null when empty. */
function quantileOf(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.min(lo + 1, sorted.length - 1);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (i - lo);
}

/** Fit the calibration on the snapshot's launched protocols: every protocol
 *  with a market cap and a TVL gives one market multiple, mcap / TVL. */
export function calibrate(snapshot: Snapshot, model: ModelConstants = MODEL): Calibration {
  const ratios: number[] = [];
  const byCategory = new Map<string, number[]>();
  for (const p of snapshot.protocols) {
    if (p.mcap_usd === null || p.tvl_usd <= 0 || p.mcap_usd <= 0) continue;
    const r = p.mcap_usd / p.tvl_usd;
    if (!Number.isFinite(r) || r <= 0) continue;
    ratios.push(r);
    const cat = p.category ?? 'Uncategorized';
    const list = byCategory.get(cat) ?? [];
    list.push(r);
    byCategory.set(cat, list);
  }
  ratios.sort((a, b) => a - b);
  const overall = medianOf(ratios) ?? 0.2;
  const p25 = quantileOf(ratios, 0.25) ?? overall;
  const p75 = quantileOf(ratios, 0.75) ?? overall;
  const cats: CategoryCalibration[] = [];
  for (const [category, rs] of [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length)) {
    if (rs.length < model.min_category_launched) continue;
    rs.sort((a, b) => a - b);
    const med = medianOf(rs);
    if (med !== null) cats.push({ category, launched: rs.length, median: Math.round(med * 1e4) / 1e4 });
  }
  return {
    launched: ratios.length,
    overall_median: Math.round(overall * 1e4) / 1e4,
    overall_p25: Math.round(p25 * 1e4) / 1e4,
    overall_p75: Math.round(p75 * 1e4) / 1e4,
    by_category: cats,
  };
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** The base multiple: the protocol's category median from the calibration,
 *  else the overall median, clamped so one outlier never sets the board. */
export function baseMultiple(
  protocol: SnapshotProtocol,
  calibration: Calibration,
  model: ModelConstants,
): { multiple: number; categoryMedian: number; categoryLaunched: number } {
  const cat = calibration.by_category.find((c) => c.category === (protocol.category ?? 'Uncategorized'));
  const raw = cat !== undefined ? cat.median : calibration.overall_median;
  const multiple = Math.min(model.multiple_cap, Math.max(model.multiple_floor, raw));
  return { multiple, categoryMedian: raw, categoryLaunched: cat !== undefined ? cat.launched : 0 };
}

/** The five factors and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  calibration: Calibration,
  model: ModelConstants,
): {
  implied: number;
  baseMultiple: number;
  categoryMedian: number;
  categoryLaunched: number;
  growthPct: number;
  growthFactor: number;
  maturityFactor: number;
  breadthFactor: number;
  freshnessFactor: number;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const base = baseMultiple(protocol, calibration, model);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthFactor = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityFactor =
    model.maturity_floor +
    (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const extraChains = Math.max(0, Math.min(protocol.chains.length - 1, model.breadth_max_chains));
  const breadthFactor = 1 + model.breadth_step * extraChains;
  const freshnessFactor = age !== null && age < model.freshness_age_days ? model.freshness_factor : 1;
  const implied = Math.max(
    1,
    Math.round(protocol.tvl_usd * base.multiple * growthFactor * maturityFactor * breadthFactor * freshnessFactor),
  );
  return {
    implied,
    baseMultiple: base.multiple,
    categoryMedian: base.categoryMedian,
    categoryLaunched: base.categoryLaunched,
    growthPct,
    growthFactor,
    maturityFactor,
    breadthFactor,
    freshnessFactor,
    age,
  };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** A wrapped, staked or staking product named as one. */
const WRAPPED = /\b(wrapped|staked|staking)\b/i;
/** An exchange's own product, named with the exchange first. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Categories the watchlist rule keeps out: a bridge or a staking wrapper is a
 *  wrapper's product, not a new launch, so those protocols are never ranked. */
const WATCHLIST_EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC']);

/** Whether a protocol is one the board may rank: pre-token, not an exchange product, not a versioned pool, not a bridge or staking wrapper. */
export function isRankable(p: SnapshotProtocol): boolean {
  return (
    isPreToken(p) &&
    p.category !== 'CEX' &&
    !WATCHLIST_EXCLUDED_CATEGORIES.has(p.category ?? '') &&
    !VERSIONED.test(p.name) &&
    !WRAPPED.test(p.name) &&
    !EXCHANGE_PREFIX.test(p.name)
  );
}

/** Where a rankable row sits against the watchlist's own rule. */
export function scopeOf(p: SnapshotProtocol, watchlist: Set<string>): Scope {
  return watchlist.has(p.slug) ? 'watchlist' : 'early';
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, calibration: Calibration, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const watchlist = new Set(snapshot.watchlist);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug on it, whatever its size.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every other rankable pre-token protocol in the snapshot,
  // below the floor or above it, so the board is the whole pre-token universe
  // the snapshot records, not a hand-picked top slice.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, calibration, model);
    return { p, ...v };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token' as const,
    scope: scopeOf(s.p, watchlist),
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      base_multiple: s.baseMultiple,
      category_median: s.categoryMedian,
      category_launched: s.categoryLaunched,
      growth_pct: s.growthPct,
      // Full precision, never rounded: the dashboard recomputes the implied
      // value from these factors, and a rounded factor would drift the
      // recompute away from the board's number.
      growth_factor: s.growthFactor,
      maturity_factor: s.maturityFactor,
      breadth_factor: s.breadthFactor,
      freshness_factor: s.freshnessFactor,
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** A typical single-transaction gas cost in USD on a chain, as an estimate:
 *  Ethereum mainnet costs dollars, an L2 cents, Solana fractions of a cent.
 *  A flat gas figure would charge a Base farmer Ethereum prices, so each
 *  step prices its own chain. Unknown chains fall back to $1. */
const GAS_USD: Record<string, number> = {
  Ethereum: 6,
  Arbitrum: 0.15,
  Optimism: 0.15,
  Base: 0.15,
  Blast: 0.1,
  Mode: 0.1,
  Linea: 0.2,
  Scroll: 0.2,
  'zkSync Era': 0.2,
  Mantle: 0.1,
  Fraxtal: 0.1,
  Ink: 0.1,
  Unichain: 0.1,
  Sei: 0.05,
  Binance: 0.3,
  Polygon: 0.05,
  Avalanche: 0.5,
  Solana: 0.02,
  Sui: 0.02,
  Aptos: 0.02,
  Movement: 0.02,
  Tron: 0.5,
  'Hyperliquid L1': 0.02,
  Bitcoin: 2,
  Monad: 0.1,
  Berachain: 0.1,
  Plasma: 0.1,
  'Robinhood Chain': 0.1,
  Starknet: 0.5,
  Gnosis: 0.1,
  Fantom: 0.1,
  Celo: 0.05,
  Kaia: 0.05,
  Merlin: 0.1,
  BOB: 0.1,
  Bittensor: 0.1,
  Cronos: 0.1,
  Sonic: 0.1,
};

function gasUsd(chain: string): number {
  return GAS_USD[chain] ?? 1;
}

/** A dollar figure as a short string: $0.15, $6, $200. */
function usd(n: number): string {
  const s = n < 1 ? n.toFixed(2) : n % 1 === 0 ? String(n) : n.toFixed(2);
  return `$${s}`;
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 1_000_000_000) return 200;
  if (p.tvl_usd >= 250_000_000) return 120;
  if (p.tvl_usd >= 50_000_000) return 80;
  return 40;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 45;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The main position's action, by the protocol's own category. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral'))
    return `Supply ${usd(capital)} of USDC to ${name} on ${chain} and borrow $10 of USDC against it, so both sides of the position are active.`;
  if (c.includes('dex') || c.includes('amm') || c.includes('swap'))
    return `Provide ${usd(capital)} of liquidity to ${name}'s deepest pool on ${chain} and keep the position in range, collecting the pool's own fees.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis') || c.includes('option'))
    return `Deposit ${usd(capital)} of USDC as margin on ${name} on ${chain}, open one small hedge, and close it the same week so the account shows real trading.`;
  if (c.includes('yield') || c.includes('leveraged farm') || c.includes('liquidity manager') || c.includes('aggregator'))
    return `Deposit ${usd(capital)} of USDC into ${name}'s highest-TVL strategy on ${chain} and let it compound for the full window.`;
  if (c.includes('curator') || c.includes('allocator') || c.includes('risk'))
    return `Deposit ${usd(capital)} into a ${name} vault on ${chain} and keep the vault shares untouched for the full window.`;
  if (c.includes('staking') || c.includes('restak'))
    return `Stake ${usd(capital)} of the chain's staking asset through ${name} on ${chain} and keep the receipt token in the same wallet.`;
  if (c.includes('prediction'))
    return `Fund ${usd(capital)} on ${name} on ${chain} and place one small market position that settles within the week.`;
  if (c.includes('stable') || c.includes('dual-token'))
    return `Mint or deposit ${usd(capital)} of the stable asset through ${name} on ${chain} and hold it for the full window.`;
  if (c.includes('rwa'))
    return `Mint ${usd(capital)} of the protocol's yield-bearing asset on ${chain} and hold it in the farming wallet for the full window.`;
  if (c.includes('insurance'))
    return `Buy ${usd(capital)} of cover from ${name} on ${chain} and keep the policy active for the full window.`;
  if (c.includes('farm'))
    return `Deposit ${usd(capital)} of USDC into ${name}'s farm on ${chain} and claim the farm's own rewards weekly.`;
  if (c.includes('bridge'))
    return `Bridge ${usd(capital)} of USDC into ${chain} through ${name}, then use the bridged funds in an app on ${chain} the same day.`;
  return `Deposit ${usd(capital)} of USDC into ${name} on ${chain} and keep the position open for the full window.`;
}

/** The second qualifying action, by the protocol's own category. */
function secondActionFor(p: SnapshotProtocol, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp')) return `Repay half the $10 borrow on ${name}, then borrow $5 again, so the loan history shows two borrows.`;
  if (c.includes('dex') || c.includes('amm') || c.includes('swap'))
    return `Swap $10 of USDC for another asset inside ${name} on ${chain}, then swap $5 back the next day, so the pool sees two trades.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis') || c.includes('option'))
    return `Open a second small hedge on ${name} the following week and close it before the weekend.`;
  if (c.includes('yield') || c.includes('aggregator') || c.includes('leveraged farm'))
    return `Move $10 between two ${name} strategies on ${chain} in the second week, so the record shows an active allocator.`;
  if (c.includes('curator') || c.includes('allocator') || c.includes('risk'))
    return `Vote on one vault proposal or reallocate $10 between two ${name} vaults on ${chain}.`;
  if (c.includes('staking') || c.includes('restak'))
    return `Add $10 more to the stake through ${name} in the second week, so the stake grows instead of sitting still.`;
  if (c.includes('prediction')) return `Place a second $5 market position on ${name} on a different outcome from the first.`;
  if (c.includes('bridge')) return `Bridge $10 back through ${name} a week later, so the record shows two crossings in opposite directions.`;
  return `Make a second $10 deposit or swap inside ${name} on ${chain} a week after the first one.`;
}

/**
 * A protocol's farm plan: ten steps, each an action with a cost and a time.
 * Every figure is derived from the protocol's own record (category, chains,
 * TVL, age): gas is priced on the protocol's own chain, capital on its TVL,
 * the hold on its age. Nothing is a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = gasUsd(chain);
  const gas1 = usd(gas);
  const gas2 = usd(gas * 2);
  const secondChain = p.chains.length > 1 ? p.chains[1]! : null;
  return [
    {
      text: `Open a fresh wallet that holds only the funds you plan to farm with, write its seed phrase on paper, and fund it with ${usd(capital + 15)} on ${chain}.`,
      cost: `about ${gas1} of gas for the first transaction`,
      time: '10 minutes to set up',
    },
    {
      text: actionFor(p, capital, chain),
      cost: `${usd(capital)} of capital and about ${gas1} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: secondActionFor(p, chain),
      cost: `about ${gas1} of gas`,
      time: '10 minutes',
    },
    {
      text: `Repeat one qualifying action each week — a deposit, a borrow, a swap or a vote — and never let two weeks pass with no activity.`,
      cost: `about ${gas1} of gas a week`,
      time: '10 minutes a week',
    },
    {
      text:
        secondChain === null
          ? `Read ${p.name}'s own docs for a second venue on another chain, and if one opens, repeat the main position there with $10.`
          : `Repeat the main position with $10 on ${secondChain}, the protocol's second chain, so the activity spans two chains instead of one.`,
      cost: `about ${gas2} of gas for the second chain`,
      time: '15 minutes',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot window.`,
      cost: `the ${usd(capital)} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page from the link it publishes itself and check what the wallet earned.`,
      cost: 'no fee to check, and never pay a fee to claim',
      time: '10 minutes',
    },
    {
      text: `Check the protocol's own announcements for a token or a claim window, and only ever follow a link the protocol itself published — never a link from a random post.`,
      cost: 'no fee to check',
      time: '10 minutes',
    },
    {
      text: `Write the wallet address, the dates and every transaction hash in a farm log, then plan the unwind: withdraw in two parts a day apart.`,
      cost: `about ${gas2} of gas to unwind`,
      time: '5 minutes to log',
    },
    {
      text: `Unwind when the token launches and the claim window opens, or if the protocol's TVL falls 30% or more in a week; if nothing launches in 180 days, reassess the position.`,
      cost: `about ${gas1} of gas to exit`,
      time: 'ongoing, check weekly',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live view — with
 *  the multiple each one trades at, the same multiples the model calibrates on. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      mcap_tvl: p.mcap_usd !== null && p.tvl_usd > 0 ? Math.round((p.mcap_usd / p.tvl_usd) * 1e4) / 1e4 : null,
    }));
}

/** A board row's compact form for data.js, with the farm plan verbatim. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    scope: row.scope,
    base_multiple: row.model.base_multiple,
    category_median: row.model.category_median,
    category_launched: row.model.category_launched,
    growth_factor: row.model.growth_factor,
    maturity_factor: row.model.maturity_factor,
    breadth_factor: row.model.breadth_factor,
    freshness_factor: row.model.freshness_factor,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(
  snapshot: Snapshot,
  model: ModelConstants = MODEL,
): { board: BoardRow[]; radar: RadarData; calibration: Calibration } {
  const calibration = calibrate(snapshot, model);
  const board = buildBoard(snapshot, calibration, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => r.scope === 'early').length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    calibration,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar, calibration };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  if (board.length < 100) return `the board holds ${board.length} rows, fewer than the gate's 100`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.trim().length < 20 || s.trim().length > 600) return `${r.slug} has a farm step of ${s.trim().length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
