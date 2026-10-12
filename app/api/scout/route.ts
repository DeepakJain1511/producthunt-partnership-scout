import { NextResponse } from "next/server";
import { runScout } from "@/lib/scout";
import { db } from "@/lib/supabase";
import type { ScoutRequest } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  let body: ScoutRequest & { seed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const myProduct = (body.myProduct ?? "").trim();
  if (!Array.isArray(body.categories) || body.categories.length === 0) {
    return NextResponse.json({ error: "Select at least one category" }, { status: 400 });
  }
  if (myProduct.length < 10) {
    return NextResponse.json({ error: "Describe your product (at least 10 characters)" }, { status: 400 });
  }

  try {
    const { scanned, results, warnings } = await runScout(body.categories, myProduct.slice(0, 1000), body.topN ?? 10);

    // Persist the run; a storage failure must not hide results from the user.
    let runId: string | null = null;
    const { data, error } = await db()
      .from("scout_runs")
      .insert({
        categories: body.categories,
        my_product: myProduct.slice(0, 1000),
        window_days: 7,
        scanned_count: scanned,
        result_count: results.length,
        results,
        is_seed: false,
      })
      .select("id")
      .single();
    if (error) warnings.push(`Could not save run history: ${error.message}`);
    else runId = data.id;

    return NextResponse.json({ runId, scanned, results, warnings, generatedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
