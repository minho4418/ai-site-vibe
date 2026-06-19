import { describe, expect, it } from "vitest";

import { extractSummary, extractThumbnail, normalizeUrl } from "./rss-extract";

describe("extractSummary", () => {
  it("HTML 태그를 제거하고 공백을 정규화한다", () => {
    expect(extractSummary("<p>Hello   <b>world</b></p>")).toBe("Hello world");
  });

  it("빈 입력은 빈 문자열", () => {
    expect(extractSummary("")).toBe("");
  });

  it("maxLen 을 넘으면 … 로 잘라낸다", () => {
    expect(extractSummary("abcdefghij", 5)).toBe("abcd…");
  });
});

describe("normalizeUrl", () => {
  it("utm_* 추적 파라미터만 제거하고 나머지는 보존한다", () => {
    expect(normalizeUrl("https://ex.com/a?utm_source=x&q=1&utm_medium=y")).toBe(
      "https://ex.com/a?q=1",
    );
  });

  it("URL 로 파싱되지 않으면 trim 만 해서 그대로 돌려준다", () => {
    expect(normalizeUrl("  not a url  ")).toBe("not a url");
  });
});

describe("extractThumbnail", () => {
  it("이미지 enclosure 를 최우선으로 사용한다", () => {
    expect(
      extractThumbnail({ enclosure: { url: "https://i/x.jpg", type: "image/jpeg" } }),
    ).toBe("https://i/x.jpg");
  });

  it("media:content / media:thumbnail 의 url 을 읽는다(단일·배열·$ 형태)", () => {
    expect(extractThumbnail({ "media:content": { url: "https://i/m.jpg" } })).toBe(
      "https://i/m.jpg",
    );
    expect(
      extractThumbnail({ "media:thumbnail": [{ $: { url: "https://i/t.jpg" } }] }),
    ).toBe("https://i/t.jpg");
  });

  it("content 본문의 첫 <img> src 를 추출한다", () => {
    expect(extractThumbnail({ content: '<p><img src="https://i/c.png"></p>' })).toBe(
      "https://i/c.png",
    );
  });

  it("이미지가 전혀 없으면 null", () => {
    expect(extractThumbnail({ title: "no image" })).toBeNull();
  });
});
