"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSupabaseBrowser } from "./supabase-browser";

const STORAGE_KEY = "ai-news:liked";

function readLocal(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeLocal(set: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function useLikes(deviceId: string | null) {
  const [set, setSet] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Map<string, number>>(new Map());
  const [hydrated, setHydrated] = useState(false);

  // 빠른 연타 시 stale closure 를 피하기 위해 현재 set 을 ref 로 추적.
  const setRef = useRef<Set<string>>(set);

  useEffect(() => {
    setRef.current = set;
  }, [set]);

  useEffect(() => {
    const initial = new Set(readLocal());
    setRef.current = initial;
    setSet(initial);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeLocal(set);
  }, [set, hydrated]);

  const toggle = useCallback(
    (articleId: string, currentCount: number) => {
      // 결정은 토글 본문에서 직접 — setState updater 안에서 하면 다음 렌더 사이클에야 실행되어
      // 후속 부수효과(낙관적 override, RPC) 가 잘못된 분기로 들어감.
      const wasLiked = setRef.current.has(articleId);
      const optimistic = wasLiked ? Math.max(0, currentCount - 1) : currentCount + 1;
      const rpcName = wasLiked ? "decrement_likes" : "increment_likes";

      setSet((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(articleId);
        else next.add(articleId);
        setRef.current = next;
        return next;
      });

      setOverrides((prev) => {
        const next = new Map(prev);
        next.set(articleId, optimistic);
        return next;
      });

      const supabase = getSupabaseBrowser();
      if (!supabase || !deviceId) return;

      supabase
        .rpc(rpcName, { p_article_id: articleId, p_device_id: deviceId })
        .then(({ data, error }) => {
          if (error) {
            console.error(`[likes] ${rpcName} failed:`, error.message);
            // 롤백
            setSet((curr) => {
              const r = new Set(curr);
              if (wasLiked) r.add(articleId);
              else r.delete(articleId);
              setRef.current = r;
              return r;
            });
            setOverrides((curr) => {
              const r = new Map(curr);
              r.set(articleId, currentCount);
              return r;
            });
            return;
          }
          if (typeof data === "number") {
            setOverrides((curr) => {
              const r = new Map(curr);
              r.set(articleId, data);
              return r;
            });
          }
        });
    },
    [deviceId],
  );

  return { set, overrides, toggle, hydrated };
}
