import type { NextConfig } from "next";

// 보안 헤더 baseline. 모든 경로에 적용된다.
//
// CSP 노트:
//   - Next.js / React 의 hydration·스트리밍 RSC payload·next-themes 초기 스크립트가 인라인이라
//     'unsafe-inline' 을 빼면 깨진다. nonce 기반으로 강화하려면 middleware/proxy 에서 매 요청마다
//     nonce 를 생성해 헤더와 _document 양쪽에 주입해야 한다 (현재는 그 정도까진 안 감).
//   - img-src 가 https: 와일드카드인 이유: RSS 썸네일이 사방의 외부 도메인에서 오기 때문.
//   - connect-src 에 *.supabase.co — 브라우저에서 Supabase REST/RPC 호출.
//   - frame-ancestors 'none' 으로 iframe 임베드 차단 (X-Frame-Options DENY 와 같은 효과지만 CSP 가 표준).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  // HTTPS 강제 (Vercel 도 자체 적용하지만 명시).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // MIME 스니핑 차단.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 클릭재킹 방지 (CSP frame-ancestors 의 보강).
  { key: "X-Frame-Options", value: "DENY" },
  // 외부 사이트로 갈 때 referer 는 origin 만.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 안 쓰는 브라우저 API 권한 차단.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // 같은 origin 끼리만 window 공유 (spectre 류 사이드채널 완화).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // 다른 사이트가 우리 리소스를 읽는 걸 차단.
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // DNS prefetch 허용 (성능).
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // CSP.
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
