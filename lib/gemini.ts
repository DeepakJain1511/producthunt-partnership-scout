import type { Fit } from "./types";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export interface GeminiInput {
  id: string;
  name: string;
  tagline: string;
  description: string;
  topics: string[];
  upvotes: number;
  makerComments: number;
  daysSinceLaunch: number;
}

export interface GeminiOutput {
  id: string;
  oneLiner: string;
  outreachAngle: string;
  fit: Fit;
}

const SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      id: { type: "STRING" },
      oneLiner: { type: "STRING" },
      outreachAngle: { type: "STRING" },
      fit: { type: "STRING", enum: ["high", "medium", "low"] },
    },
    required: ["id", "oneLiner", "outreachAngle", "fit"],
  },
};

export async function enrichWithGemini(myProduct: string, products: GeminiInput[]): Promise<GeminiOutput[]> {
  const prompt = `You are a partnerships strategist. Kavya leads partnerships at a B2B SaaS company. Her product:
"""${myProduct}"""

Below are tools that launched on ProductHunt in the last 7 days (JSON). For EACH product return:
- oneLiner: a plain-English one-line description of what it does (max 18 words, no hype, no emojis).
- outreachAngle: a 2-sentence suggested outreach angle for Kavya's first message to the founder. It must name a CONCRETE way the two products complement each other (integration, co-marketing, bundle, referral, shared audience) and reference something specific about THEIR product. Do not be generic. Do not claim facts that are not in the data.
- fit: "high" if the audiences clearly overlap and the products are complementary, "medium" if plausible, "low" if weak or competitive.
Use the product id exactly as given. Return a JSON array with one object per product.

PRODUCTS:
${JSON.stringify(products)}`;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY || "", "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5, responseMimeType: "application/json", responseSchema: SCHEMA },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const parts: { text?: string; thought?: boolean }[] = json.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter((p) => p.text && !p.thought).map((p) => p.text).join("");
  const parsed = JSON.parse(text) as GeminiOutput[];
  if (!Array.isArray(parsed)) throw new Error("Gemini returned non-array JSON");
  return parsed;
}
