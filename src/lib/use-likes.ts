"use client";

import { useCallback, useEffect, useState } from "react";

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

  useEffect(() => {
    setSet(new Set(readLocal()));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeLocal(set);
  }, [set, hydrated]);

  const toggle = useCallback(
    (articleId: string) => {
      // 좋아요는 한 방향 토글 (취소 불가) — 글로벌 카운트 보호용.
      if (set.has(articleId)) return;

      setSet((prev) => {
        if (prev.has(articleId)) return prev;
        const next = new Set(prev);
        next.add(articleId);
        return next;
      });

      const supabase = getSupabaseBrowser();
      if (!supabase || !deviceId) return;

      supabase
        .rpc("increment_likes", { p_article_id: articleId, p_device_id: deviceId })
        .then(({ data, error }) => {
          if (error) {
            console.error("[likes] rpc failed:", error.message);
            setSet((prev) => {
              const next = new Set(prev);
              next.delete(articleId);
              return next;
            });
            return;
          }
          if (typeof data === "number") {
            setOverrides((prev) => {
              const next = new Map(prev);
              next.set(articleId, data);
              return next;
            });
          }
        });
    },
    [set, deviceId],
  );

  return { set, overrides, toggle, hydrated };
}
