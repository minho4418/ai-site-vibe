import { AI_TOOLS } from "./ai-tools";

// GitHub REST 로 큐레이션 도구들의 stars/forks(+선택적으로 주간 star 증가)를 모아 랭킹 데이터를 만든다.
// - 누적 stars/forks: repo 당 1회 호출 → 토큰 없어도 시간당 한도(60) 안에서 동작.
// - 주간 star 증가: stargazers 를 '최신 페이지부터 역순'으로 훑어 최근 7일 별을 센다.
//   호출이 많아(레이트리밋) GITHUB_TOKEN 이 있을 때만 시도하고, 없으면 null(미집계).
// 모든 fetch 는 1시간 캐시(next.revalidate)로 외부 호출을 최소화한다.

const GH = "https://api.github.com";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PER_PAGE = 100;
const MAX_WEEKLY_PAGES = 30; // 안전 상한(≈3,000/주 초과는 "3000+"로 취급)

export type RepoRank = {
  repo: string;
  label: string;
  blurb: string;
  url: string;
  description: string;
  stars: number;
  forks: number;
  language: string | null;
  /** 최근 7일 star 증가. null = 미집계(토큰 없음/측정 실패), 음수 없음. */
  weeklyStars: number | null;
  /** weeklyStars 가 상한에 걸려 실제론 더 많을 수 있음 */
  weeklyCapped: boolean;
};

type GhRepo = {
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
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function fetchRepo(repo: string): Promise<GhRepo | null> {
  try {
    const res = await fetch(`${GH}/repos/${repo}`, {
      headers: ghHeaders(),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as GhRepo;
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
      // 7일보다 오래된 별이 나오면 더 이전(옛) 페이지는 볼 필요 없음.
      if (hitOlder) return { count, capped: false };
    }
    // 상한까지 7일 내 별만 봤다면 실제론 더 많을 수 있음.
    return { count, capped: true };
  } catch {
    return null;
  }
}

export async function getToolRanking(): Promise<RepoRank[]> {
  const now = Date.now();
  const withWeekly = Boolean(process.env.GITHUB_TOKEN); // 토큰 없으면 주간 집계 생략(레이트리밋 보호)

  const rows = await Promise.all(
    AI_TOOLS.map(async (t): Promise<RepoRank | null> => {
      const base = await fetchRepo(t.repo);
      if (!base) return null;

      let weeklyStars: number | null = null;
      let weeklyCapped = false;
      if (withWeekly) {
        const w = await fetchWeeklyStars(t.repo, base.stargazers_count, now);
        if (w) {
          weeklyStars = w.count;
          weeklyCapped = w.capped;
        }
      }

      return {
        repo: t.repo,
        label: t.label,
        blurb: t.blurb,
        url: base.html_url,
        description: base.description ?? "",
        stars: base.stargazers_count,
        forks: base.forks_count,
        language: base.language,
        weeklyStars,
        weeklyCapped,
      };
    }),
  );

  return rows.filter((r): r is RepoRank => r !== null);
}
