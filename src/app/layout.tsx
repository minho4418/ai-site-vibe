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
  title: "AI 뉴스 — 한국 개발자를 위한 AI 큐레이션",
  description:
    "AI·개발툴·실무·창업·공모전까지, 한국 개발자에게 유용한 AI 소식을 매시간 자동 큐레이션합니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${blackHanSans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#FBF6EC] font-sans text-zinc-900 dark:bg-[#0d0b14] dark:text-zinc-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
