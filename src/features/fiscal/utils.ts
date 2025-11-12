// src/features/fiscal/utils.ts
export const currency = (n?: number | null) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const onlyDigits = (s?: string | null) => (s || "").replace(/\D+/g, "");

export function toNumberOrNull(v?: string | null): number | null {
  if (!v) return null;
  const num = Number(String(v).replace(",", "."));
  return Number.isFinite(num) ? num : null;
}
