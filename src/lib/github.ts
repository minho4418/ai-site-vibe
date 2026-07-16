import { BLOCKLIST, CATEGORIES, NON_REPO_OWNERS, type CategoryKey } from "./ai-tools";
import { getSupabaseAnonServer } from "./supabase-server";
import { daysBetween, kstDateString } from "./time";

// "검색 ∩ awesome-list 멤버십" 하이브리드 랭킹.
//  - 멤버십: awesome-list README 를 파싱한 repo 집합(사람 큐레이션 = 스팸 없음).
//  - 후보: GitHub 검색(별순) → 멤버십에 든 것만 통과(노이즈 제거). 검색 결과에 별수가 들어있어
//    카테고리 랭킹엔 repo 별도 조회가 필요 없다(효율적).
//  - seeds: 검색/리스트에 안 걸려도 항상 포함.
//  - 주간 상승: GitHub 이 2026-06-30 부로 stargazers 목록 API 를 관리자·협력자 전용으로 제한해
//    (누가 언제 별 줬는지 조회 불가), repo_star_snapshots 에 매일 저장한 총 별 수 스냅샷과의
//    차이("오늘 − 최대 7일 전")로 직접 계산한다. 스냅샷은 /api/cron/star-snapshot 이 쌓는다.
//  모든 GitHub 호출 1시간 캐시(ISR).

const GH = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";
const SEARCH_PAGES = 2; // 후보 풀 = 카테고리 쿼리당 상위 200개(per_page 100 × 2)
const PER_CATEGORY = 20;
const WEEKLY_TOP = 20;
const WEEKLY_WINDOW_DAYS = 7;

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
  weeklyDays: number | null; // 상승분이 며칠간의 증가인지(1~7). 스냅샷이 7일 미만이면 <7.
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

const lc = (s: string) => s.toLowerCase();

function ghHeaders(): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
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
    weeklyDays: null,
  };
}

// 카테고리별 랭킹(top N) + 스냅샷 대상 후보 풀 전체.
// 풀은 top N 밖 후보까지 포함 — 매일 별 수를 쌓아 두면 나중에 랭킹에 진입한 repo 도
// 즉시 주간 수치를 갖는다(스냅샷 커버리지 문제 해소).
async function collectCategories(): Promise<{
  byCategory: Record<CategoryKey, RankedRepo[]>;
  pool: GhRepo[];
}> {
  const blocked = new Set(BLOCKLIST.map(lc));
  const claimed = new Set<string>();
  const byCategory = { skills: [], agents: [], mcp: [] } as Record<CategoryKey, RankedRepo[]>;
  const pool = new Map<string, GhRepo>();

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

    for (const [key, r] of picked) {
      if (!blocked.has(key) && !pool.has(key)) pool.set(key, r);
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

  return { byCategory, pool: [...pool.values()] };
}

// /api/cron/star-snapshot 용: 오늘 스냅샷할 후보 풀(소문자 repo + 현재 별 수).
export async function collectStarPool(): Promise<{ repo: string; stars: number }[]> {
  const { pool } = await collectCategories();
  return pool.map((r) => ({ repo: lc(r.full_name), stars: r.stargazers_count }));
}

// 스냅샷 기반 주간 상승: 창(최대 7일) 안에서 가장 오래된 스냅샷을 기준으로
// "현재 별 수 − 기준" 을 계산해 union 항목에 주입한다. 스냅샷이 없으면(테이블이
// 아직 비었거나 Supabase 미설정) 그대로 null → weeklyAvailable=false.
async function applyWeeklyFromSnapshots(union: RankedRepo[]): Promise<boolean> {
  const supabase = getSupabaseAnonServer();
  if (!supabase || union.length === 0) return false;

  const today = kstDateString();
  const windowStart = kstDateString(Date.now() - WEEKLY_WINDOW_DAYS * 86_400_000);

  const { data, error } = await supabase
    .from("repo_star_snapshots")
    .select("repo, snapshot_date, stars")
    .in(
      "repo",
      union.map((r) => lc(r.repo)),
    )
    .gte("snapshot_date", windowStart)
    .lt("snapshot_date", today) // 오늘 스냅샷은 기준선이 될 수 없다(경과 0일)
    .order("snapshot_date", { ascending: true });
  if (error || !data) return false;

  // repo 별 가장 오래된 스냅샷(= 첫 행, 날짜 오름차순 정렬됨)
  const baseline = new Map<string, { snapshot_date: string; stars: number }>();
  for (const row of data) {
    if (!baseline.has(row.repo)) baseline.set(row.repo, row);
  }

  let available = false;
  for (const r of union) {
    const snap = baseline.get(lc(r.repo));
    if (!snap) continue;
    r.weeklyStars = Math.max(0, r.stars - snap.stars);
    r.weeklyDays = daysBetween(today, snap.snapshot_date);
    available = true;
  }
  return available;
}

export async function getRanking(): Promise<Ranking> {
  const { byCategory } = await collectCategories();

  const union = [...byCategory.skills, ...byCategory.agents, ...byCategory.mcp];
  const weeklyAvailable = await applyWeeklyFromSnapshots(union);

  const weeklyTop = union
    .filter((r) => r.weeklyStars !== null)
    .sort((a, b) => (b.weeklyStars ?? -1) - (a.weeklyStars ?? -1) || b.stars - a.stars)
    .slice(0, WEEKLY_TOP);

  return { byCategory, weeklyTop, weeklyAvailable };
}
