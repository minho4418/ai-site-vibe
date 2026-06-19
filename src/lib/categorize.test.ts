import { describe, expect, it } from "vitest";

import { classifyCategory, isAiRelated } from "./categorize";

describe("classifyCategory — 우선순위 규칙", () => {
  it("공모전/창업 키워드를 가장 먼저 잡는다", () => {
    expect(classifyCategory("AI 해커톤 경진대회 수상작")).toBe("Contest");
    expect(classifyCategory("AI 스타트업 시리즈 A 투자 유치")).toBe("Startup");
  });

  it("하드웨어 키워드는 LLM 보다 먼저 Infra 로 분류한다", () => {
    // 'H200' 은 모델명처럼 보이지만 Infra 규칙이 LLM 보다 우선이라 LLM 으로 새지 않는다.
    expect(classifyCategory("엔비디아 H200 데이터센터 증설")).toBe("Infra");
  });

  it("코딩 도구는 Tools 로 분류한다", () => {
    expect(classifyCategory("Cursor 로 바이브 코딩 입문")).toBe("Tools");
  });

  it("오픈소스/연구/실무 신호를 구분한다", () => {
    expect(classifyCategory("깃허브에 공개된 오픈웨이트 모델")).toBe("OpenSource");
    expect(classifyCategory("arxiv 논문으로 본 SOTA 연구 성과")).toBe("Research");
    expect(classifyCategory("RAG 파이프라인 프로덕션 도입 사례")).toBe("Practice");
  });

  it("일반 모델 뉴스는 마지막 fallback 인 LLM 으로 떨어진다", () => {
    expect(classifyCategory("GPT 언어모델 신규 공개")).toBe("LLM");
  });

  it("어떤 규칙에도 안 걸리면 null 을 반환한다", () => {
    expect(classifyCategory("주말 도심 날씨 맑고 쾌청")).toBeNull();
  });
});

describe("isAiRelated", () => {
  it("AI 신호가 있으면 true", () => {
    expect(isAiRelated("인공지능 스타트업 소식")).toBe(true);
    expect(isAiRelated("New GPT model released")).toBe(true);
  });

  it("AI 와 무관하면 false", () => {
    expect(isAiRelated("오늘 점심 메뉴 추천")).toBe(false);
  });

  it("'rain' 처럼 ai 가 단어 중간에 박힌 경우는 오탐하지 않는다", () => {
    expect(isAiRelated("It will rain tomorrow")).toBe(false);
  });
});
