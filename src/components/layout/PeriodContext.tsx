"use client";

import * as React from "react";

export type PeriodPreset =
  | "Hoje"
  | "Ontem"
  | "Últimos 7 dias"
  | "Últimos 30 dias"
  | "Este mês"
  | "Mês passado"
  | "Personalizado";

export type PeriodState = {
  preset: PeriodPreset;
  from: Date | null;
  to: Date | null;
};

type PeriodContextValue = {
  period: PeriodState;
  setPreset: (preset: PeriodPreset) => void;
  setCustom: (from: Date | null, to: Date | null) => void;
};

const PeriodContext = React.createContext<PeriodContextValue | null>(null);

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function computeRange(preset: PeriodPreset): { from: Date | null; to: Date | null } {
  const now = new Date();
  const today = startOfDay(now);
  switch (preset) {
    case "Hoje":
      return { from: today, to: endOfDay(now) };
    case "Ontem": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "Últimos 7 dias": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from, to: endOfDay(now) };
    }
    case "Últimos 30 dias": {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from, to: endOfDay(now) };
    }
    case "Este mês": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      const to = endOfDay(now);
      return { from, to };
    }
    case "Mês passado": {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: startOfDay(first), to: endOfDay(last) };
    }
    case "Personalizado":
    default:
      return { from: null, to: null };
  }
}

const STORAGE_KEY = "erp.period.v1";

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriod] = React.useState<PeriodState>(() => {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as PeriodState;
          return {
            preset: parsed.preset ?? "Últimos 30 dias",
            from: parsed.from ? new Date(parsed.from) : null,
            to: parsed.to ? new Date(parsed.to) : null,
          };
        } catch {}
      }
    }
    const { from, to } = computeRange("Últimos 30 dias");
    return { preset: "Últimos 30 dias", from, to };
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        preset: period.preset,
        from: period.from ? period.from.toISOString() : null,
        to: period.to ? period.to.toISOString() : null,
      })
    );
  }, [period]);

  const setPreset = React.useCallback((preset: PeriodPreset) => {
    const { from, to } = computeRange(preset);
    setPeriod({ preset, from, to });
  }, []);

  const setCustom = React.useCallback((from: Date | null, to: Date | null) => {
    setPeriod({ preset: "Personalizado", from, to });
  }, []);

  const value: PeriodContextValue = React.useMemo(
    () => ({ period, setPreset, setCustom }),
    [period, setPreset, setCustom]
  );

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod() {
  const ctx = React.useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod deve ser usado dentro de <PeriodProvider>");
  return ctx;
}

/** Texto amigável do período para mostrar no Topbar */
export function usePeriodLabel() {
  const { period } = usePeriod();
  if (period.preset !== "Personalizado") return period.preset;
  const fmt = (d: Date | null) =>
    d ? d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";
  return `${fmt(period.from)} — ${fmt(period.to)}`;
}
