import { slugsFor } from "./categories";
import { enrichWithGemini, type GeminiOutput } from "./gemini";
import { REDACTED, countMakerComments, fetchRecentPosts, type PHPost } from "./producthunt";
import { computeScores, daysSince } from "./scoring";
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

  // 2. Measure maker comments for the strongest candidates (by upvotes)
  const pool = all.sort((a, b) => b.votesCount - a.votesCount).slice(0, CANDIDATE_POOL);
  await Promise.all(
    pool.map(async (p) => {
      p.makerComments = await countMakerComments(p);
    })
  );
  if (pool.some((p) => p.makerComments === null)) {
    warnings.push("Maker comments could not be measured for some products; they were scored as 0.");
  }

  // 3. Score and rank
  const scorable = pool.map((p) => ({ post: p, votesCount: p.votesCount, makerComments: p.makerComments ?? 0 }));
  const scores = computeScores(scorable);
  const now = Date.now();
  const ranked = scorable
    .map((s, i) => ({ ...s, score: scores[i] }))
    .sort((a, b) => b.score - a.score || b.votesCount - a.votesCount)
    .slice(0, limit);

  // 4. Gemini Flash: one-liner + outreach angle for each product
  let ai = new Map<string, GeminiOutput>();
  let aiOk = true;
  try {
    const out = await enrichWithGemini(
      myProduct,
      ranked.map(({ post, makerComments }) => ({
        id: post.id,
        name: post.name,
        tagline: post.tagline,
        description: (post.description ?? "").slice(0, 500),
        topics: post.topics,
        upvotes: post.votesCount,
        makerComments,
        daysSinceLaunch: daysSince(post.createdAt, now),
      }))
    );
    ai = new Map(out.map((o) => [String(o.id), o]));
  } catch (e) {
    aiOk = false;
    warnings.push(`Gemini enrichment failed, showing ProductHunt taglines instead: ${(e as Error).message}`);
  }

  const results: ScoutProduct[] = ranked.map(({ post, score, makerComments }, idx) => {
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
      makerComments,
      totalComments: post.commentsCount,
      daysSinceLaunch: daysSince(post.createdAt, now),
      launchedAt: post.createdAt,
      score,
      outreachAngle: g?.outreachAngle ?? "AI suggestion unavailable — retry the scan.",
      fit: g?.fit ?? "medium",
      topics: post.topics,
      url: post.url,
      aiGenerated: aiOk && !!g,
    };
  });

  return { scanned: all.length, results, warnings };
}
