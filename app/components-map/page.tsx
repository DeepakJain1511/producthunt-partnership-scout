import Link from "next/link";

export const metadata = { title: "Components Map — Partnership Scout" };

type Block = { title: string; tool: string; items: string[] };

const INPUT: Block[] = [
  { title: "Kavya (user)", tool: "Next.js UI on Vercel", items: ["Picks categories: Project Mgmt, HR Tech, Dev Productivity, Team Comms", "Describes her own product (async standups)", "Chooses how many products to list (5–15)", "Clicks “Scout this week's launches” (on demand)"] },
  { title: "Live external data", tool: "ProductHunt GraphQL API v2", items: ["Posts launched in the last 7 days, per topic, ordered by votes", "Name, tagline, description, topics, makers, upvotes, comment count, launch date", "Comments + replies for the top candidates (to count maker comments)"] },
];

const PROCESSING: Block[] = [
  { title: "1 · Fetch & merge", tool: "Vercel serverless route /api/scout", items: ["Query each mapped topic in parallel", "De-duplicate products that appear in several topics", "Keep the 20 strongest by upvotes as the candidate pool"] },
  { title: "2 · Measure responsiveness", tool: "ProductHunt API", items: ["Count comments and replies written by the product's makers", "Failures degrade gracefully (shown as “–”, never fake numbers)"] },
  { title: "3 · Score & rank", tool: "Deterministic code (lib/scoring.ts)", items: ["Score = 60% upvotes + 40% maker comments", "Both log-scaled vs. the best launch in the pool → 0–100", "Days since launch computed from the launch timestamp"] },
  { title: "4 · Reason about fit", tool: "Gemini Flash (only LLM used)", items: ["One batched call for the ranked products", "Returns a one-line description, a 2-sentence outreach angle and a fit rating", "Structured JSON schema → validated before display"] },
  { title: "5 · Persist", tool: "Supabase Postgres", items: ["Every scan saved to scout_runs (inputs + ranked results)", "Latest saved scan is shown on page load, so data exists even before a new scan"] },
];

const OUTPUT: Block[] = [
  { title: "Ranked outreach list", tool: "Next.js UI", items: ["Product name · founder · one-line description", "Upvote count · days since launch · maker comments", "Suggested outreach angle · fit badge · score"] },
  { title: "Export & history", tool: "Browser + Supabase", items: ["CSV export for Kavya's CRM / spreadsheet", "Recent scans list to revisit earlier results"] },
];

function Column({ heading, blocks, accent }: { heading: string; blocks: Block[]; accent: string }) {
  return (
    <div className="flex-1">
      <h2 className={`mb-3 rounded-lg px-3 py-2 text-center text-sm font-bold uppercase tracking-wider text-white ${accent}`}>{heading}</h2>
      <div className="space-y-3">
        {blocks.map((b) => (
          <div key={b.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold">{b.title}</h3>
            <p className="mb-2 text-xs font-medium text-indigo-700">{b.tool}</p>
            <ul className="list-disc space-y-1 pl-4 text-sm text-slate-600">
              {b.items.map((i) => <li key={i}>{i}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ComponentsMap() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-slate-900">
      <Link href="/" className="text-sm text-indigo-700 hover:underline">← Back to the scout</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Components Map</h1>
      <p className="mt-1 max-w-3xl text-slate-600">
        How data flows through the ProductHunt Partnership Scout: what goes in, what each component does with it, and what comes out.
      </p>

      <div className="mt-6 flex flex-col items-stretch gap-4 lg:flex-row">
        <Column heading="Input" blocks={INPUT} accent="bg-sky-600" />
        <div className="hidden items-center text-3xl text-slate-400 lg:flex">→</div>
        <Column heading="Processing" blocks={PROCESSING} accent="bg-indigo-600" />
        <div className="hidden items-center text-3xl text-slate-400 lg:flex">→</div>
        <Column heading="Output" blocks={OUTPUT} accent="bg-emerald-600" />
      </div>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">Tech stack</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500"><tr><th className="py-1">Layer</th><th>Tool</th><th>Role</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            <tr><td className="py-2">Frontend + API</td><td>Next.js on Vercel</td><td>UI and the /api/scout, /api/runs serverless routes</td></tr>
            <tr><td className="py-2">Live data</td><td>ProductHunt API v2</td><td>Launches, upvotes, makers, comments</td></tr>
            <tr><td className="py-2">AI</td><td>Gemini Flash</td><td>One-liners, outreach angles, fit rating (all AI tasks)</td></tr>
            <tr><td className="py-2">Database</td><td>Supabase Postgres</td><td>Saved scans, history, seed data</td></tr>
            <tr><td className="py-2">Source control</td><td>GitHub</td><td>Repository; Vercel deploys from it</td></tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
