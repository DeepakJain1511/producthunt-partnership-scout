import { slugsFor } from "./categories";
import { enrichWithGemini, type GeminiOutput } from "./gemini";
import { REDACTED, countMakerComments, fetchRecentPosts, type PHPost } from "./producthunt";
import { computeScores, daysSince } from "./scoring";
import { createHash } from "crypto";
import { db } from "./supabase";
import type { ScoutProduct } from "./types";

const WINDOW_DAYS = 7;
const CANDIDATE_POOL = 20; // products whose maker comments we measure
const MAX_RESULTS = 15;

export interface ScoutOutput {
  scanned: number;
  results: ScoutProduct[];
  warnings: string[];
}

export async function runScout(categoryKeys: string[], myProduct: string, topN = 10): Promise<ScoutOutput> {
  const warnings: string[] = [];
  const t0 = Date.now();
  const lap = (l: string) => console.log(`[scout] ${l} +${Date.now() - t0}ms`);
  const slugs = slugsFor(categoryKeys);
  if (slugs.length === 0) throw new Error("No valid categories selected");
  const limit = Math.min(Math.max(topN, 1), MAX_RESULTS);

  // 1. Live ProductHunt data — launches in the last 7 days, per topic, in parallel
  const settled = await Promise.allSettled(slugs.map((s) => fetchRecentPosts(s, WINDOW_DAYS)));
  const byId = new Map<string, PHPost>();
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") r.value.forEach((p) => byId.set(p.id, p));
    else warnings.push(`Could not load topic "${slugs[i]}": ${r.reason?.message ?? "error"}`);
  });
  if (byId.size === 0) throw new Error(warnings[0] ?? "No launches found for the selected categories");
  const all = [...byId.values()];

  lap("fetched posts");
  // 2. Measure maker comments for the strongest candidates (by upvotes)
  const pool = all.sort((a, b) => b.votesCount - a.votesCount).slice(0, CANDIDATE_POOL);
  await Promise.all(
    pool.map(async (p) => {
      p.makerComments = await countMakerComments(p);
    })
  );
  lap("measured maker comments");
  const unmeasured = pool.filter((p) => p.makerComments === null).length;
  if (unmeasured > 0) {
    warnings.push(`${unmeasured} of the top ${pool.length} launches list no public makers (usually big-company launches), so their maker comments show "–" and score on upvotes only.`);
  }

  // 3. Score and rank
  const scorable = pool.map((p) => ({ post: p, votesCount: p.votesCount, makerComments: p.makerComments ?? 0 }));
  const scores = computeScores(scorable);
  const now = Date.now();
  const ranked = scorable
    .map((s, i) => ({ ...s, score: scores[i] }))
    .sort((a, b) => b.score - a.score || b.votesCount - a.votesCount);

  // 4. Gemini Flash: one-liner + outreach angle for each product
  let ai = new Map<string, GeminiOutput>();
  // Cache Gemini output per (product, Kavya's product text): repeat scans cost no AI quota.
  const phash = createHash("sha1").update(myProduct.trim().toLowerCase()).digest("hex").slice(0, 12);
  const keyOf = (id: string) => `${phash}:${id}`;
  try {
    const { data: hits } = await db().from("ai_cache").select("cache_key,data").in("cache_key", ranked.map((r) => keyOf(r.post.id)));
    for (const h of hits ?? []) ai.set(String(h.cache_key).split(":")[1], h.data as GeminiOutput);
  } catch {}
  const todo = ranked.filter((r) => !ai.has(r.post.id));
  try {
    if (todo.length === 0) throw new Error("__cached__");
    const out = await enrichWithGemini(
      myProduct,
      todo.map(({ post, makerComments }) => ({
        id: post.id,
        name: post.name,
        tagline: post.tagline,
        description: (post.description ?? "").slice(0, 350),
        topics: post.topics,
        upvotes: post.votesCount,
        makerComments,
        daysSinceLaunch: daysSince(post.createdAt, now),
      }))
    );
    for (const o of out) ai.set(String(o.id), o);
    try {
      await db().from("ai_cache").upsert(out.map((o) => ({ cache_key: keyOf(String(o.id)), data: o })));
    } catch {}
  } catch (e) {
    if ((e as Error).message !== "__cached__") {
      warnings.push(`Gemini enrichment failed for some products, showing ProductHunt taglines instead: ${(e as Error).message}`);
    }
  }

  // Relevance filter: keep the highest-scoring products that are not "low" fit; weak fits only
  // fill remaining slots. The order is always by score (upvotes + maker comments).
  const fitOf = (id: string) => ai.get(id)?.fit ?? "medium";
  const relevant = ranked.filter((r) => fitOf(r.post.id) !== "low");
  const weak = ranked.filter((r) => fitOf(r.post.id) === "low");
  const selected = [...relevant, ...weak.slice(0, Math.max(0, limit - relevant.length))]
    .slice(0, limit)
    .sort((a, b) => b.score - a.score || b.votesCount - a.votesCount);

  lap("gemini done");
  const results: ScoutProduct[] = selected.map(({ post, score }, idx) => {
    const g = ai.get(post.id);
    const maker = post.makers.find((m) => m.name && m.name !== REDACTED);
    const hunter = post.hunter && post.hunter !== REDACTED ? post.hunter : null;
    return {
      rank: idx + 1,
      id: post.id,
      name: post.name,
      founder: maker?.name ?? hunter ?? "Not public",
      founderRole: maker ? "maker" : "hunter",
      oneLiner: g?.oneLiner ?? post.tagline,
      upvotes: post.votesCount,
      makerComments: post.makerComments,
      totalComments: post.commentsCount,
      daysSinceLaunch: daysSince(post.createdAt, now),
      launchedAt: post.createdAt,
      score,
      outreachAngle: g?.outreachAngle ?? "AI suggestion unavailable — retry the scan.",
      fit: g?.fit ?? "medium",
      topics: post.topics,
      url: post.url,
      aiGenerated: !!g,
    };
  });

  return { scanned: all.length, results, warnings };
}
