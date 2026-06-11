import { ImageResponse } from "next/og";

// 카톡·트위터·슬랙 등에서 링크 공유 시 뜨는 미리보기 카드(og:image).
// Satori 기본 폰트는 한글 글리프가 없어 깨지므로, 카드 텍스트는 로마자만 사용한다.
// (한글 문구가 필요하면 fonts 옵션으로 woff/otf 를 로드해야 함)
export const alt = "Knewit - 오늘의 AI 뉴스";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#0d0b14",
          padding: "96px",
          fontFamily: "sans-serif",
        }}
      >
        {/* 브랜드 그라데이션 글로우 */}
        <div
          style={{
            position: "absolute",
            top: "-160px",
            left: "-120px",
            width: "560px",
            height: "560px",
            borderRadius: "9999px",
            background: "radial-gradient(circle, rgba(217,70,239,0.55), transparent 60%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-200px",
            right: "-120px",
            width: "620px",
            height: "620px",
            borderRadius: "9999px",
            background: "radial-gradient(circle, rgba(251,146,60,0.45), transparent 60%)",
          }}
        />

        {/* 로고 행: K 마크 + 워드마크 */}
        <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "168px",
              height: "168px",
              borderRadius: "42px",
              background: "linear-gradient(135deg, #d946ef, #a855f7 55%, #fb923c)",
            }}
          >
            <svg width="104" height="104" viewBox="0 0 64 64" fill="none">
              <path
                d="M23 17V47M23 32L43 17M23 32L43 47"
                stroke="#ffffff"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: "168px", fontWeight: 800, color: "#ffffff", letterSpacing: "-6px" }}>
            Knewit
          </div>
        </div>

        <div style={{ display: "flex", marginTop: "48px", fontSize: "48px", fontWeight: 700, color: "rgba(255,255,255,0.82)", letterSpacing: "2px" }}>
          TODAY'S AI NEWS
        </div>
        <div style={{ display: "flex", marginTop: "16px", fontSize: "30px", color: "rgba(255,255,255,0.5)" }}>
          knew it — ahead of the AI curve
        </div>
      </div>
    ),
    { ...size },
  );
}
