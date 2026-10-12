export type Fit = "high" | "medium" | "low";

export interface ScoutProduct {
  rank: number;
  id: string;
  name: string;
  founder: string;
  founderRole: "maker" | "hunter";
  oneLiner: string;
  upvotes: number;
  makerComments: number | null; // null = product lists no public makers
  totalComments: number;
  daysSinceLaunch: number;
  launchedAt: string;
  score: number;
  outreachAngle: string;
  fit: Fit;
  topics: string[];
  url: string;
  aiGenerated: boolean;
}

export interface ScoutRun {
  id: string;
  created_at: string;
  categories: string[];
  my_product: string;
  window_days: number;
  scanned_count: number;
  result_count: number;
  results: ScoutProduct[];
  is_seed: boolean;
}

export interface ScoutRequest {
  categories: string[];
  myProduct: string;
  topN?: number;
}
