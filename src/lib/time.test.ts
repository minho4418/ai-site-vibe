import { describe, expect, it } from "vitest";

import { daysBetween, isFresh, kstDateString, timeAgo } from "./time";

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

describe("kstDateString", () => {
  it("UTC 자정 직전이라도 KST(+9h)로는 다음 날", () => {
    // 2026-06-19T00:00:00Z = KST 09:00 → 같은 날
    expect(kstDateString(NOW)).toBe("2026-06-19");
    // 2026-06-18T16:00:00Z = KST 01:00(19일) → 날짜가 넘어간다
    expect(kstDateString(Date.UTC(2026, 5, 18, 16, 0, 0))).toBe("2026-06-19");
    // 2026-06-18T14:59:00Z = KST 23:59(18일)
    expect(kstDateString(Date.UTC(2026, 5, 18, 14, 59, 0))).toBe("2026-06-18");
  });
});

describe("daysBetween", () => {
  it("YYYY-MM-DD 두 날짜의 차이를 일 단위로 계산한다", () => {
    expect(daysBetween("2026-06-19", "2026-06-12")).toBe(7);
    expect(daysBetween("2026-06-19", "2026-06-18")).toBe(1);
    expect(daysBetween("2026-07-01", "2026-06-30")).toBe(1); // 월 경계
  });
});
