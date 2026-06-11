import { CATEGORIES, type CategoryKey } from "./ai-tools";

// 큐레이션 repo 들의 GitHub 지표를 모아 랭킹 데이터를 만든다.
// - 카테고리별: 누적 star 순. repo 당 1회 호출이라 토큰 없이도 동작.
// - 주간 상승: 세 카테고리 전체(union)에서 최근 7일 star 증가순. stargazers 페이지네이션이
//   무거워 GITHUB_TOKEN 이 있을 때만 집계한다. 모든 호출 1시간 캐시(ISR).

const GH = "https://api.github.com";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PER_PAGE = 100;
const MAX_WEEKLY_PAGES = 20; // 안전 상한(≈2,000/주 초과는 "+"로 표기)
const WEEKLY_TOP = 20;

export type RankedRepo = {
  repo: string;
  label: string;
  url: string;
  description: string;
  stars: number;
  forks: number;
  language: string | null;
  category: CategoryKey;
  weeklyStars: number | null;
  weeklyCapped: boolean;
};

export type Ranking = {
  byCategory: Record<CategoryKey, RankedRepo[]>;
  weeklyTop: RankedRepo[];
  weeklyAvailable: boolean;
};

type GhRepo = {
  full_name: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  description: string | null;
  html_url: string;
};
type GhStar = { starred_at: string };

function ghHeaders(starMedia = false): HeadersInit {
  const h: Record<string, string> = {
    Accept: starMedia ? "application/vnd.github.star+json" : "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "knewit-ranking",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function fetchRepo(repo: string, category: CategoryKey): Promise<RankedRepo | null> {
  try {
    const res = await fetch(`${GH}/repos/${repo}`, { headers: ghHeaders(), next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const d = (await res.json()) as GhRepo;
    return {
      repo: d.full_name,
      label: d.full_name.split("/")[1] ?? d.full_name,
      url: d.html_url,
      description: d.description ?? "",
      stars: d.stargazers_count,
      forks: d.forks_count,
      language: d.language,
      category,
      weeklyStars: null,
      weeklyCapped: false,
    };
  } catch {
    return null;
  }
}

async function fetchWeeklyStars(
  repo: string,
  totalStars: number,
  now: number,
): Promise<{ count: number; capped: boolean } | null> {
  const lastPage = Math.max(1, Math.ceil(totalStars / PER_PAGE));
  const weekAgo = now - WEEK_MS;
  let count = 0;
  try {
    for (let i = 0; i < MAX_WEEKLY_PAGES; i++) {
      const page = lastPage - i;
      if (page < 1) break;
      const res = await fetch(`${GH}/repos/${repo}/stargazers?per_page=${PER_PAGE}&page=${page}`, {
        headers: ghHeaders(true),
        next: { revalidate: 3600 },
      });
      if (!res.ok) return count > 0 ? { count, capped: false } : null;
      const arr = (await res.json()) as GhStar[];
      if (!Array.isArray(arr) || arr.length === 0) break;
      let hitOlder = false;
      for (const s of arr) {
        if (new Date(s.starred_at).getTime() >= weekAgo) count++;
        else hitOlder = true;
      }
      if (hitOlder) return { count, capped: false };
    }
    return { count, capped: true };
  } catch {
    return null;
  }
}

export async function getRanking(): Promise<Ranking> {
  const seen = new Set<string>();
  const byCategory = { skills: [], agents: [], mcp: [] } as Record<CategoryKey, RankedRepo[]>;

  for (const cat of CATEGORIES) {
    const rows = await Promise.all(cat.repos.map((r) => fetchRepo(r, cat.key)));
    byCategory[cat.key] = rows
      .filter((r): r is RankedRepo => r !== null)
      .filter((r) => {
        const key = r.repo.toLowerCase();
        if (seen.has(key)) return false; // 중복(여러 카테고리) 방지
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.stars - a.stars);
  }

  // 주간 상승: 전체 union 에 대해 최근 7일 star 증가(토큰 있을 때만).
  const union = [...byCategory.skills, ...byCategory.agents, ...byCategory.mcp];
  let weeklyAvailable = false;
  if (process.env.GITHUB_TOKEN) {
    const now = Date.now();
    await Promise.all(
      union.map(async (r) => {
        const w = await fetchWeeklyStars(r.repo, r.stars, now);
        if (w) {
          r.weeklyStars = w.count;
          r.weeklyCapped = w.capped;
          weeklyAvailable = true;
        }
      }),
    );
  }

  const weeklyTop = union
    .filter((r) => r.weeklyStars !== null)
    .sort((a, b) => (b.weeklyStars ?? -1) - (a.weeklyStars ?? -1) || b.stars - a.stars)
    .slice(0, WEEKLY_TOP);

  return { byCategory, weeklyTop, weeklyAvailable };
}
