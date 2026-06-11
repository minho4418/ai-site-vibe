// 사이트 전역 상수. og:image·canonical·sitemap·robots·JSON-LD 가 공유한다.
// 도메인이 바뀌면 Vercel 환경변수 NEXT_PUBLIC_SITE_URL 만 고치면 된다(코드 수정 불필요).
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://knewittoday.com";

export const SITE_NAME = "Knewit";

export const SITE_DESCRIPTION =
  "AI·개발툴·실무·창업·공모전까지, 유용한 AI 소식을 매일 오전 8시에 자동 큐레이션합니다. AI 코딩 도구 랭킹도 함께.";
