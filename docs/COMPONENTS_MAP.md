# Components Map — ProductHunt Partnership Scout

**Problem:** Kavya (partnerships lead, async-standup SaaS) spends 30–40 min every morning scanning ProductHunt for newly launched tools to partner with, and still misses some. This tool delivers a ranked, AI-annotated outreach list on demand.

```
   INPUT                        PROCESSING                                         OUTPUT
┌───────────────┐   ┌─────────────────────────────────────────────┐   ┌──────────────────────────┐
│ Kavya (UI)    │   │ 1 FETCH      ProductHunt API (live, last 7d)│   │ Ranked outreach list     │
│ • categories  │──▶│ 2 MEASURE    maker comments + replies       │──▶│ • product name           │
│ • her product │   │ 3 SCORE      60% upvotes + 40% maker cmts   │   │ • founder name           │
│ • list size   │   │ 4 REASON     Gemini Flash → one-liner,      │   │ • one-line description   │
│ • "Scout" btn │   │              outreach angle, fit rating     │   │ • upvote count           │
├───────────────┤   │ 5 PERSIST    Supabase (scan history)        │   │ • days since launch      │
│ ProductHunt   │   └─────────────────────────────────────────────┘   │ • outreach angle         │
│ API v2 (live) │         runs inside a Vercel serverless route        │ • CSV export + history   │
└───────────────┘                                                      └──────────────────────────┘
```

## Components

| # | Component | Technology | Input | Processing | Output |
|---|-----------|------------|-------|------------|--------|
| 1 | Scout UI | Next.js (React) on Vercel | Categories, Kavya's product description, list size | Validates input, calls `/api/scout` | Ranked table, CSV, history |
| 2 | ProductHunt client | ProductHunt GraphQL API v2 | Topic slugs, 7-day window | Fetches launches ordered by votes; de-dupes across topics; fetches comments/replies for top 20 | Raw posts with upvotes, makers, comment data |
| 3 | Scoring engine | TypeScript (`lib/scoring.ts`) | Upvotes, maker-comment counts | `score = 100 × (0.6·log(1+votes)/log(1+maxVotes) + 0.4·log(1+makerComments)/log(1+maxMakerComments))` | Score 0–100 and rank |
| 4 | AI analyst | **Gemini Flash** (only LLM used) | Kavya's product + top-N product data | One batched call, JSON-schema output | One-liner, 2-sentence outreach angle, fit (high/medium/low) |
| 5 | Database | Supabase Postgres | Completed scan | Insert into `scout_runs` | History; latest scan shown on load (seed data) |
| 6 | Hosting / CI | GitHub → Vercel | Git push | Build & deploy | Public URL |

## Design decisions

- **Why log-scaling?** A single viral launch (500+ upvotes) would otherwise crush everyone else. Log-scaling keeps mid-sized launches comparable.
- **Why maker comments?** The brief treats them as a signal of a responsive team. We count comments *and replies* written by the product's makers.
- **Why one batched Gemini call?** Cheaper, faster (~5 s) and lets the model compare products consistently.
- **Failure handling:** if Gemini fails, ProductHunt taglines are shown with a warning; if maker comments can't be measured, they show “–” instead of a fake number; if one topic fails, others still load.
- **Human in the loop:** outreach angles are suggestions; Kavya reviews before sending anything.
