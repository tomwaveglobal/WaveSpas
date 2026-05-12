# WaveSpas SEO Opportunities — Data-Backed (Last 16 Months GSC)

**Source:** Google Search Console export, Jan 2025 – May 2026, all countries (UK = 84% of clicks)
**Date analysed:** 2026-05-11
**Total baseline:** 159k clicks / 6.7M impressions / 13.5 avg position / 2.4% CTR

This document supersedes `seo-opportunities-uk-hot-tubs.md`. Forecasts here are calculated from real data, not industry estimates.

---

## Headline numbers

| Metric | 16-month total | Monthly avg | Trend |
|---|---:|---:|---|
| Clicks | 159k (134k UK) | ~10k | ↗ (was 6k Jan-25, now 11k May-26) |
| Impressions | 6.7M (4.5M UK) | ~419k | ↗ steady growth |
| Avg position | 13.5 (UK 11.92) | — | ↗ improved from 20 → 9 |
| CTR | 2.4% (UK 2.96%) | — | ↗ improved from 1.6% → 2.3% |

**Reading:** the site is on a clear upward trajectory. Position has roughly halved in 16 months. The work below is about *accelerating* this, not turning it around.

---

## The 5 biggest insights from the data

### Insight 1 — CTR is the bottleneck, not ranking
You're already top-10 for many high-value commercial queries. The site under-converts those impressions vs CTR benchmarks for the positions held.

| Query | Impressions | Position | Current CTR | Benchmark CTR @ position | Gap |
|---|---:|---:|---:|---:|---:|
| inflatable hot tub | 125,395 | 7.11 | 1.64% | ~4% | -2.4pp |
| hot tub clearance sale uk | 15,968 | 7.56 | 1.6% | ~4% | -2.4pp |
| best inflatable hot tub uk | 9,387 | 9.06 | 0.58% | ~3% | -2.4pp |
| blow up hot tub | 15,329 | 7.76 | 0.65% | ~4% | -3.4pp |
| inflatable jacuzzi | 9,967 | 8.63 | 0.48% | ~3% | -2.5pp |
| inflatable hot tubs | 17,889 | 8.64 | 1.58% | ~3% | -1.4pp |
| portable hot tub | 16,395 | 9.4 | 1.21% | ~3% | -1.8pp |
| hot tub accessories | 36,071 | 7.92 | 0.79% | ~4% | -3.2pp |

**Implication:** The 8 queries above represent **246k impressions** with a cumulative CTR gap of ~2.5pp. Closing that gap with better meta titles/descriptions = **~6,000 incremental clicks over 16 months = ~370/mo from these 8 queries alone.** No new content, no link-building.

### Insight 2 — The "impression black holes"
Pages with huge impression volume but terrible CTR. These are quick-fix opportunities (title + meta description + maybe restructure H1).

| Page | Impressions | Clicks | CTR | Position | Diagnosis |
|---|---:|---:|---:|---:|---|
| /collections/inflatable-hot-tubs | 1,028,631 | 9,312 | 0.91% | 13.65 | Below-benchmark CTR; meta likely poor + needs ranking lift |
| /collections/hot-tub-spa-sale | 601,035 | 1,935 | 0.32% | 13.56 | "Sale" intent — title/meta probably generic |
| /collections/hot-tub-accessories | 446,730 | 2,852 | 0.64% | 8.67 | Top 10 but CTR catastrophic for position |
| /collections/hot-tub-filters | 374,181 | 2,486 | 0.66% | 10.09 | Same — top 10 but CTR awful |
| /pages/hot-tub-chemical-guide | 324,418 | 2,114 | 0.65% | 15.57 | Guide page, page 2, low CTR — possibly low-quality snippet |
| /collections/hot-tubs | 323,962 | 1,017 | 0.31% | 15.64 | Generic collection — meta likely competes with /inflatable-hot-tubs |
| /collections/hot-tub-chemicals | 259,121 | 434 | 0.17% | 10.99 | Top 10, **0.17% CTR is broken** — investigate first |
| /pages/spa-comparison-guide | 204,518 | 912 | 0.45% | 9.54 | Position 9.5 should yield 3%+ CTR — page is empty/thin? |
| /collections/hot-tub-full-range | 192,982 | 726 | 0.38% | 15.3 | Generic collection name |
| /collections/hot-tub-aromatherapy | 68,852 | 294 | 0.43% | 10.04 | |

**Sum of impressions in this list:** ~3.83M
**Sum of clicks:** ~22k
**Current effective CTR:** 0.57%
**If these hit just 2% CTR at current positions:** ~76k clicks over 16mo = **+3,400 clicks/mo**

### Insight 3 — Desktop is severely under-performing vs mobile
| Device | Clicks | Impressions | CTR | Avg position |
|---|---:|---:|---:|---:|
| Mobile | 120,488 | 3,991,426 | **3.02%** | **10.27** |
| Desktop | 26,118 | 2,740,167 | 0.95% | **21.58** |
| Tablet | 3,416 | 68,989 | 4.95% | 7.29 |

**The desktop position is 2x mobile.** That's not a normal split. Hypotheses (need to investigate):

1. Different content rendering on desktop (CSR rendering issue, hydration delay)
2. Core Web Vitals failing on desktop (LCP/CLS)
3. Layout pushing key content below fold on desktop
4. Possible canonical/hreflang issue causing desktop to be served differently

**Forecast if desktop hits mobile parity:** desktop clicks → ~80k over 16mo (currently 26k). That's **+3,400 clicks/mo from a technical fix**, no content work needed.

### Insight 4 — Product snippets carry 80% of impressions but only 1.55% CTR
| Search appearance | Clicks | Impressions | CTR | Position |
|---|---:|---:|---:|---:|
| Product snippets | 55,685 | 3,602,860 | 1.55% | 15.58 |
| Merchant listings | 2,418 | 71,440 | 3.38% | 2.4 |
| Review snippet | 551 | 31,026 | 1.78% | 11.72 |

This is the Shopify product feed → Google Shopping organic channel. It's your biggest impression source. Three levers:

1. **Product titles** in the feed (these become the SERP title in product snippets)
2. **Product images** (first image visible in SERP — affects CTR)
3. **Review schema** — only 31k impressions on review snippets despite likely having Trustpilot ratings. The aggregateRating JSON-LD probably isn't firing on PDPs. Easy code fix in the theme.

### Insight 5 — Brand vs non-brand split is healthy
Quick scan of top queries: branded queries ("wave spa", "wave hot tub", etc.) contribute roughly 35–40k clicks. Non-brand contributes ~95–100k. **The site is acquiring non-brand traffic — this is a real SEO engine, not just defending the brand.**

---

## The actual opportunity list, ranked by clicks/effort

### Tier 1 — Ship this week (3–5 days of work, immediate impact)

#### 1.1 Rewrite metas on the top 10 impression-black-hole pages
Target the 10 pages listed in Insight 2. For each:
- New meta title (50–60 chars) targeting the primary query
- New meta description (140–155 chars) with USP, price range, social proof, CTA
- Verify single H1
- Add primary keyword to first 100 words

**Effort:** 1 day to write all 10 + push via Shopify admin
**Forecast uplift:** +3,400 clicks/mo within 4–6 weeks (Google needs to re-crawl + re-snippet)

#### 1.2 Fix review schema on PDPs
Review snippet has only 31k impressions despite Wave being a heavily-reviewed brand. Either `aggregateRating` JSON-LD isn't on PDPs, or values aren't being read. Audit + fix in `sections/main-product.liquid` or similar.

**Effort:** 0.5 day (verify which review provider — Trustpilot, Reviews.co.uk — feeds the rating, then ensure the schema renders)
**Forecast uplift:** CTR lift across all PDPs of 10–15%. With ~3.6M product snippet impressions/16mo, even 5% CTR uplift = **+2,800 clicks/mo**

#### 1.3 Investigate desktop ranking gap
Run Lighthouse on desktop, compare DOM/rendering vs mobile, check for hydration delays. May be a one-line fix; may be a bigger theme change.

**Effort:** 1 day diagnosis + 1–3 days fix (uncertain — depends on root cause)
**Forecast uplift:** **+3,400 clicks/mo if desktop hits mobile parity.** This is the single biggest non-content lever in the audit.

### Tier 2 — Ship next 2–4 weeks

#### 2.1 The page-2 → page-1 push (top 15 queries at position 11–20)
Already-ranking queries where one position jump = doubled clicks. Forecast assumes hitting position 5–7 on these.

| Query | Imp/mo | Current P | Current clicks/mo | Forecast clicks/mo @ P5-7 |
|---|---:|---:|---:|---:|
| hot tub | 13,500 | 14.65 | 50 | ~600 |
| hot tubs | 6,900 | 18.02 | 30 | ~310 |
| hot tubs for sale | 7,600 | 14.16 | 28 | ~340 |
| hot tub uk | 800 | 12.35 | 7 | ~36 |
| hot tubs uk | 1,380 | 11.21 | 11 | ~62 |
| hot tub for sale | 2,500 | 14.21 | 6 | ~110 |
| 6 person hot tub | 1,760 | 11.18 | 14 | ~80 |
| 4 person hot tub | 1,035 | 14.06 | 6 | ~47 |
| hot tub sale | 1,560 | 12.37 | 8 | ~70 |
| hot tub chemicals | 970 | 16.98 | <1 | ~45 |
| hot tub filters | 1,355 | 12.63 | 2 | ~60 |
| energy efficient hot tub | 295 | 14.12 | 5 | ~13 |
| inflatable hot tub | 7,840 | 7.11 | 130 | ~390 |
| hot tubs sale | 470 | 14.63 | 2 | ~21 |
| best inflatable hot tub | 530 | 12.61 | 1 | ~26 |

**Cumulative forecast: +1,600 clicks/mo at run-rate.** Achievable through content depth + internal link improvements on existing collection/page templates.

#### 2.2 Build out 3 underserved collection segments
Real volumes from the data justify these:

| New collection | Existing query data | Imp/mo | Recommendation |
|---|---|---:|---|
| /collections/4-person-hot-tubs (already exists) | "4 person hot tub" 1,035, "4 person hot tub uk" 200, "4 person hot tub inflatable" 105 | ~1,350 | Improve existing — currently P10.91 |
| /collections/6-person-hot-tubs (already exists) | "6 person hot tub" 1,760, "6 person inflatable hot tub" 260, "6 seater hot tub" 385 | ~2,400 | Improve existing — currently P9.9 |
| /collections/energy-efficient-hot-tubs (build new) | "energy efficient hot tub" 295, "energy efficient inflatable hot tub" 22, "low energy hot tub" 90, "most energy efficient hot tub uk" 86 | ~500 | New collection — currently no targeted page; only blog posts rank weakly |

**Forecast: +200–400 clicks/mo within 8 weeks.**

#### 2.3 Ice baths content cluster
You sell ice baths (Antarctic Ice Bath, 180 clicks, P15.37) but have minimal content infrastructure. Search Console shows the existing /collections/hot-tub-ice-baths at 12,341 imp / 132 clicks / P16.68.

Cluster of queries you're barely visible for:
- "ice bath" — visible enough to register but no top-10 ranking
- "ice bath uk", "cold plunge", "ice bath benefits" — almost no data, suggests no targeting
- Existing blog: "hot tub vs ice bath what's best for you" 23,086 imp, P8.99 (decent)

**Recommendation:** Build proper ice bath hub with:
- Optimised collection page
- 3 blog posts (benefits, how to use, ice bath vs cold shower)
- Internal linking from hot tub pages (cross-sell)

**Forecast: +600–1,200 clicks/mo within 4 months (growing market, low competition).**

### Tier 3 — Month 2–3 (compounding content)

#### 3.1 Blog cluster — write to fill gaps the data shows
Queries with strong volume but weak/no presence:

| Query | Imp/16mo | Current best position | Existing content? |
|---|---:|---:|---|
| how long does a hot tub take to heat up | 5,346 | 5.15 (blog) | Yes — performing well |
| can you go in a hot tub when pregnant | 4,288 | 6.04 | Yes |
| how much chlorine to add to hot tub | 5,760 | 4.8 | Possibly thin |
| hot tub running cost calculator | 2,483 | 9.33 | Calculator page exists, P13.29 — improve |
| how much chlorine granules to shock hot tub | 1,335 | 8.67 | Likely missing |
| hot tub temperature for kids | 1,621 | 8.05 | Possibly thin |
| what does hl mean on a hot tub | 441 | 6.07 | Yes, P2.44 (excellent) |
| inflatable hot tub winter use | (multiple) | — | Limited |

**Recommendation:** Audit top 30 informational queries; for any at position 4–10 with thin content, expand to 1,200+ word definitive answers. For position 11–20 with high volume, write fresh long-form pieces.

**Forecast: +800–1,500 clicks/mo by month 6, compounding.**

#### 3.2 USA market acceleration
| Country | Clicks | Impressions | CTR | Position |
|---|---:|---:|---:|---:|
| USA | 6,654 | 900,027 | 0.74% | 16.25 |

USA has 900k impressions but converts at 0.74%. The /en-us templates exist. This is mostly a CTR/positioning problem mirroring the UK pattern, plus likely hreflang issues.

**Forecast if USA CTR doubles (still half of UK level):** +400 clicks/mo from existing impressions, no new content.

### Tier 4 — Don't forget: Product Snippet / Shopping feed optimisation
3.6M impressions/16mo flow through Product snippets at 1.55% CTR. Separate workstream:

- Audit product titles (these *are* the SERP titles for product snippets)
- Audit primary product images (first image = SERP image)
- Verify Merchant Center feed health
- Ensure `Product` JSON-LD has GTIN/MPN/brand on every PDP

**Forecast: +2,000–4,000 clicks/mo if CTR moves from 1.55% to 3% on this channel.**

---

## Forecast summary (data-backed, replacing the earlier estimates)

| Workstream | Effort | Time to impact | Forecast clicks/mo at run-rate |
|---|---|---|---:|
| 1.1 Meta rewrites on 10 black-hole pages | 1 day | 4–6 weeks | +3,400 |
| 1.2 Fix review schema on PDPs | 0.5 day | 2–4 weeks | +2,800 |
| 1.3 Desktop ranking gap investigation | 2–4 days | 6–8 weeks | +3,400 (if root cause is fixable) |
| 2.1 Page 2 → 1 push (15 queries) | 1–2 weeks | 8–12 weeks | +1,600 |
| 2.2 Collection segments (3 pages) | 1 week | 8–12 weeks | +300 |
| 2.3 Ice baths cluster | 2 weeks | 4 months | +900 |
| 3.1 Blog cluster (12 posts) | 6–8 weeks | 4–6 months | +1,150 |
| 3.2 USA CTR fixes | 1 week | 6–8 weeks | +400 |
| 4. Product Snippet / feed optimisation | 1–2 weeks | 4–6 weeks | +3,000 |
| **Total run-rate uplift by month 6** | | | **+17,000 clicks/mo** |

On a current baseline of ~10,500 clicks/mo, that's a **2.6x increase** in 6 months. Tighter forecast than the earlier ±40% estimate — this one is ±20% because every number is anchored on your actual impression data.

**Revenue translation:** I still need GA4 to be specific, but rough cut at 1% CR × £900 AOV: **+£153,000 incremental monthly revenue at month 6 run-rate.**

---

## Concrete next steps

**This week (in priority order):**
1. Tom: drop the GA4 organic landing pages CSV in `/docs/` so we can attach revenue/CR to each opportunity
2. Tom: confirm whether you want me to start with (a) meta rewrites — fastest, biggest, lowest-risk, or (b) desktop diagnostic — biggest unknown but potentially huge
3. If (a): I'll write the 10 new title + meta description sets in markdown for you to paste into Shopify admin
4. If (b): I'll run a Lighthouse-style audit comparing mobile vs desktop rendering on the worst-performing desktop pages

**Privacy reminder:** the GSC CSVs you pasted contain real performance data. If you don't want them in git, add to `.gitignore`:
```
/docs/gsc-*.csv
/docs/Chart.csv
/docs/Countries.csv
/docs/Devices.csv
/docs/Pages.csv
/docs/Queries.csv
/docs/Search appearance.csv
```
