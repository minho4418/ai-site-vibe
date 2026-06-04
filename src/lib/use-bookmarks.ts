"use client";

import { useCallback, useEffect, useState } from "react";

import { getSupabaseBrowser } from "./supabase-browser";

const STORAGE_KEY = "ai-news:bookmarked";

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
    // ignore quota / privacy mode
  }
}

export function useBookmarks(deviceId: string | null) {
  const [set, setSet] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    const supabase = getSupabaseBrowser();

    if (!supabase) {
      // Supabase not configured → keep working with localStorage only.
      setSet(new Set(readLocal()));
      setHydrated(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("article_id")
        .eq("device_id", deviceId);
      if (cancelled) return;
      if (error) {
        console.error("[bookmarks] fetch failed:", error.message);
      } else if (data) {
        setSet(new Set(data.map((r) => String(r.article_id))));
      }
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  const toggle = useCallback(
    (articleId: string) => {
      if (!deviceId) return;
      const supabase = getSupabaseBrowser();

      let nextSet: Set<string> | null = null;
      let wasPresent = false;

      setSet((prev) => {
        wasPresent = prev.has(articleId);
        const next = new Set(prev);
        if (wasPresent) next.delete(articleId);
        else next.add(articleId);
        nextSet = next;
        return next;
      });

      if (!supabase) {
        if (nextSet) writeLocal(nextSet);
        return;
      }

      const promise = wasPresent
        ? supabase.from("bookmarks").delete().match({ device_id: deviceId, article_id: articleId })
        : supabase.from("bookmarks").upsert(
            { device_id: deviceId, article_id: articleId },
            { onConflict: "device_id,article_id", ignoreDuplicates: true },
          );

      promise.then(({ error }) => {
        if (!error) return;
        console.error("[bookmarks] write failed:", error.message);
        // rollback
        setSet((curr) => {
          const r = new Set(curr);
          if (wasPresent) r.add(articleId);
          else r.delete(articleId);
          return r;
        });
      });
    },
    [deviceId],
  );

  return { set, toggle, hydrated };
}
