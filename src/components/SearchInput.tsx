"use client";

type Props = {
  value: string;
  onChange: (next: string) => void;
};

export function SearchInput({ value, onChange }: Props) {
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
        placeholder="Search articles..."
        className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus-visible:border-violet-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
      />
    </div>
  );
}
