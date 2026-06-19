import { describe, expect, it } from "vitest";

import { parseBriefing } from "./briefing-types";

const valid = {
  date: "2026-06-19",
  sections: [{ heading: "헤드라인", items: [{ text: "오늘의 소식" }] }],
};

describe("parseBriefing", () => {
  it("유효한 최소 브리핑을 통과시킨다", () => {
    const b = parseBriefing(valid);
    expect(b).not.toBeNull();
    expect(b!.date).toBe("2026-06-19");
    expect(b!.sections).toHaveLength(1);
  });

  it("날짜 형식이 틀리면 null", () => {
    expect(parseBriefing({ ...valid, date: "2026/06/19" })).toBeNull();
  });

  it("유효한 섹션이 0개면 null", () => {
    expect(parseBriefing({ date: "2026-06-19", sections: [] })).toBeNull();
  });

  it("손상 문자(U+FFFD)가 든 항목은 버리고, 섹션이 비면 제외한다", () => {
    const b = parseBriefing({
      date: "2026-06-19",
      sections: [{ heading: "H", items: [{ text: "� 깨진 본문" }] }],
    });
    expect(b).toBeNull();
  });

  it("javascript: 스킴 url 은 제거하고 http url 은 유지한다", () => {
    const b = parseBriefing({
      date: "2026-06-19",
      sections: [
        {
          heading: "H",
          items: [
            { text: "a", url: "javascript:alert(1)" },
            { text: "b", url: "https://ok.com" },
          ],
        },
      ],
    });
    expect(b!.sections[0].items[0].url).toBeUndefined();
    expect(b!.sections[0].items[1].url).toBe("https://ok.com");
  });

  it("socialHook 을 (줄바꿈 포함) 그대로 보존한다 — 잘리지 않음", () => {
    // Threads 첫 글이 펀치만 올라간 이슈(2026-06-19)의 회귀 방지:
    // 코드는 socialHook 을 변형 없이 통과시켜야 한다.
    const hook = "펀치 한 줄\n개인적 시선 한 줄\n댓글 유도 질문?";
    const b = parseBriefing({ ...valid, socialHook: hook });
    expect(b!.socialHook).toBe(hook);
  });

  it("제목의 '— …브리핑' 보일러플레이트 꼬리표를 떼어낸다", () => {
    const b = parseBriefing({
      ...valid,
      title: "핵심 헤드라인 — 2026년 6월 19일 데일리 브리핑",
    });
    expect(b!.title).toBe("핵심 헤드라인");
  });
});
