# How to Export GSC + GA4 Data for SEO Forecasting

**Goal:** Pull 3 CSVs so we can re-rank the SEO opportunity list using real WaveSpas data instead of industry estimates.

**Time:** ~15 minutes total
**Cost:** £0
**Files to produce:**
1. `/docs/gsc-uk-queries.csv` — every search query that showed your site in the UK, last 12 months
2. `/docs/gsc-uk-pages.csv` — every landing page that received UK organic impressions, last 12 months
3. `/docs/ga4-organic-landing-pages.csv` — top organic landing pages with sessions + conversions

---

## Export 1 — Google Search Console: UK Queries

**Direct link:** https://search.google.com/search-console

### Step by step

1. Open https://search.google.com/search-console
2. **Top-left dropdown** → select the WaveSpas property
   - If you have multiple, prefer the **Domain property** (looks like `sc-domain:wavespas.com`) over the URL-prefix one (`https://wavespas.com/`). Domain captures all subdomains + http/https.
   - If you only see URL-prefix properties, use the `https://wavespas.com/` one.
3. **Left sidebar** → `Performance` → `Search results`
4. At the top of the page, you'll see filter chips. Set them to:
   - **Search type:** Web (default)
   - **Date:** click the date chip → "Last 12 months" → Apply
   - **Country:** click `+ New` → Country → United Kingdom → Apply
5. Make sure all 4 metric tiles are toggled ON (blue): **Total clicks**, **Total impressions**, **Average CTR**, **Average position**
6. Scroll down to the table → click the **Queries** tab (it's the default tab)
7. **Top-right of the table** → click **Export** → choose **Google Sheets** (easiest) or **Download CSV** or **Excel**
   - Note: GSC's web UI caps the export at **1,000 rows**. That's fine for the trial.
   - If you need more later, we can paginate via the API — flag it.
8. Save the file as `gsc-uk-queries.csv` in `/docs/` of this repo

✅ **You should have:** a CSV with columns `Query`, `Clicks`, `Impressions`, `CTR`, `Position`

---

## Export 2 — Google Search Console: UK Pages

Same screen as Export 1 — just switch the tab.

### Step by step

1. Stay on the same Search Console screen from Export 1 (filters still applied: Last 12 months + Country = UK)
2. In the table at the bottom of the page → click the **Pages** tab (next to Queries)
3. **Top-right of the table** → **Export** → CSV / Sheets
4. Save as `gsc-uk-pages.csv` in `/docs/`

✅ **You should have:** a CSV with columns `Page`, `Clicks`, `Impressions`, `CTR`, `Position`

**What I'll do with these two files:**
- Identify queries where you're at position 11–20 (one position move = ~2× clicks → the *real* low-hanging fruit)
- Find pages with high impressions but low CTR (title/meta description fix opportunities)
- Find pages with no clicks at all (indexing or relevance issues)
- Re-rank every opportunity in the trial plan by **actual** delta-to-position-1 value

---

## Export 3 — GA4: Organic Landing Pages + Conversions

**Direct link:** https://analytics.google.com

### Step by step

1. Open https://analytics.google.com
2. **Top-left** → property selector → select the WaveSpas GA4 property
3. **Left sidebar** → `Reports` → `Acquisition` → `Traffic acquisition`
4. At the top of the report, change the date range (top-right) to **Last 12 months**
5. The default primary dimension is `Session source / medium`. **Add a filter** to isolate organic:
   - Above the table click the **`+` Add filter** button (or sometimes shown as "Add comparison")
   - Dimension: `Session source / medium`
   - Match type: `exactly matches`
   - Value: `google / organic`
   - Apply
6. **Change the primary dimension** to landing page:
   - Above the chart, click the pencil/edit icon next to `Session source / medium` (or use the dropdown above the first column of the table)
   - Search for and select **`Landing page + query string`** (or `Landing page` if that's not available)
7. Make sure these columns are visible (scroll the table right):
   - `Sessions`
   - `Engaged sessions`
   - `Engagement rate`
   - `Conversions` (or `Key events` in newer GA4 — same thing)
   - `Total revenue` (if ecommerce is set up)
8. **Top-right of the table** → click `Share this report` icon (it looks like a share/arrow) → `Download file` → choose **CSV**
   - Alternative: click the `Export` / share icon → `Download CSV`. UI wording shifts between GA4 versions.
9. Save as `ga4-organic-landing-pages.csv` in `/docs/`

✅ **You should have:** a CSV with columns including `Landing page + query string`, `Sessions`, `Engaged sessions`, `Conversions`, `Total revenue`

### If you don't see Conversions / Total revenue

Either ecommerce isn't wired up properly to GA4, or no key events are flagged. That's a separate (important) finding — flag it back to me and we'll investigate; revenue tracking is a prerequisite for proper SEO ROI measurement.

---

## Optional but useful — also share these

| Item | Where to find it | Why I want it |
|---|---|---|
| UK AOV (last 12 months) | Shopify admin → Analytics → Reports → "Average order value" → filter to UK | Translates click forecasts into £ revenue forecasts |
| Top 10 UK best-sellers by revenue | Shopify admin → Analytics → Reports → "Sales by product" → filter UK | Tells us which products' collection homes to prioritise |
| Current monthly Google Ads spend (UK) | Google Ads → Campaigns → filter UK | Identifies queries you're paying for that we could rank organically |
| Google Ads → Search Terms report (UK, last 90d) | Google Ads → Campaigns → click a campaign → `Insights and reports` → `Search terms` → download | Real high-intent queries with conversion data — gold for SEO |

---

## How to deliver them to me

Once you have the CSVs:
1. Drop them in `/Users/tomjeffrey/Documents/GitHub/WaveSpas/docs/`
2. Tell me in chat: *"Files are in /docs"*
3. I'll read them and rewrite `seo-opportunities-uk-hot-tubs.md` with real-data prioritisation

**Privacy note:** these CSVs stay local in the repo. If you don't want them in git, add to `.gitignore`:
```
/docs/gsc-*.csv
/docs/ga4-*.csv
```

---

## Troubleshooting

**"I don't have GSC access"** → Get whoever owns the wavespas.com Google Workspace / Search Console to add you as a User (Settings → Users and permissions → Add user → role: "Restricted" is enough for exports).

**"GSC says no data for Country = United Kingdom"** → Either the property is brand new (no data yet) or the property type is wrong. Try the Domain property if you're on URL-prefix or vice versa.

**"GA4 export button is greyed out"** → Likely a permissions issue. You need at least the "Analyst" role on the GA4 property. Property admin: Admin → Property → Property Access Management → Add user.

**"I see Universal Analytics, not GA4"** → Universal Analytics was sunset July 2024. If you're still only on UA, that's a major blind spot — we need to confirm GA4 is properly installed before forecasting.

**"Conversions column is empty in GA4"** → Either no key events are configured (Admin → Events → mark `purchase` as key event), or ecommerce isn't wired up via the Shopify GA4 integration. Flag this — we'll fix it.
