"use client";

type Props = {
  value: string;
  onChange: (next: string) => void;
  // 입력 <input> 에 덧붙일 추가 클래스(예: 교육 탭에서 cursor-default 주입). 미지정 시 홈 기본 동작 유지.
  className?: string;
};

export function SearchInput({ value, onChange, className = "" }: Props) {
  return (
    <div className="relative w-full max-w-sm">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="검색..."
        className={
          "h-9 w-full rounded-full border-2 border-zinc-900/10 bg-white/70 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus-visible:border-violet-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-white/15 dark:bg-white/5 dark:text-zinc-100 dark:placeholder:text-zinc-500 " +
          className
        }
      />
    </div>
  );
}
