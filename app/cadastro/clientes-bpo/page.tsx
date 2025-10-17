// app/cadastro/clientes-bpo/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import { Loader2, Plus, Search, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/* ================== Tipos ================== */
type EmpresaBPO = {
  id: string;
  codigo_erp: string;
  cpf_cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  status: boolean | null;               // boolean conforme schema
  data_inicio: string | null;
  honorario_mensal: number | null;      // numeric -> number
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
    status: row.status === null || row.status === undefined ? null : !!row.status,
    data_inicio: row.data_inicio ? new Date(row.data_inicio).toLocaleDateString("pt-BR") : null,
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
/* Requisito:
   - Ativo  -> knob à DIREITA (verde), trilho verde
   - Inativo -> knob à ESQUERDA (cinza claro), trilho cinza
   - Sem texto dentro do botão
*/
type Toggle3DProps = {
  active: boolean;          // true = ativo
  disabled?: boolean;
  onClick: () => void;
  ariaLabel?: string;
  scale?: number;           // opcional (ex: 1.3 para +30%)
};
function Toggle3D({ active, disabled, onClick, ariaLabel, scale = 1 }: Toggle3DProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={ariaLabel ?? (active ? "Ativo" : "Inativo")}
      className={[
        "relative inline-flex h-9 items-center rounded-full border transition-colors duration-200",
        "bg-gradient-to-b",
        active
          ? "from-emerald-200 to-emerald-300 border-emerald-400"
          : "from-gray-100 to-gray-200 border-gray-300",
        "shadow-md",
        active ? "shadow-emerald-200/60" : "shadow-gray-300/60",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow-lg"
      ].join(" ")}
      style={{
        width: 72,                        // trilho base
        transform: `scale(${scale})`,     // permite ajuste de 30% com scale={1.3}
        transformOrigin: "left center",
      }}
      title={active ? "Ativo — clique para desativar" : "Inativo — clique para ativar"}
    >
      {/* trilho interno (efeito “inset”) */}
      <span
        aria-hidden="true"
        className={[
          "absolute inset-0 rounded-full shadow-inner",
          active ? "shadow-emerald-600/10" : "shadow-black/10"
        ].join(" ")}
      />
      {/* knob */}
      <span
        aria-hidden="true"
        className={[
          "relative z-10 h-7 w-7 rounded-full bg-white",
          "transition-transform duration-200",
          "shadow-[0_2px_0_#0000000a,0_6px_12px_#0000001a]",
          "border border-black/5"
        ].join(" ")}
        style={{
          transform: active ? "translateX(39px)" : "translateX(6px)",
        }}
      />
      {/* ring suave */}
      <span
        aria-hidden="true"
        className={[
          "absolute inset-0 rounded-full pointer-events-none",
          active ? "ring-1 ring-emerald-700/20" : "ring-1 ring-black/10"
        ].join(" ")}
      />
      <span className="sr-only">{active ? "Ativo" : "Inativo"}</span>
    </button>
  );
}

/* ================== Página ================== */
export default function EmpresasBPOPage() {
  const supabase = createClientComponentClient();

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

  // filtro de status
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // ids salvando para desabilitar o toggle
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const totalPages = useMemo(() => (total ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1), [total]);
  const showingFrom = useMemo(() => (total ? page * PAGE_SIZE + 1 : 0), [page, total]);
  const showingTo = useMemo(() => (total ? Math.min(total, (page + 1) * PAGE_SIZE) : 0), [page, total]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQ, statusFilter]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
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
      const pat = `%${debouncedQ.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      query = query.or(`razao_social.ilike.${pat},nome_fantasia.ilike.${pat},cpf_cnpj.ilike.${pat}`);
    }

    if (statusFilter === "active") {
      query = query.eq("status", true);
    } else if (statusFilter === "inactive") {
      query = query.eq("status", false);
    } // "all" não filtra (inclui null)

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

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedQ, statusFilter]);

  useEffect(() => {
    const channel = supabase
      .channel(`realtime:${TABLE_NAME}`)
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE_NAME }, () => {
        fetchData();
      })
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

    // otimista: atualiza UI
    setItems((prev) =>
      prev.map((it) => (it.codigo_erp === codigo_erp ? { ...it, status: next } : it))
    );
    setSavingIds((prev) => new Set(prev).add(id));

    const { error } = await supabase
      .from(TABLE_NAME)
      .update({ status: next })
      .eq("codigo_erp", codigo_erp);

    setSavingIds((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });

    if (error) {
      console.error("Erro ao atualizar status:", error);
      // rollback se falhar
      setItems((prev) =>
        prev.map((it) => (it.codigo_erp === codigo_erp ? { ...it, status: current } : it))
      );
      setErrorMsg("Não foi possível atualizar o status. Tente novamente.");
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
        ["Cód. ERP", "Razão Social", "Nome Fantasia", "CPF/CNPJ", "Status", "Início", "Honorário Mensal"],
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

      ws["!cols"] = [{ wch: 10 }, { wch: 30 }, { wch: 30 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 15 }];

      const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const cell_address = { c: 6, r: R }; // "Honorário Mensal"
        const cell_ref = XLSX.utils.encode_cell(cell_address);
        if (!ws[cell_ref]) continue;
        ws[cell_ref].t = "n";
        ws[cell_ref].z = "R$ #,##0.00";
      }

      XLSX.utils.book_append_sheet(wb, ws, "EmpresasBPO");
      XLSX.writeFile(wb, `empresas_bpo_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
          "Status": r.status === null ? "" : r.status ? "Ativo" : "Inativo",
          "Início": r.data_inicio ?? "",
          "Honorário Mensal": r.honorario_mensal ?? 0,
        }))
      );
      const csv = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `empresas_bpo_${new Date().toISOString().slice(0, 10)}.csv`;
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
        head: [["Cód. ERP", "Razão Social", "Nome Fantasia", "CPF/CNPJ", "Status", "Início", "Honorário"]],
        body: rows.map((r) => [
          r.codigo_erp,
          r.razao_social ?? "-",
          r.nome_fantasia ?? "-",
          r.cpf_cnpj ?? "-",
          statusLabel(r.status),
          r.data_inicio ?? "-",
          r.honorario_mensal?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "-",
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [64, 64, 64] },
        theme: "grid",
      });

      doc.save(`empresas_bpo_${new Date().toISOString().slice(0, 10)}.pdf`);
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
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Clientes BPO</h1>
          <div className="flex items-center gap-2">
            {/* Filtro de status */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Status:</label>
              <div className="inline-flex overflow-hidden rounded-xl border bg-white">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={[
                    "px-3 py-1.5 text-sm",
                    statusFilter === "all" ? "bg-gray-100 font-medium" : "hover:bg-gray-50"
                  ].join(" ")}
                >
                  Todas
                </button>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={[
                    "px-3 py-1.5 text-sm",
                    statusFilter === "active" ? "bg-emerald-50 text-emerald-700 font-medium" : "hover:bg-gray-50"
                  ].join(" ")}
                >
                  Ativas
                </button>
                <button
                  onClick={() => setStatusFilter("inactive")}
                  className={[
                    "px-3 py-1.5 text-sm",
                    statusFilter === "inactive" ? "bg-gray-50 text-gray-700 font-medium" : "hover:bg-gray-50"
                  ].join(" ")}
                >
                  Inativas
                </button>
              </div>
            </div>

            <Link
              href="/cadastro/clientes-bpo/novo"
              className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 shadow-sm hover:shadow transition"
            >
              <Plus size={18} /> Cadastrar nova
            </Link>
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen((s) => !s)}
                disabled={exporting || total === 0}
                className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 hover:shadow disabled:opacity-60"
                aria-haspopup="menu"
                aria-expanded={exportOpen}
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
                Exportar
              </button>
              <div
                className={`absolute right-0 mt-2 w-48 rounded-2xl border bg-white shadow-xl overflow-hidden z-10 ${
                  exportOpen ? "opacity-100 visible" : "opacity-0 invisible"
                }`}
                role="menu"
              >
                <button onClick={() => { setExportOpen(false); handleExportXLSX(); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50" role="menuitem">
                  Excel (.xlsx)
                </button>
                <button onClick={() => { setExportOpen(false); handleExportCSV(); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50" role="menuitem">
                  CSV (.csv)
                </button>
                <button onClick={() => { setExportOpen(false); handleExportPDF(); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50" role="menuitem">
                  PDF (.pdf)
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="relative max-w-md">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por Razão Social, Nome Fantasia ou CNPJ..."
              className="w-full rounded-2xl border px-10 py-2 outline-none focus:ring-2 focus:ring-black/10"
            />
            <Search className="absolute left-3 top-2.5" size={18} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
            {total !== null && (
              <span>
                Mostrando <strong>{showingFrom || 0}</strong>–<strong>{showingTo || 0}</strong> de{" "}
                <strong>{total}</strong>
              </span>
            )}
            {errorMsg && <span className="text-rose-600">Erro ao carregar: {errorMsg}</span>}
            {exportError && <span className="text-rose-600">Erro ao exportar: {exportError}</span>}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Cód. ERP</th>
                <th className="text-left px-4 py-3">Razão Social</th>
                <th className="text-left px-4 py-3">Nome Fantasia</th>
                <th className="text-left px-4 py-3">CPF/CNPJ</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Início</th>
                <th className="text-left px-4 py-3">Honorário</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" /> Carregando…
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    Nenhuma empresa BPO encontrada.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const saving = savingIds.has(item.id);
                  const isActive = !!item.status;

                  return (
                    <tr key={item.id} className="border-t hover:bg-gray-50/60">
                      <td className="px-4 py-3">{item.codigo_erp}</td>
                      <td className="px-4 py-3">{item.razao_social ?? "-"}</td>
                      <td className="px-4 py-3">{item.nome_fantasia ?? "-"}</td>
                      <td className="px-4 py-3">{item.cpf_cnpj ?? "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Toggle3D
                            active={isActive}
                            disabled={saving}
                            onClick={() => toggleStatus(item.codigo_erp, item.status)}
                            ariaLabel="Status do cliente BPO"
                          />
                          {saving && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">{item.data_inicio ?? "-"}</td>
                      <td className="px-4 py-3">
                        {item.honorario_mensal?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/cadastro/clientes-bpo/${item.id}`}
                            className="rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                            title="Editar"
                          >
                            Editar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-gray-600">
            Página <strong>{page + 1}</strong> de <strong>{totalPages}</strong>
          </div>
          <div className="inline-flex items-center gap-2">
            <button
              onClick={prevPage}
              disabled={page === 0}
              className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 disabled:opacity-50"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              onClick={nextPage}
              disabled={page + 1 >= totalPages}
              className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 disabled:opacity-50"
            >
              Próxima <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
