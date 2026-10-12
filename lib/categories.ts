// Kavya's adjacent categories, mapped to real ProductHunt topic slugs.
export const CATEGORIES: { key: string; label: string; slugs: string[] }[] = [
  { key: "project-management", label: "Project Management", slugs: ["task-management"] },
  { key: "hr-tech", label: "HR Tech", slugs: ["human-resources", "hiring"] },
  { key: "developer-productivity", label: "Developer Productivity", slugs: ["developer-tools"] },
  { key: "team-communication", label: "Team Communication", slugs: ["remote-work", "meetings"] },
  { key: "productivity", label: "General Productivity", slugs: ["productivity"] },
];

export const DEFAULT_MY_PRODUCT =
  "An async standup tool for remote teams: team members post short daily updates (text or video) in Slack/Teams instead of attending live meetings, and managers get an auto-generated summary of progress and blockers.";

export function slugsFor(keys: string[]): string[] {
  const set = new Set<string>();
  for (const k of keys) {
    const c = CATEGORIES.find((x) => x.key === k);
    if (c) c.slugs.forEach((s) => set.add(s));
  }
  return [...set];
}
