"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ai-news:device-id";

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useDeviceId() {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    try {
      let value = window.localStorage.getItem(STORAGE_KEY);
      if (!value) {
        value = generateId();
        window.localStorage.setItem(STORAGE_KEY, value);
      }
      setId(value);
    } catch {
      // Storage blocked (private mode etc.) — fall back to in-memory only.
      setId(generateId());
    }
  }, []);

  return id;
}
