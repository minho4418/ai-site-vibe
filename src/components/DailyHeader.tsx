import { BackToNewsLink } from "@/components/BackToNewsLink";
import { BrandLogo } from "@/components/BrandLogo";

// /daily · /daily/[date] 공용 헤더(서버 렌더). 랭킹·교육 페이지와 동일한 패턴:
// 로고(→ 홈) + "오늘의 AI 뉴스" 백버튼. 클라이언트 상태가 없어 서버 컴포넌트로 충분.
export function DailyHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-900/10 bg-[#FBF6EC]/80 backdrop-blur-md dark:border-white/10 dark:bg-[#0d0b14]/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <BrandLogo href="/" />
        <BackToNewsLink />
      </div>
    </header>
  );
}
