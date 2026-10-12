// Partnership score (0–100):
//   60% upvotes (traction)  +  40% maker comments (team responsiveness)
// Both signals are log-scaled and normalised against the best product in the current
// candidate pool, so one viral launch does not flatten everyone else to zero.
export const WEIGHT_UPVOTES = 0.6;
export const WEIGHT_MAKER_COMMENTS = 0.4;

export interface Scorable {
  votesCount: number;
  makerComments: number;
}

export function computeScores<T extends Scorable>(items: T[]): number[] {
  const maxV = Math.max(1, ...items.map((i) => i.votesCount));
  const maxC = Math.max(1, ...items.map((i) => i.makerComments));
  return items.map((i) => {
    const v = Math.log1p(i.votesCount) / Math.log1p(maxV);
    const c = Math.log1p(i.makerComments) / Math.log1p(maxC);
    return Math.round((WEIGHT_UPVOTES * v + WEIGHT_MAKER_COMMENTS * c) * 1000) / 10;
  });
}

export function daysSince(iso: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 864e5));
}
