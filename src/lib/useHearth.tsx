"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Action, HearthState } from "./types";
import { nowOf } from "./logic";

interface Ctx {
  state: HearthState | null;
  now: Date;
  act: (a: Action) => Promise<void>;
  error: string | null;
}

const HearthCtx = createContext<Ctx | null>(null);
const POLL_MS = 1500;

export function HearthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HearthState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current) return;
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState(await res.json());
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      load();
      setTick((t) => t + 1); // re-render so real-time clock advances
    }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const act = useCallback(async (a: Action) => {
    busy.current = true;
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setState(await res.json());
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      busy.current = false;
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => (state ? nowOf(state) : new Date()), [state, tick]);

  return <HearthCtx.Provider value={{ state, now, act, error }}>{children}</HearthCtx.Provider>;
}

export function useHearth() {
  const ctx = useContext(HearthCtx);
  if (!ctx) throw new Error("useHearth must be used inside HearthProvider");
  return ctx;
}

/** Which family member this device is acting as (per-device, kept in localStorage). */
export function useCurrentMember(defaultId = "wm"): [string, (id: string) => void] {
  const [id, setId] = useState(defaultId);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("hearth.member");
      if (saved) setId(saved);
    } catch {}
  }, []);
  const set = useCallback((v: string) => {
    setId(v);
    try {
      localStorage.setItem("hearth.member", v);
    } catch {}
  }, []);
  return [id, set];
}
