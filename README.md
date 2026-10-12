# ProductHunt Partnership Scout

An AI-powered partnership scout for B2B SaaS teams. It queries ProductHunt for tools launched in the **last 7 days** in chosen categories, scores each by **upvotes and maker comments**, and uses **Gemini Flash** to produce a ranked outreach list with a one-line description and a tailored outreach angle for every founder.

Built for the Mesa Cohort C4 "AI and its Applications" final exam — Problem 4 (Kavya's partnership scouting).

- **Live app:** _see deployment URL in the submission_
- **Components Map:** [docs/Components-Map.pdf](docs/Components-Map.pdf) (5-page detailed) · [one-page version](docs/Components-Map-One-Page.pdf)
- **Grading rubric:** [docs/RUBRIC.md](docs/RUBRIC.md)

## Output per product
Product name · founder · one-line description · upvote count · maker comments · days since launch · score · suggested outreach angle · fit rating. Export to CSV.

## Stack
Next.js (Vercel) · ProductHunt GraphQL API v2 · Gemini Flash (all AI tasks) · Supabase Postgres · GitHub

## How the score works
`score = 100 × (0.6 · log(1+upvotes)/log(1+maxUpvotes) + 0.4 · log(1+makerComments)/log(1+maxMakerComments))`
Maker comments = comments and replies written by the product's makers (a responsiveness signal). Log-scaling stops one viral launch from flattening everyone else.

## Run locally
```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

| Variable | Purpose |
|---|---|
| `PRODUCTHUNT_TOKEN` | ProductHunt developer token (needed to see maker identities) |
| `PRODUCTHUNT_CLIENT_ID` / `PRODUCTHUNT_CLIENT_SECRET` | Fallback client-credentials auth |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Gemini Flash (default `gemini-3.6-flash`) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Scan history (table `scout_runs`) |

## Notes
- AI-written outreach angles are suggestions — review before sending.
- Supabase table has RLS enabled with public read/insert policies (anonymous demo app, no personal data stored).
