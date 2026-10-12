"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, DEFAULT_MY_PRODUCT } from "@/lib/categories";
import type { ScoutProduct, ScoutRun } from "@/lib/types";

const FIT_STYLE: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-200 text-slate-700",
};

function csvEscape(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: ScoutProduct[]) {
  const head = ["Rank", "Product", "Founder", "One-line description", "Upvotes", "Maker comments", "Days since launch", "Score", "Fit", "Outreach angle", "URL"];
  const body = rows.map((r) =>
    [r.rank, r.name, r.founder, r.oneLiner, r.upvotes, r.makerComments ?? "n/a", r.daysSinceLaunch, r.score, r.fit, r.outreachAngle, r.url].map(csvEscape).join(",")
  );
  return [head.join(","), ...body].join("\n");
}

export default function Home() {
  const [categories, setCategories] = useState<string[]>(CATEGORIES.slice(0, 4).map((c) => c.key));
  const [myProduct, setMyProduct] = useState(DEFAULT_MY_PRODUCT);
  const [topN, setTopN] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [results, setResults] = useState<ScoutProduct[]>([]);
  const [meta, setMeta] = useState<{ when: string; scanned: number; live: boolean } | null>(null);
  const [history, setHistory] = useState<ScoutRun[]>([]);
  const [hideLow, setHideLow] = useState(false);

  // Show the most recent saved run immediately so the page is never empty.
  useEffect(() => {
    fetch("/api/runs")
      .then((r) => r.json())
      .then((d) => {
        const runs: ScoutRun[] = d.runs ?? [];
        setHistory(runs);
        if (runs[0]) {
          setResults(runs[0].results);
          setMeta({ when: runs[0].created_at, scanned: runs[0].scanned_count, live: false });
        }
      })
      .catch(() => {});
  }, []);

  async function scout() {
    setLoading(true);
    setError(null);
    setWarnings([]);
    try {
      const res = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories, myProduct, topN }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Scan failed");
      setResults(d.results);
      setWarnings(d.warnings ?? []);
      setMeta({ when: d.generatedAt, scanned: d.scanned, live: true });
      fetch("/api/runs").then((r) => r.json()).then((x) => setHistory(x.runs ?? [])).catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    const blob = new Blob([toCsv(results)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `partnership-outreach-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const shown = useMemo(() => (hideLow ? results.filter((r) => r.fit !== "low") : results), [results, hideLow]);
  const toggle = (k: string) => setCategories((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-slate-900">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ProductHunt Partnership Scout</h1>
          <p className="mt-1 max-w-2xl text-slate-600">
            Finds tools launched in the last 7 days, ranks them by upvotes and maker responsiveness, and drafts an outreach angle for each founder — in seconds instead of 30–40 minutes.
          </p>
        </div>
      </header>

      <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">1 · Categories to scout</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => toggle(c.key)}
                aria-pressed={categories.includes(c.key)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  categories.includes(c.key) ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white hover:bg-slate-50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <label className="mt-5 block text-sm font-semibold uppercase tracking-wide text-slate-500">
            Products to list: {topN}
            <input type="range" min={5} max={15} value={topN} onChange={(e) => setTopN(+e.target.value)} className="mt-2 block w-full" />
          </label>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">2 · Your product (used for outreach angles)</h2>
          <textarea
            value={myProduct}
            onChange={(e) => setMyProduct(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button
            onClick={scout}
            disabled={loading || categories.length === 0 || myProduct.trim().length < 10}
            className="mt-3 w-full rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Scanning ProductHunt & drafting angles… (~20s)" : "Scout this week's launches"}
          </button>
        </div>
      </section>

      {error && <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
      {warnings.map((w) => (
        <div key={w} className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{w}</div>
      ))}

      {results.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Ranked outreach list</h2>
              {meta && (
                <p className="text-sm text-slate-500">
                  {meta.live ? "Live scan" : "Last saved scan"} · {new Date(meta.when).toLocaleString()} · {meta.scanned} launches reviewed
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={hideLow} onChange={(e) => setHideLow(e.target.checked)} /> Hide low-fit
              </label>
              <button onClick={downloadCsv} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
                Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Founder</th>
                  <th className="p-3 text-right">Upvotes</th>
                  <th className="p-3 text-right" title="Comments and replies written by the product's makers">Maker comments</th>
                  <th className="p-3 text-right">Days since launch</th>
                  <th className="p-3 text-right">Score</th>
                  <th className="p-3">Suggested outreach angle</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <td className="p-3 font-semibold text-slate-400">{r.rank}</td>
                    <td className="p-3">
                      <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold text-indigo-700 hover:underline">{r.name}</a>
                      <p className="mt-0.5 max-w-xs text-slate-600">{r.oneLiner}</p>
                      <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${FIT_STYLE[r.fit]}`}>{r.fit} fit</span>
                    </td>
                    <td className="p-3">
                      {r.founder}
                      {r.founderRole === "hunter" && <span className="block text-xs text-slate-400">(hunter)</span>}
                    </td>
                    <td className="p-3 text-right tabular-nums">{r.upvotes}</td>
                    <td className="p-3 text-right tabular-nums">{r.makerComments ?? "–"}</td>
                    <td className="p-3 text-right tabular-nums">{r.daysSinceLaunch}</td>
                    <td className="p-3 text-right font-semibold tabular-nums">{r.score}</td>
                    <td className="max-w-md p-3 text-slate-700">{r.outreachAngle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Score = 60% upvotes + 40% maker comments, both log-scaled against the strongest launch in the pool (0–100). Outreach angles are AI-generated by Gemini Flash — review before sending.
          </p>
        </section>
      )}

      {history.length > 1 && (
        <section className="mt-10">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Recent scans</h2>
          <ul className="space-y-1 text-sm">
            {history.slice(0, 5).map((h) => (
              <li key={h.id}>
                <button
                  className="text-indigo-700 hover:underline"
                  onClick={() => {
                    setResults(h.results);
                    setMeta({ when: h.created_at, scanned: h.scanned_count, live: false });
                  }}
                >
                  {new Date(h.created_at).toLocaleString()}
                </button>{" "}
                <span className="text-slate-500">· {h.categories.join(", ")} · {h.result_count} products</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
