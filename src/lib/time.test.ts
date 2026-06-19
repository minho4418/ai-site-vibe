import { describe, expect, it } from "vitest";

import { isFresh, timeAgo } from "./time";

// now 를 고정 주입해 테스트를 결정적으로 만든다(함수가 now 를 인자로 받도록 설계됨).
const NOW = Date.UTC(2026, 5, 19, 0, 0, 0); // 2026-06-19T00:00:00Z
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

describe("timeAgo", () => {
  it("1분 미만은 '방금'", () => {
    expect(timeAgo(iso(30_000), NOW)).toBe("방금");
  });

  it("분/시간/일/주 단위로 환산한다", () => {
    expect(timeAgo(iso(30 * 60_000), NOW)).toBe("30분 전");
    expect(timeAgo(iso(2 * 3_600_000), NOW)).toBe("2시간 전");
    expect(timeAgo(iso(3 * 86_400_000), NOW)).toBe("3일 전");
    expect(timeAgo(iso(2 * 7 * 86_400_000), NOW)).toBe("2주 전");
  });
});

describe("isFresh", () => {
  it("윈도 안이면 true, 밖이면 false", () => {
    expect(isFresh(iso(1_000), 60_000, NOW)).toBe(true);
    expect(isFresh(iso(120_000), 60_000, NOW)).toBe(false);
  });
});
