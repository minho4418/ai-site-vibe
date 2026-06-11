import type { Metadata } from "next";
import { Geist, Geist_Mono, Black_Han_Sans } from "next/font/google";

import { ThemeProvider } from "@/components/ThemeProvider";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-news-rouge-six.vercel.app",
  ),
  title: "Knewit - AI 뉴스 큐레이션",
  description:
    "AI·개발툴·실무·창업·공모전까지, 유용한 AI 소식을 매일 오전 8시에 자동 큐레이션합니다.",
  openGraph: {
    title: "Knewit - AI 뉴스 큐레이션",
    description:
      "AI·개발툴·실무·창업·공모전까지, 유용한 AI 소식을 매일 오전 8시에 자동 큐레이션합니다.",
    siteName: "Knewit",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Knewit - AI 뉴스 큐레이션",
    description: "개발자를 위한 AI 뉴스 큐레이션. 매일 오전 8시 자동 업데이트.",
  },
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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
