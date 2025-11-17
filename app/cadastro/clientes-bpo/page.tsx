"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import {
  Loader2,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building2,
  Download,
  Users,
  CircleDollarSign,
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useRouter } from "next/navigation";

/* ================== Tipos ================== */
type EmpresaBPO = {
  id: string;
  codigo_erp: string;
  cpf_cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  status: boolean | null;
  data_inicio: string | null;
  honorario_mensal: number | null;
};

type StatusFilter = "all" | "active" | "inactive";

const TABLE_NAME = "empresas_bpo" as const;
const PAGE_SIZE = 50;
const EXPORT_BATCH = 1000;

/* =============== Helpers de parsing =============== */
function fromRow(row: any): EmpresaBPO {
  return {
    id: String(row.codigo_erp),
    codigo_erp: String(row.codigo_erp),
    cpf_cnpj: row.cpf_cnpj ?? null,
    razao_social: row.razao_social ?? null,
    nome_fantasia: row.nome_fantasia ?? null,
    status:
      row.status === null || row.status === undefined ? null : !!row.status,
    data_inicio: row.data_inicio
      ? new Date(row.data_inicio).toLocaleDateString("pt-BR")
      : null,
    honorario_mensal:
      row.honorario_mensal === null || row.honorario_mensal === undefined
        ? null
        : Number(row.honorario_mensal),
  };
}

function statusLabel(v: boolean | null): string {
  if (v === null) return "-";
  return v ? "Ativo" : "Inativo";
}

/* =============== Toggle 3D Reutilizável =============== */
type Toggle3DProps = {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel?: string;
  scale?: number;
};
function Toggle3D({
  active,
  disabled,
  onClick,
  ariaLabel,
  scale = 1,
}: Toggle3DProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={ariaLabel ?? (active ? "Ativo" : "Inativo")}
      className={[
        "relative inline-flex h-8 items-center rounded-full border transition-colors duration-200",
        "bg-gradient-to-b",
        active
          ? "from-emerald-200 to-emerald-300 border-emerald-400"
          : "from-neutral-100 to-neutral-200 border-neutral-300",
        "shadow-md",
        active ? "shadow-emerald-200/60" : "shadow-neutral-300/60",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow-lg",
      ].join(" ")}
      style={{
        width: 64,
        transform: `scale(${scale})`,
        transformOrigin: "left center",
      }}
      title={
        active ? "Ativo — clique para desativar" : "Inativo — clique para ativar"
      }
    >
      <span
        aria-hidden="true"
        className={[
          "absolute inset-0 rounded-full shadow-inner",
          active ? "shadow-emerald-600/10" : "shadow-black/10",
        ].join(" ")}
      />
      <span
        aria-hidden="true"
        className={[
          "relative z-10 h-6 w-6 rounded-full bg-white",
          "transition-transform duration-200",
          "shadow-[0_2px_0_#0000000a,0_6px_12px_#0000001a]",
          "border border-black/5",
        ].join(" ")}
        style={{
          transform: active ? "translateX(34px)" : "translateX(6px)",
        }}
      />
      <span
        aria-hidden="true"
        className={[
          "absolute inset-0 rounded-full pointer-events-none",
          active ? "ring-1 ring-emerald-700/20" : "ring-1 ring-black/10",
        ].join(" ")}
      />
      <span className="sr-only">{active ? "Ativo" : "Inativo"}</span>
    </button>
  );
}

/* ================== Página ================== */
export default function EmpresasBPOPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [items, setItems] = useState<EmpresaBPO[]>([]);
  const [q, setQ] = useState<string>("");
  const [debouncedQ, setDebouncedQ] = useState<string>("");
  const [page, setPage] = useState<number>(0);
  const [total, setTotal] = useState<number | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState<boolean>(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  // métricas globais (ativos)
  const [metricsLoading, setMetricsLoading] = useState<boolean>(true);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [activeHonorarios, setActiveHonorarios] = useState<number | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const totalPages = useMemo(
    () => (total ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1),
    [total]
  );
  const showingFrom = useMemo(
    () => (total ? page * PAGE_SIZE + 1 : 0),
    [page, total]
  );
  const showingTo = useMemo(
    () => (total ? Math.min(total, (page + 1) * PAGE_SIZE) : 0),
    [page, total]
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQ, statusFilter]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExportOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function buildBaseQuery() {
  let query = supabase
    .from(TABLE_NAME)
    .select(
      `
      codigo_erp,
      cpf_cnpj,
      razao_social,
      nome_fantasia,
      status,
      data_inicio,
      honorario_mensal
      `,
      { count: "exact" }
    )
    .order("codigo_erp", { ascending: false });

  if (debouncedQ) {
    // escapando % e _ para não quebrar o ilike
    const safe = debouncedQ.replace(/%/g, "\\%").replace(/_/g, "\\_");
    const pat = `%${safe}%`;

    const orFilters: string[] = [
      `razao_social.ilike.${pat}`,
      `nome_fantasia.ilike.${pat}`,
      `cpf_cnpj.ilike.${pat}`,
    ];

    // se for número, também busca por código ERP exato
    if (/^\d+$/.test(debouncedQ)) {
      orFilters.push(`codigo_erp.eq.${Number(debouncedQ)}`);
    }

    query = query.or(orFilters.join(","));
  }

  if (statusFilter === "active") {
    query = query.eq("status", true);
  } else if (statusFilter === "inactive") {
    query = query.eq("status", false);
  }

  return query;
}

  async function fetchData(): Promise<void> {
    setLoading(true);
    setErrorMsg(null);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error, count } = await buildBaseQuery().range(from, to);
    if (error) {
      console.error(`SELECT ${TABLE_NAME} error:`, error);
      setErrorMsg(error.message);
      setItems([]);
      setTotal(0);
    } else {
      setItems((data ?? []).map(fromRow));
      setTotal(count ?? 0);
    }
    setLoading(false);
  }

  // métricas globais: total de clientes ativos e somatório de honorários ativos
  async function fetchMetrics(): Promise<void> {
    try {
      setMetricsLoading(true);
      setMetricsError(null);
      const { data, error, count } = await supabase
        .from(TABLE_NAME)
        .select("codigo_erp,honorario_mensal", { count: "exact" })
        .eq("status", true);

      if (error) {
        console.error("Erro ao buscar métricas de empresas BPO:", error);
        setMetricsError("Falha ao carregar métricas.");
        setActiveCount(0);
        setActiveHonorarios(0);
      } else {
        const rows = (data ?? []) as { honorario_mensal: number | null }[];
        const totalHonorarios = rows.reduce((acc, r) => {
          if (r.honorario_mensal == null) return acc;
          const n = Number(r.honorario_mensal);
          return acc + (Number.isNaN(n) ? 0 : n);
        }, 0);
        setActiveCount(count ?? 0);
        setActiveHonorarios(totalHonorarios);
      }
    } finally {
      setMetricsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedQ, statusFilter]);

  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`realtime:${TABLE_NAME}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE_NAME },
        () => {
          fetchData();
          fetchMetrics();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedQ, statusFilter]);

  /* ===== Toggle de status com update no Supabase (otimista) ===== */
  async function toggleStatus(codigo_erp: string, current: boolean | null) {
  const id = String(codigo_erp);
  const next = !(!!current); // inverte; null -> true

  // 1) Update otimista na UI
  setItems((prev) =>
    prev.map((it) =>
      it.codigo_erp === codigo_erp ? { ...it, status: next } : it
    )
  );
  setSavingIds((prev) => {
    const n = new Set(prev);
    n.add(id);
    return n;
  });

  const codigoNumeric = Number(codigo_erp);

  try {
    // 2) Atualiza no banco
    const { error: updateError } = await supabase
      .from(TABLE_NAME)
      .update({ status: next })
      .eq("codigo_erp", codigoNumeric);

    if (updateError) {
      console.error("Erro ao atualizar status:", updateError);
      // rollback se der erro
      setItems((prev) =>
        prev.map((it) =>
          it.codigo_erp === codigo_erp ? { ...it, status: current } : it
        )
      );
      setErrorMsg("Não foi possível atualizar o status. Tente novamente.");
      return;
    }

    // 3) Registrar no histórico (empresas_bpo_audit)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const auditPayload = {
      codigo_erp: codigoNumeric,
      action: "UPDATE" as const,
      changed_by: user?.id ?? null, // uuid do usuário
      row_old: { status: current },
      row_new: { status: next },
      changed_diff: {
        status: {
          old: current,
          new: next,
        },
      },
      // changed_at usa default now() no banco
    };

    const { error: auditError } = await supabase
      .from("empresas_bpo_audit")
      .insert(auditPayload);

    if (auditError) {
      console.error(
        "Erro ao registrar histórico de status em empresas_bpo_audit:",
        auditError
      );
      // não bloqueia o usuário, só loga o problema
    }
  } finally {
    setSavingIds((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  }
}

  /* ================== Export helpers ================== */
  async function fetchAllMatching(): Promise<EmpresaBPO[]> {
    setExportError(null);
    const head = await buildBaseQuery().range(0, 0);
    if (head.error) throw head.error;
    const totalCount = head.count ?? 0;
    if (totalCount === 0) return [];

    const all: EmpresaBPO[] = [];
    for (let from = 0; from < totalCount; from += EXPORT_BATCH) {
      const to = Math.min(from + EXPORT_BATCH - 1, totalCount - 1);
      const { data, error } = await buildBaseQuery().range(from, to);
      if (error) throw error;
      all.push(...(data ?? []).map(fromRow));
    }
    return all;
  }

  async function handleExportXLSX(): Promise<void> {
    try {
      setExporting(true);
      const rows = await fetchAllMatching();
      const wsData = [
        [
          "Cód. ERP",
          "Razão Social",
          "Nome Fantasia",
          "CPF/CNPJ",
          "Status",
          "Início",
          "Honorário Mensal",
        ],
        ...rows.map((r) => [
          r.codigo_erp,
          r.razao_social ?? "",
          r.nome_fantasia ?? "",
          r.cpf_cnpj ?? "",
          r.status === null ? "" : r.status ? "Ativo" : "Inativo",
          r.data_inicio ?? "",
          r.honorario_mensal ?? 0,
        ]),
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      ws["!cols"] = [
        { wch: 10 },
        { wch: 30 },
        { wch: 30 },
        { wch: 18 },
        { wch: 10 },
        { wch: 12 },
        { wch: 15 },
      ];

      const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const cell_address = { c: 6, r: R };
        const cell_ref = XLSX.utils.encode_cell(cell_address);
        if (!ws[cell_ref]) continue;
        ws[cell_ref].t = "n";
        ws[cell_ref].z = "R$ #,##0.00";
      }

      XLSX.utils.book_append_sheet(wb, ws, "EmpresasBPO");
      XLSX.writeFile(
        wb,
        `empresas_bpo_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (e: any) {
      console.error("Export XLSX error:", e);
      setExportError(e?.message || String(e));
    } finally {
      setExporting(false);
    }
  }

  async function handleExportCSV(): Promise<void> {
    try {
      setExporting(true);
      const rows = await fetchAllMatching();
      const ws = XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          "Cód. ERP": r.codigo_erp,
          "Razão Social": r.razao_social ?? "",
          "Nome Fantasia": r.nome_fantasia ?? "",
          "CPF/CNPJ": r.cpf_cnpj ?? "",
          Status: r.status === null ? "" : r.status ? "Ativo" : "Inativo",
          Início: r.data_inicio ?? "",
          "Honorário Mensal": r.honorario_mensal ?? 0,
        }))
      );
      const csv = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `empresas_bpo_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error("Export CSV error:", e);
      setExportError(e?.message || String(e));
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPDF(): Promise<void> {
    try {
      setExporting(true);
      const rows = await fetchAllMatching();
      const doc = new jsPDF({ orientation: "landscape" });

      autoTable(doc, {
        head: [
          [
            "Cód. ERP",
            "Razão Social",
            "Nome Fantasia",
            "CPF/CNPJ",
            "Status",
            "Início",
            "Honorário",
          ],
        ],
        body: rows.map((r) => [
          r.codigo_erp,
          r.razao_social ?? "-",
          r.nome_fantasia ?? "-",
          r.cpf_cnpj ?? "-",
          statusLabel(r.status),
          r.data_inicio ?? "-",
          r.honorario_mensal?.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }) ?? "-",
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [50, 50, 50] },
        theme: "grid",
      });

      doc.save(
        `empresas_bpo_${new Date().toISOString().slice(0, 10)}.pdf`
      );
    } catch (e: any) {
      console.error("Export PDF error:", e);
      setExportError(e?.message || String(e));
    } finally {
      setExporting(false);
    }
  }

  function prevPage(): void {
    setPage((p) => Math.max(0, p - 1));
  }
  function nextPage(): void {
    setPage((p) => (total && p + 1 < totalPages ? p + 1 : p));
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {/* HEADER */}
      <header className="flex flex-col gap-3 border-b border-neutral-200 pb-4 pt-1 dark:border-neutral-800">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-sm dark:bg-neutral-100 dark:text-neutral-900">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                Clientes BPO
              </h1>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 md:text-sm">
                Empresas atendidas pelo BPO financeiro, base para conciliação,
                relatórios e projeções.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro de status */}
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-2 py-1 text-xs shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70">
              <span className="hidden text-neutral-500 md:inline">
                Status:
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={[
                  "rounded-full px-2.5 py-1 transition",
                  statusFilter === "all"
                    ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
                ].join(" ")}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={[
                  "rounded-full px-2.5 py-1 transition",
                  statusFilter === "active"
                    ? "bg-emerald-600 text-white"
                    : "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/30",
                ].join(" ")}
              >
                Ativas
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("inactive")}
                className={[
                  "rounded-full px-2.5 py-1 transition",
                  statusFilter === "inactive"
                    ? "bg-amber-500 text-white"
                    : "text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/30",
                ].join(" ")}
              >
                Inativas
              </button>
            </div>

            {/* Botão Novo */}
            <Link
              href="/cadastro/clientes-bpo/novo"
              className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              <Plus className="h-4 w-4" />
              Nova empresa
            </Link>

            {/* Export dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen((s) => !s)}
                disabled={exporting || total === 0}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-3 py-2 text-xs font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-neutral-100 dark:hover:bg-neutral-800"
                aria-haspopup="menu"
                aria-expanded={exportOpen}
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Exportar
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
              <div
                className={`absolute right-0 mt-2 w-44 rounded-2xl border border-neutral-200 bg-white text-xs shadow-xl ring-1 ring-black/5 transition-all dark:border-neutral-700 dark:bg-neutral-900 dark:ring-white/5 ${
                  exportOpen
                    ? "visible opacity-100 translate-y-0"
                    : "invisible opacity-0 -translate-y-1"
                }`}
                role="menu"
              >
                <button
                  onClick={() => {
                    setExportOpen(false);
                    void handleExportXLSX();
                  }}
                  className="block w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  role="menuitem"
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => {
                    setExportOpen(false);
                    void handleExportCSV();
                  }}
                  className="block w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  role="menuitem"
                >
                  CSV (.csv)
                </button>
                <button
                  onClick={() => {
                    setExportOpen(false);
                    void handleExportPDF();
                  }}
                  className="block w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  role="menuitem"
                >
                  PDF (.pdf)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Linha de busca + infos */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por código, razão social, nome fantasia ou CNPJ..."
              className="w-full rounded-full border border-neutral-200 bg-white/80 py-2 pl-9 pr-3 text-sm outline-none ring-0 transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-neutral-100 dark:focus:border-neutral-50 dark:focus:ring-neutral-50/15"
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            {total !== null && (
              <span>
                Mostrando{" "}
                <strong className="text-neutral-800 dark:text-neutral-100">
                  {showingFrom || 0}
                </strong>
                –
                <strong className="text-neutral-800 dark:text-neutral-100">
                  {showingTo || 0}
                </strong>{" "}
                de{" "}
                <strong className="text-neutral-800 dark:text-neutral-100">
                  {total}
                </strong>{" "}
                empresas
              </span>
            )}
            {errorMsg && (
              <span className="text-rose-600 dark:text-rose-300">
                Erro ao carregar: {errorMsg}
              </span>
            )}
            {exportError && (
              <span className="text-rose-600 dark:text-rose-300">
                Erro ao exportar: {exportError}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* CARDS DE MÉTRICAS */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
        <div className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60 px-4 py-4 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950 dark:via-neutral-950 dark:to-emerald-900/20">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700/80 dark:text-emerald-200">
                Clientes ativos
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-300">
                Quantidade de empresas com status ativo.
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/40">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
              {metricsLoading
                ? "—"
                : typeof activeCount === "number"
                ? activeCount
                : "0"}
            </span>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              empresas
            </span>
          </div>
          {metricsError && (
            <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-300">
              {metricsError}
            </p>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-gradient-to-br from-sky-50 via-white to-sky-100/70 px-4 py-4 shadow-sm dark:border-sky-900/40 dark:from-sky-950 dark:via-neutral-950 dark:to-sky-900/20">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-sky-700/90 dark:text-sky-200">
                Honorários ativos
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-300">
                Soma mensal dos honorários das empresas ativas.
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md shadow-sky-500/40">
              <CircleDollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
              {metricsLoading
                ? "—"
                : activeHonorarios != null
                ? activeHonorarios.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })
                : "R$ 0,00"}
            </span>
          </div>
          {metricsError && (
            <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-300">
              {metricsError}
            </p>
          )}
        </div>
      </section>

      {/* TABELA / CONTEÚDO */}
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white/90 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80">
        {/* Cabeçalho da tabela no estilo “contas a pagar” */}
        <div className="border-b border-neutral-200/80 bg-neutral-50/90 px-4 py-2 text-xs font-medium text-neutral-600 shadow-[inset_0_-1px_0_rgba(15,23,42,0.04)] dark:border-neutral-800 dark:bg-neutral-900/90 dark:text-neutral-300">
          <span>Tabela de empresas BPO</span>
        </div>

        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-neutral-50/80 text-xs text-neutral-500 dark:bg-neutral-900/80 dark:text-neutral-400">
              <th className="border-b border-neutral-200 px-4 py-2 text-left font-medium dark:border-neutral-800">
                Cód. ERP
              </th>
              <th className="border-b border-neutral-200 px-4 py-2 text-left font-medium dark:border-neutral-800">
                Razão Social
              </th>
              <th className="border-b border-neutral-200 px-4 py-2 text-left font-medium dark:border-neutral-800">
                Nome Fantasia
              </th>
              <th className="border-b border-neutral-200 px-4 py-2 text-left font-medium dark:border-neutral-800">
                CPF/CNPJ
              </th>
              <th className="border-b border-neutral-200 px-4 py-2 text-left font-medium dark:border-neutral-800">
                Status
              </th>
              <th className="border-b border-neutral-200 px-4 py-2 text-left font-medium dark:border-neutral-800">
                Início
              </th>
              <th className="border-b border-neutral-200 px-4 py-2 text-left font-medium dark:border-neutral-800">
                Honorário
              </th>
              <th className="border-b border-neutral-200 px-4 py-2 text-right font-medium dark:border-neutral-800">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-neutral-500 dark:text-neutral-400"
                >
                  <div className="inline-flex items-center gap-2 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando empresas BPO…
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-neutral-500 dark:text-neutral-400"
                >
                  Nenhuma empresa BPO encontrada com os filtros atuais.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const saving = savingIds.has(item.id);
                const isActive = !!item.status;
                const isLast = idx === items.length - 1;

                return (
                  <tr
  key={item.id}
  onDoubleClick={() => router.push(`/cadastro/clientes-bpo/${item.id}`)}
  className="align-middle transition hover:bg-neutral-50/80 dark:hover:bg-neutral-800/60 cursor-pointer"
>

                    <td
                      className={`whitespace-nowrap px-4 py-2 text-xs font-mono text-neutral-700 dark:text-neutral-200 ${
                        isLast ? "" : "border-b border-neutral-100 dark:border-neutral-800/60"
                      }`}
                    >
                      {item.codigo_erp}
                    </td>
                    <td
                      className={`px-4 py-2 text-sm font-medium text-neutral-900 dark:text-neutral-100 ${
                        isLast ? "" : "border-b border-neutral-100 dark:border-neutral-800/60"
                      }`}
                    >
                      {item.razao_social ?? "-"}
                    </td>
                    <td
                      className={`px-4 py-2 text-xs text-neutral-700 dark:text-neutral-300 ${
                        isLast ? "" : "border-b border-neutral-100 dark:border-neutral-800/60"
                      }`}
                    >
                      {item.nome_fantasia ?? "-"}
                    </td>
                    <td
                      className={`px-4 py-2 text-xs text-neutral-700 dark:text-neutral-300 ${
                        isLast ? "" : "border-b border-neutral-100 dark:border-neutral-800/60"
                      }`}
                    >
                      {item.cpf_cnpj ?? "-"}
                    </td>
                    <td
                      className={`px-4 py-2 ${
                        isLast ? "" : "border-b border-neutral-100 dark:border-neutral-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Toggle3D
                          active={isActive}
                          disabled={saving}
                          onClick={() =>
                            toggleStatus(item.codigo_erp, item.status)
                          }
                          ariaLabel="Status do cliente BPO"
                          scale={0.9}
                        />
                        <span className="text-[11px] text-neutral-600 dark:text-neutral-300">
                          {item.status === null
                            ? "—"
                            : item.status
                            ? "Ativo"
                            : "Inativo"}
                        </span>
                        {saving && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
                        )}
                      </div>
                    </td>
                    <td
                      className={`px-4 py-2 text-xs text-neutral-700 dark:text-neutral-300 ${
                        isLast ? "" : "border-b border-neutral-100 dark:border-neutral-800/60"
                      }`}
                    >
                      {item.data_inicio ?? "-"}
                    </td>
                    <td
                      className={`px-4 py-2 text-xs text-neutral-800 dark:text-neutral-200 ${
                        isLast ? "" : "border-b border-neutral-100 dark:border-neutral-800/60"
                      }`}
                    >
                      {item.honorario_mensal != null
                        ? item.honorario_mensal.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        : "-"}
                    </td>
                    <td
                      className={`px-4 py-2 text-right ${
                        isLast ? "" : "border-b border-neutral-100 dark:border-neutral-800/60"
                      }`}
                    >
                      <Link
                        href={`/cadastro/clientes-bpo/${item.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-[11px] text-neutral-700 shadow-xs transition hover:bg-neutral-900 hover:text-white dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-100 dark:hover:text-neutral-900"
                        title="Editar"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* Paginação */}
      <footer className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
        <div>
          Página{" "}
          <strong className="text-neutral-800 dark:text-neutral-100">
            {page + 1}
          </strong>{" "}
          de{" "}
          <strong className="text-neutral-800 dark:text-neutral-100">
            {totalPages}
          </strong>
        </div>
        <div className="inline-flex items-center gap-2">
          <button
            onClick={prevPage}
            disabled={page === 0}
            className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-700 shadow-xs transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </button>
          <button
            onClick={nextPage}
            disabled={page + 1 >= totalPages}
            className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-700 shadow-xs transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Próxima
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
