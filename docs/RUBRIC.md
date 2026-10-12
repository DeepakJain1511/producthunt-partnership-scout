# Self-Assessment Rubric (100 points)

Built from the exam instructions and problem statement. Each row is checked against the deployed app.

| # | Criterion | Pts | How it is verified | Status |
|---|-----------|-----|--------------------|--------|
| 1 | **Live external data** — queries ProductHunt for launches in the last 7 days in chosen categories | 15 | Run a scan; products carry launch dates ≤ 7 days old and change day to day | |
| 2 | **Works with data at submission** — seeded scan visible on first load | 5 | Open the URL in a fresh browser: a ranked list is already shown | |
| 3 | **Scoring by upvotes + maker comments** — documented, deterministic, explained in UI | 15 | Score formula shown under the table; `lib/scoring.ts` | |
| 4 | **Output has all 6 required fields** — name, founder, one-line description, upvotes, days since launch, outreach angle | 15 | Every table row shows all six | |
| 5 | **Ranked list** — sorted by score, descending | 5 | Scores monotonically decrease down the table | |
| 6 | **Outreach angle quality** — specific to the product, references how Kavya's product complements it | 10 | Read 5 angles: none generic, all name a concrete integration/co-marketing idea | |
| 7 | **Gemini Flash used for all AI tasks; no Claude API** | 5 | `lib/gemini.ts` calls Gemini only; no Anthropic dependency in `package.json` | |
| 8 | **Deployed on Vercel with a working public URL** | 10 | URL opens without login; scan works in production | |
| 9 | **GitHub repository** with clear README and no committed secrets | 5 | Repo link; `.env*` ignored | |
| 10 | **Components Map** — input, processing, output, tools | 5 | `/components-map` page and `docs/COMPONENTS_MAP.md` | |
| 11 | **On demand** — Kavya triggers it with one click | 2 | “Scout this week's launches” button | |
| 12 | **Robustness & honesty** — error states, no fake numbers, AI output labelled | 5 | Disconnect a key → readable warning, app still usable | |
| 13 | **Usability** — works on laptop and phone, CSV export | 3 | Resize the window; export a CSV | |
| | **Total** | **100** | | |

## Test log
Filled in after deployment — see README “Verification”.
