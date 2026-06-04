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
    (articleId: string, currentCount: number) => {
      // 양방향 토글. setSet 의 updater 안에서 결정해야 빠른 연타 시 race 안전.
      let direction: "like" | "unlike" | null = null;
      let optimistic: number | null = null;

      setSet((prev) => {
        const next = new Set(prev);
        if (prev.has(articleId)) {
          next.delete(articleId);
          direction = "unlike";
          optimistic = Math.max(0, currentCount - 1);
        } else {
          next.add(articleId);
          direction = "like";
          optimistic = currentCount + 1;
        }
        return next;
      });

      if (direction === null || optimistic === null) return;

      // 낙관적 카운트 즉시 반영
      setOverrides((prev) => {
        const next = new Map(prev);
        next.set(articleId, optimistic!);
        return next;
      });

      const supabase = getSupabaseBrowser();
      if (!supabase || !deviceId) return;

      const rpcName = direction === "like" ? "increment_likes" : "decrement_likes";
      supabase
        .rpc(rpcName, { p_article_id: articleId, p_device_id: deviceId })
        .then(({ data, error }) => {
          if (error) {
            console.error(`[likes] ${rpcName} failed:`, error.message);
            // 롤백 — set, override 모두 원복
            setSet((curr) => {
              const r = new Set(curr);
              if (direction === "like") r.delete(articleId);
              else r.add(articleId);
              return r;
            });
            setOverrides((curr) => {
              const r = new Map(curr);
              r.set(articleId, currentCount);
              return r;
            });
            return;
          }
          // RPC 가 반환한 정확한 카운트로 override 동기화
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
