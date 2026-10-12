# Self-Assessment Rubric (100 points)

Built from the exam instructions and problem statement. Each row is checked against the deployed app.

| # | Criterion | Pts | How it is verified | Status |
|---|-----------|-----|--------------------|--------|
| 1 | **Live external data** — queries ProductHunt for launches in the last 7 days in chosen categories | 15 | Run a scan; products carry launch dates ≤ 7 days old and change day to day | ✅ 113 launches reviewed live; all ≤ 7 days old |
| 2 | **Works with data at submission** — seeded scan visible on first load | 5 | Open the URL in a fresh browser: a ranked list is already shown | ✅ seed scan saved in Supabase, shown on first load |
| 3 | **Scoring by upvotes + maker comments** — documented, deterministic, explained in UI | 15 | Score formula shown under the table; `lib/scoring.ts` | ✅ 60/40 log-scaled score; maker comments counted via userId (e.g. Velozity 27, Rill 19) |
| 4 | **Output has all 6 required fields** — name, founder, one-line description, upvotes, days since launch, outreach angle | 15 | Every table row shows all six | ✅ all six fields in every row (plus maker comments, score, fit) |
| 5 | **Ranked list** — sorted by score, descending | 5 | Scores monotonically decrease down the table | ✅ sorted by score, descending |
| 6 | **Outreach angle quality** — specific to the product, references how Kavya's product complements it | 10 | Read 5 angles: none generic, all name a concrete integration/co-marketing idea | ✅ proposals only, each names a concrete integration/co-marketing idea; Gemini forbidden from inventing facts |
| 7 | **Gemini Flash used for all AI tasks; no Claude API** | 5 | `lib/gemini.ts` calls Gemini only; no Anthropic dependency in `package.json` | ✅ Gemini Flash only (model fallback chain); no Anthropic dependency |
| 8 | **Deployed on Vercel with a working public URL** | 10 | URL opens without login; scan works in production | ✅ https://partnership-scout.vercel.app (public) |
| 9 | **GitHub repository** with clear README and no committed secrets | 5 | Repo link; `.env*` ignored | ✅ public repo; only .env.example tracked |
| 10 | **Components Map** — input, processing, output, tools | 5 | `docs/Components-Map.pdf` | ✅ separate PDF with input / processing / output breakdown |
| 11 | **On demand** — Kavya triggers it with one click | 2 | “Scout this week's launches” button | ✅ one-click scan, ~25 s (≈3 s when cached) |
| 12 | **Robustness & honesty** — error states, no fake numbers, AI output labelled | 5 | Disconnect a key → readable warning, app still usable | ✅ Gemini outage → taglines + warning; no-public-makers shown as “–”; quota → next Flash model |
| 13 | **Usability** — works on laptop and phone, CSV export | 3 | Resize the window; export a CSV | ✅ checked at 375 px width; CSV export |
| | **Total** | **100** | | |

## Test log
Verified on production (2026-10-12): scan of 4 categories returned 113 launches, ranked top 10 with real maker-comment counts; repeat scan served from cache in ~3 s; page checked on desktop and 375 px mobile.

**Known limits (disclosed):**
- ProductHunt API: ~6,250 complexity points per 15 min, so very rapid repeated scans can be rate-limited (the last saved scan is still shown).
- Gemini free tier: ~20 requests/day/model; the app falls back through six Flash models and caches AI output.
- Launches with no public makers (often big companies) show “–” for maker comments and are scored on upvotes only.
- Maker comments are measured on the first 20 comments (+5 replies each) per product.
