import Link from "next/link";

// "오늘의 AI 뉴스(홈)"로 돌아가는 백버튼. 랭킹·교육·데일리 헤더가 공유한다.
// (홈 헤더에는 없음 — 홈 자신이라 돌아갈 곳이 없다.)
export function BackToNewsLink() {
  return (
    <Link
      href="/"
      aria-label="오늘의 AI 뉴스로 돌아가기"
      className="inline-flex h-9 shrink-0 select-none items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-violet-500/30 bg-violet-500/10 px-3.5 text-sm font-bold text-violet-700 transition-colors hover:bg-violet-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[0.97] dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-300 dark:hover:bg-violet-400/15"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="m12 19-7-7 7-7M19 12H5" />
      </svg>
      오늘의 AI 뉴스
    </Link>
  );
}
