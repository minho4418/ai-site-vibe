import type { Metadata } from "next";
import { Geist, Geist_Mono, Black_Han_Sans } from "next/font/google";

import { ThemeProvider } from "@/components/ThemeProvider";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 한글 포스터 느낌의 디스플레이 폰트. 히어로 헤드라인 등 큰 타이포에만 사용.
// Korean 웹폰트는 용량이 커서 preload 끄고 swap 으로 로드.
const blackHanSans = Black_Han_Sans({
  variable: "--font-black-han-sans",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  // og:image 등 상대 URL 을 절대 URL 로 바꾸는 기준(카톡·트위터는 절대 URL 필요).
  metadataBase: new URL(SITE_URL),
  // 하위 페이지는 "%s — Knewit" 로 자동 조합, 홈은 default 사용.
  title: {
    default: "Knewit - 개발자를 위한 AI 뉴스 큐레이션",
    template: "%s — Knewit",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Knewit",
  keywords: [
    "AI 뉴스",
    "인공지능 뉴스",
    "AI 큐레이션",
    "개발자 뉴스",
    "AI 코딩 도구",
    "LLM",
    "생성형 AI",
    "AI 트렌드",
    "오픈소스 AI",
    "AI 랭킹",
    "Knewit",
  ],
  // 홈의 정식 주소를 명시 → 중복 URL(쿼리·트래킹 파라미터) 색인 방지.
  alternates: { canonical: "/" },
  openGraph: {
    title: "Knewit - 개발자를 위한 AI 뉴스 큐레이션",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "Knewit",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Knewit - 개발자를 위한 AI 뉴스 큐레이션",
    description: "개발자를 위한 AI 뉴스 큐레이션. 매일 오전 8시 자동 업데이트.",
  },
  // 검색엔진에 색인·미리보기 정책 명시(기본 허용 + 최대 미리보기).
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

// 검색엔진용 구조화 데이터(JSON-LD). 사이트 정체성·운영주체를 기계가 읽을 수 있게.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "ko-KR",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
      description: SITE_DESCRIPTION,
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${blackHanSans.variable} h-full antialiased`}
    >
      {/* Pretendard (한국 웹 표준 폰트) — CDN. React 19 가 <head> 로 호이스팅한다.
          변수 폰트 1파일이라 가볍다. 미로딩 구간은 --font-sans 의 Geist/시스템 폴백. */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
      />
      <body className="min-h-full bg-[#FBF6EC] font-sans text-zinc-900 dark:bg-[#0d0b14] dark:text-zinc-100">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
