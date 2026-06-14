import type { Metadata } from "next";

import { EducationClient } from "@/components/EducationClient";

export const metadata: Metadata = {
  // layout 의 title.template("%s - Knewit") 이 "Knewit" 을 자동으로 붙인다.
  title: "AI 교육",
  description:
    "패스트캠퍼스·인프런·클래스101·유튜브 등 AI 입문부터 LLM·에이전트·이미지 생성까지 배우기 좋은 강의를 한곳에 모았어요.",
  alternates: { canonical: "/education" },
  openGraph: {
    title: "AI 교육 - Knewit",
    description: "AI 배우기 좋은 강의를 한곳에. 입문·LLM·에이전트·이미지 생성·데이터.",
    url: "/education",
    type: "website",
  },
};

export default function EducationPage() {
  // 헤더(로고=페이지 초기화)·본문은 EducationClient 가 소유한다. (로고 클릭으로 클라이언트 상태 리셋)
  return <EducationClient />;
}
