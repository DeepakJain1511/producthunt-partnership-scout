import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";


export async function GET() {
  const { data, error } = await db()
    .from("scout_runs")
    .select("id, created_at, categories, my_product, window_days, scanned_count, result_count, results, is_seed")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ runs: data });
}
