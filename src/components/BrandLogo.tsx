import Link from "next/link";

// 사이트 브랜드 로고(그라데이션 박스 + Knewit 'K' 모노그램 + 워드마크).
// 모든 헤더(홈/랭킹/교육/데일리)가 공유한다. 모노그램은 파비콘(src/app/icon.svg)과 동일 형태.
//  - 홈·랭킹·교육: 클릭 시 화면 상태를 리셋해야 하므로 button (onClick).
//  - 데일리: 서버 컴포넌트라 핸들러가 없으니 링크 (href).
// 두 용법을 하나로 합쳐, 로고 디자인 변경이 이 파일 한 곳에서만 일어나게 한다.
type Props =
  | { onClick: () => void; href?: never; ariaLabel?: string }
  | { href: string; onClick?: never; ariaLabel?: string };

// button/link 공통 래퍼 클래스(원본 4곳과 동일). button 만 cursor-pointer 를 추가한다
// (link 는 기본적으로 포인터 커서라 불필요 — 데일리 헤더 원본과 동일).
const WRAP =
  "flex w-fit items-center gap-2.5 rounded-xl transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[0.98]";

function LogoMark() {
  return (
    <>
      <div className="grain relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-orange-400 text-white shadow-[0_4px_14px_-4px_rgba(168,85,247,0.6)]">
        {/* Knewit 'K' 모노그램 (파비콘 src/app/icon.svg 와 동일 형태) */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="relative h-5 w-5">
          <path d="M8 5v14M8 12l8-7M8 12l8 7" />
        </svg>
      </div>
      <span className="font-display text-xl tracking-tight">Knewit</span>
    </>
  );
}

export function BrandLogo({ onClick, href, ariaLabel = "Knewit 홈으로" }: Props) {
  if (href !== undefined) {
    return (
      <Link href={href} aria-label={ariaLabel} className={WRAP}>
        <LogoMark />
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={`${WRAP} cursor-pointer`}>
      <LogoMark />
    </button>
  );
}
