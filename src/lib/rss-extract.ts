import "server-only";

type Enclosure = { url?: string; type?: string };
type MediaItem = { url?: string; "$"?: { url?: string } };
type RawItem = {
  link?: string;
  title?: string;
  contentSnippet?: string;
  content?: string;
  isoDate?: string;
  pubDate?: string;
  enclosure?: Enclosure;
  // rss-parser optionally surfaces media:* under custom fields; we accept loosely
  ["media:content"]?: MediaItem | MediaItem[];
  ["media:thumbnail"]?: MediaItem | MediaItem[];
};

const HTML_TAG_RE = /<[^>]*>/g;
const WHITESPACE_RE = /\s+/g;
const IMG_RE = /<img[^>]+src=["']([^"']+)["']/i;

export function extractSummary(input: string, maxLen = 220): string {
  if (!input) return "";
  const stripped = input.replace(HTML_TAG_RE, " ").replace(WHITESPACE_RE, " ").trim();
  if (stripped.length <= maxLen) return stripped;
  return stripped.slice(0, maxLen - 1).trimEnd() + "…";
}

export function extractThumbnail(item: RawItem): string | null {
  const enclosure = item.enclosure;
  if (enclosure?.url && (enclosure.type ?? "").startsWith("image/")) {
    return enclosure.url;
  }

  const media = item["media:content"] ?? item["media:thumbnail"];
  const mediaArr = Array.isArray(media) ? media : media ? [media] : [];
  for (const m of mediaArr) {
    const url = m?.url ?? m?.["$"]?.url;
    if (url) return url;
  }

  const html = item.content ?? "";
  const match = html.match(IMG_RE);
  if (match?.[1]) return match[1];

  return null;
}

export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    // Strip common tracking params; keep path + most params untouched.
    const drop = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    drop.forEach((k) => u.searchParams.delete(k));
    return u.toString();
  } catch {
    return raw.trim();
  }
}
