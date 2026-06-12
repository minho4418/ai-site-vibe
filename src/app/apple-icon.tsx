import { ImageResponse } from "next/og";

// iOS 홈 화면 + 일부 검색엔진이 파비콘 대체로 참조하는 180×180 래스터 아이콘.
// 브라우저 탭 파비콘은 icon.svg(벡터) 가 담당하고, 이 파일은 SVG 를 못 읽는
// 환경을 위한 PNG 폴백이다. icon.svg 와 동일한 K 모노그램을 렌더한다.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
          background: "linear-gradient(135deg, #d946ef, #a855f7 55%, #fb923c)",
        }}
      >
        <svg width="112" height="112" viewBox="0 0 64 64" fill="none">
          <path
            d="M23 17V47M23 32L43 17M23 32L43 47"
            stroke="#ffffff"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
