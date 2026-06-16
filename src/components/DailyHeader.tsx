import Link from "next/link";

// /daily · /daily/[date] 공용 헤더(서버 렌더). 랭킹·교육 페이지와 동일한 패턴:
// 로고(→ 홈) + "오늘의 AI 뉴스" 백버튼. 클라이언트 상태가 없어 서버 컴포넌트로 충분.
export function DailyHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-900/10 bg-[#FBF6EC]/80 backdrop-blur-md dark:border-white/10 dark:bg-[#0d0b14]/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          aria-label="Knewit 홈으로"
          className="flex w-fit items-center gap-2.5 rounded-xl transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[0.98]"
        >
          <div className="grain relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-orange-400 text-white shadow-[0_4px_14px_-4px_rgba(168,85,247,0.6)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="relative h-5 w-5">
              <path d="M8 5v14M8 12l8-7M8 12l8 7" />
            </svg>
          </div>
          <span className="font-display text-xl tracking-tight">Knewit</span>
        </Link>
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
      </div>
    </header>
  );
}
