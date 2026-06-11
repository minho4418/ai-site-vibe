import { BLOCKLIST, CATEGORIES, NON_REPO_OWNERS, type CategoryKey } from "./ai-tools";

// "검색 ∩ awesome-list 멤버십" 하이브리드 랭킹.
//  - 멤버십: awesome-list README 를 파싱한 repo 집합(사람 큐레이션 = 스팸 없음).
//  - 후보: GitHub 검색(별순) → 멤버십에 든 것만 통과(노이즈 제거). 검색 결과에 별수가 들어있어
//    카테고리 랭킹엔 repo 별도 조회가 필요 없다(효율적).
//  - seeds: 검색/리스트에 안 걸려도 항상 포함.
//  - 주간 상승: union 에서 최근 7일 star 증가(GITHUB_TOKEN 있을 때만).
//  모든 호출 1시간 캐시(ISR).

const GH = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PER_PAGE = 100;
const MAX_WEEKLY_PAGES = 20;
const SEARCH_PAGES = 2; // 후보 풀 = 카테고리 쿼리당 상위 200개(per_page 100 × 2)
const PER_CATEGORY = 20;
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

const lc = (s: string) => s.toLowerCase();

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

// awesome-list README → {owner/repo} 멤버십 집합(소문자). repo 가 아닌 경로는 제외.
async function fetchMembership(list: string): Promise<Set<string>> {
  for (const branch of ["main", "master", "HEAD"]) {
    try {
      const res = await fetch(`${RAW}/${list}/${branch}/README.md`, {
        headers: { "User-Agent": "knewit-ranking" },
        next: { revalidate: 3600 },
      });
      if (!res.ok) continue;
      const text = await res.text();
      const out = new Set<string>();
      for (const m of text.matchAll(/github\.com\/([\w.-]+\/[\w.-]+)/g)) {
        const slug = lc(m[1].replace(/[).,#?]+$/, ""));
        const [owner, repo] = slug.split("/");
        if (!owner || !repo || NON_REPO_OWNERS.has(owner)) continue;
        if (repo.endsWith(".git")) continue;
        out.add(slug);
      }
      return out;
    } catch {
      // 다음 브랜치 시도
    }
  }
  return new Set();
}

async function fetchRepo(repo: string): Promise<GhRepo | null> {
  try {
    const res = await fetch(`${GH}/repos/${repo}`, { headers: ghHeaders(), next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as GhRepo;
  } catch {
    return null;
  }
}

async function searchRepos(query: string, page: number): Promise<GhRepo[]> {
  try {
    const url = `${GH}/search/repositories?sort=stars&order=desc&per_page=100&page=${page}&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: ghHeaders(), next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return ((await res.json()) as { items?: GhRepo[] }).items ?? [];
  } catch {
    return [];
  }
}

function toRanked(r: GhRepo, category: CategoryKey): RankedRepo {
  return {
    repo: r.full_name,
    label: r.full_name.split("/")[1] ?? r.full_name,
    url: r.html_url,
    description: r.description ?? "",
    stars: r.stargazers_count,
    forks: r.forks_count,
    language: r.language,
    category,
    weeklyStars: null,
    weeklyCapped: false,
  };
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
  const blocked = new Set(BLOCKLIST.map(lc));
  const claimed = new Set<string>();
  const byCategory = { skills: [], agents: [], mcp: [] } as Record<CategoryKey, RankedRepo[]>;

  for (const cat of CATEGORIES) {
    // 멤버십(여러 리스트 합집합)
    const memberSets = await Promise.all(cat.awesomeLists.map(fetchMembership));
    const members = new Set<string>();
    for (const s of memberSets) for (const m of s) members.add(m);

    const picked = new Map<string, GhRepo>();

    // 시드(항상 포함)
    const seedRows = await Promise.all(cat.seeds.map(fetchRepo));
    for (const r of seedRows) if (r) picked.set(lc(r.full_name), r);

    // 검색(별순) ∩ 멤버십
    for (const q of cat.queries) {
      for (let page = 1; page <= SEARCH_PAGES; page++) {
        const items = await searchRepos(`${q} stars:>=${cat.minStars} fork:false`, page);
        if (items.length === 0) break;
        for (const r of items) {
          const key = lc(r.full_name);
          if (members.has(key) && !picked.has(key)) picked.set(key, r);
        }
      }
    }

    byCategory[cat.key] = [...picked.values()]
      .filter((r) => !blocked.has(lc(r.full_name)) && !claimed.has(lc(r.full_name)))
      .map((r) => {
        claimed.add(lc(r.full_name));
        return toRanked(r, cat.key);
      })
      .sort((a, b) => b.stars - a.stars)
      .slice(0, PER_CATEGORY);
  }

  // 주간 상승
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
