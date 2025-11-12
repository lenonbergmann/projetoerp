// src/features/fiscal/api.ts
"use client";

import { getBrowserSupabase } from "@/lib/supabase/browser";
import { type Invoice, type FiscalDirection, type FiscalKind, type FiscalStatus } from "./types";
import { onlyDigits } from "./utils";

type Filters = {
  direction: "ALL" | FiscalDirection;
  kind: "ALL" | FiscalKind;
  status: "ALL" | FiscalStatus;
  cnpj: string;
  numero: string;
  serie: string;
  chave: string;
  cfop: string;
  date_from: string;
  date_to: string;
  empresa_codigo_erp: string;
};

export async function fetchNotas(filters: Filters): Promise<Invoice[]> {
  const supabase = getBrowserSupabase();
  let q = supabase.from("fiscal_notas").select("*").order("data_emissao", { ascending: false });

  if (filters.direction && filters.direction !== "ALL") q = q.eq("direction", filters.direction);
  if (filters.kind && filters.kind !== "ALL") q = q.eq("kind", filters.kind);
  if (filters.status && filters.status !== "ALL") q = q.eq("status", filters.status);
  if (filters.cnpj) {
    const c = onlyDigits(filters.cnpj);
    q = q.or(`cnpj_emitente.ilike.%${c}%,cnpj_destinatario.ilike.%${c}%`);
  }
  if (filters.chave) q = q.ilike("chave", `%${filters.chave}%`);
  if (filters.cfop) q = q.ilike("cfop", `%${filters.cfop}%`);
  if (filters.serie) q = q.ilike("serie", `%${filters.serie}%`);
  if (filters.numero) q = q.ilike("numero", `%${filters.numero}%`);
  if (filters.empresa_codigo_erp) q = q.eq("empresa_codigo_erp", filters.empresa_codigo_erp);
  if (filters.date_from) q = q.gte("data_emissao", new Date(filters.date_from).toISOString());
  if (filters.date_to) q = q.lte("data_emissao", new Date(filters.date_to).toISOString());

  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as Invoice[]) ?? [];
}

export async function insertNotasBulk(notas: Invoice[]): Promise<{ ok: number; fail: number; errors?: any[] }> {
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase.from("fiscal_notas").insert(notas).select("id");
  if (error) return { ok: 0, fail: notas.length, errors: [error] };
  return { ok: data?.length ?? 0, fail: notas.length - (data?.length ?? 0) };
}

export async function gerarTitulosFinanceiros(_notas: Invoice[]): Promise<{ created: number }> {
  // Futuro: chamar RPCs
  return { created: _notas.length };
}

export async function buscarNotasPorCertificado(payload: {
  empresa_codigo_erp: string;
  cnpj: string;
  uf: string;
  ambiente: "PRODUCAO" | "HOMOLOGACAO";
  tipos: ("NFE" | "NFSE" | "CTE")[];
  dfe: { ultimas_horas?: number; ultimos_dias?: number };
}): Promise<{ total: number; inseridas: number }> {
  // Route Handler server-side (abaixo) responde esse POST
  const res = await fetch("/api/fiscal/dfetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha no dfetch");
  return (await res.json()) as { total: number; inseridas: number };
}
