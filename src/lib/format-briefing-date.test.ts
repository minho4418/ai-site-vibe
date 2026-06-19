import { describe, expect, it } from "vitest";

import { formatBriefingDate } from "./format-briefing-date";

describe("formatBriefingDate", () => {
  it("기본은 'M월 D일' 형식", () => {
    expect(formatBriefingDate("2026-06-16")).toBe("6월 16일");
  });

  it("withWeekday 면 요일을 괄호로 덧붙인다", () => {
    // 요일 계산 자체보다 형식을 검증(달력 계산 실수로 테스트가 틀리는 것 방지).
    expect(formatBriefingDate("2026-06-16", true)).toMatch(/^6월 16일 \([일월화수목금토]\)$/);
  });

  it("형식이 깨지면 입력을 그대로 돌려준다", () => {
    expect(formatBriefingDate("not-a-date")).toBe("not-a-date");
  });
});
