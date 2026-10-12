const API = "https://api.producthunt.com/v2/api/graphql";
const TOKEN_URL = "https://api.producthunt.com/v2/oauth/token";

export interface PHPost {
  id: string;
  name: string;
  tagline: string;
  description: string | null;
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  url: string;
  topics: string[];
  makers: { id: string; name: string; username: string }[];
  hunter: string | null;
  makerComments: number | null; // null = could not be measured
}

export const REDACTED = "[REDACTED]";

let cached: { token: string; exp: number } | null = null;

async function getToken(): Promise<string> {
  // A developer token is tied to a real account and returns un-redacted maker identities,
  // which we need to count maker comments. Client-credentials tokens get "[REDACTED]" names.
  if (process.env.PRODUCTHUNT_TOKEN) return process.env.PRODUCTHUNT_TOKEN;
  if (cached && cached.exp > Date.now()) return cached.token;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.PRODUCTHUNT_CLIENT_ID,
      client_secret: process.env.PRODUCTHUNT_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`ProductHunt auth failed (${res.status})`);
  const json = await res.json();
  cached = { token: json.access_token, exp: Date.now() + 6 * 60 * 60 * 1000 };
  return cached.token;
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const token = await getToken();
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ProductHunt API ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(`ProductHunt API: ${json.errors[0].message}`);
  return json.data as T;
}

const POSTS_QUERY = `
query($topic: String, $after: DateTime, $first: Int) {
  posts(first: $first, topic: $topic, postedAfter: $after, order: VOTES) {
    edges { node {
      id name tagline description votesCount commentsCount createdAt url
      topics(first: 5) { edges { node { name } } }
      makers { id name username }
      user { name }
    } }
  }
}`;

interface RawPost {
  id: string; name: string; tagline: string; description: string | null;
  votesCount: number; commentsCount: number; createdAt: string; url: string;
  topics: { edges: { node: { name: string } }[] };
  makers: { id: string; name: string; username: string }[];
  user: { name: string } | null;
}

export async function fetchRecentPosts(slug: string, windowDays: number, first = 40): Promise<PHPost[]> {
  const after = new Date(Date.now() - windowDays * 864e5).toISOString();
  const data = await gql<{ posts: { edges: { node: RawPost }[] } }>(POSTS_QUERY, { topic: slug, after, first });
  return data.posts.edges.map(({ node: n }) => ({
    id: n.id,
    name: n.name,
    tagline: n.tagline,
    description: n.description,
    votesCount: n.votesCount,
    commentsCount: n.commentsCount,
    createdAt: n.createdAt,
    // strip tracking params
    url: n.url.split("?")[0],
    topics: n.topics.edges.map((t) => t.node.name),
    makers: n.makers,
    hunter: n.user?.name ?? null,
    makerComments: null,
  }));
}

const COMMENTS_QUERY = `
query($id: ID!) {
  post(id: $id) {
    comments(first: 20) { edges { node {
      userId
      replies(first: 5) { edges { node { userId } } }
    } } }
  }
}`;

interface CommentNode {
  userId: string;
  replies: { edges: { node: { userId: string } }[] };
}

/**
 * Counts comments + replies written by the product's makers — a responsiveness signal.
 * ProductHunt redacts commenter usernames for API clients, but comment.userId is exposed,
 * so we match it against the makers' ids.
 */
export async function countMakerComments(post: PHPost): Promise<number | null> {
  if (post.makers.length === 0) return null;
  try {
    const data = await gql<{ post: { comments: { edges: { node: CommentNode }[] } } | null }>(COMMENTS_QUERY, { id: post.id });
    const makerIds = new Set(post.makers.map((m) => String(m.id)));
    let count = 0;
    for (const { node } of data.post?.comments.edges ?? []) {
      if (makerIds.has(String(node.userId))) count++;
      for (const r of node.replies.edges) if (makerIds.has(String(r.node.userId))) count++;
    }
    return count;
  } catch {
    return null;
  }
}
