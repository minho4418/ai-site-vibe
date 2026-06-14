import type { Metadata } from "next";

import { RankingClient } from "@/components/RankingClient";
import { getRanking } from "@/lib/github";

// GitHub 지표는 1시간마다 갱신(ISR).
export const revalidate = 3600;

export const metadata: Metadata = {
  // layout 의 title.template("%s - Knewit") 이 "Knewit" 을 자동으로 붙인다.
  title: "AI 랭킹",
  description: "Cline·Cursor·Aider·OpenHands 등 AI 코딩·에이전트 도구를 GitHub ⭐ 기준으로 랭킹.",
  alternates: { canonical: "/ranking" },
  openGraph: {
    title: "AI 랭킹 - Knewit",
    description: "AI 코딩·에이전트 도구를 GitHub ⭐ 기준으로 랭킹.",
    url: "/ranking",
    type: "website",
  },
};

export default async function RankingPage() {
  const ranking = await getRanking();

  // 헤더(로고=페이지 초기화)·본문은 RankingClient 가 소유한다. (로고 클릭으로 클라이언트 상태 리셋)
  return <RankingClient ranking={ranking} />;
}
