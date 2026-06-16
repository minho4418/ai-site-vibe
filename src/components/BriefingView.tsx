import Link from "next/link";

import { formatBriefingDate } from "@/lib/format-briefing-date";
import type { Briefing, BriefingItem } from "@/lib/briefings";

// 브리핑 1건의 전체 본문. /daily 와 /daily/[date] 가 공유한다(서버 렌더, 훅 없음).

function ItemBody({ item }: { item: BriefingItem }) {
  const content = (
    <>
      <span>{item.text}</span>
      {item.source && (
        <span className="ml-1.5 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
          · {item.source}
        </span>
      )}
    </>
  );

  if (!item.url) {
    return <span className="text-zinc-700 dark:text-zinc-300">{content}</span>;
  }
  // 사이트 내부 링크는 <Link>(클라 전환·프리페치), 외부는 새 탭.
  if (item.url.startsWith("/")) {
    return (
      <Link
        href={item.url}
        className="text-zinc-700 underline decoration-violet-400/40 underline-offset-2 transition-colors hover:text-violet-600 hover:decoration-violet-500 dark:text-zinc-300 dark:hover:text-violet-300"
      >
        {content}
      </Link>
    );
  }
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-zinc-700 underline decoration-violet-400/40 underline-offset-2 transition-colors hover:text-violet-600 hover:decoration-violet-500 dark:text-zinc-300 dark:hover:text-violet-300"
    >
      {content}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5 inline-block h-3.5 w-3.5 align-[-1px] text-zinc-400">
        <path d="M7 17 17 7M9 7h8v8" />
      </svg>
    </a>
  );
}

export function BriefingView({ briefing }: { briefing: Briefing }) {
  return (
    <article className="flex flex-col gap-7">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
            {formatBriefingDate(briefing.date, true)}
          </span>
          {briefing.sample && (
            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
              예시
            </span>
          )}
        </div>
        <h1 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
          {briefing.title ?? "오늘의 AI·개발 브리핑"}
        </h1>
        {briefing.summary && (
          <p className="mt-1 text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
            {briefing.summary}
          </p>
        )}
      </header>

      {briefing.sections.map((section, i) => (
        <section key={i} className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-display text-xl tracking-tight">
            <span className="inline-block h-5 w-1.5 rounded-full bg-gradient-to-b from-fuchsia-500 to-violet-600" />
            {section.heading}
          </h2>
          <ul className="flex flex-col gap-3 pl-1">
            {section.items.map((item, j) => (
              <li key={j} className="flex items-start gap-2.5 leading-relaxed">
                <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400/70" />
                <span className="text-sm sm:text-[15px]">
                  <ItemBody item={item} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {briefing.pick && (
        <section className="rounded-2xl border-2 border-violet-500/20 bg-violet-500/[0.06] p-5 dark:border-violet-400/20 dark:bg-violet-400/[0.08]">
          <h2 className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-violet-700 dark:text-violet-300">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 20.5l1.4-6.8L2.2 9l6.9-.7z" />
            </svg>
            오늘의 한 줄 추천
          </h2>
          <p className="text-sm leading-relaxed sm:text-[15px]">
            <ItemBody item={briefing.pick} />
          </p>
        </section>
      )}
    </article>
  );
}
