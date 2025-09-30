// app/cadastro/clientes-bpo/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import { Loader2, Plus, Search, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ===== Tipos =====
type EmpresaBPO = {
  id: string;
  codigo_erp: string;
  cpf_cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  status: string | null;
  data_inicio: string | null;
  honorario_mensal: number | null;
};

const TABLE_NAME = "empresas_bpo" as const;
const PAGE_SIZE = 50;
const EXPORT_BATCH = 1000;

function fromRow(row: any): EmpresaBPO {
  return {
    id: String(row.codigo_erp),
    codigo_erp: String(row.codigo_erp),
    cpf_cnpj: row.cpf_cnpj ?? null,
    razao_social: row.razao_social ?? null,
    nome_fantasia: row.nome_fantasia ?? null,
    status: row.status ?? null,
    data_inicio: row.data_inicio ? new Date(row.data_inicio).toLocaleDateString("pt-BR") : null,
    honorario_mensal: row.honorario_mensal ?? null,
  };
}

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

  const totalPages = useMemo(() => (total ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1), [total]);
  const showingFrom = useMemo(() => (total ? page * PAGE_SIZE + 1 : 0), [page, total]);
  const showingTo = useMemo(() => (total ? Math.min(total, (page + 1) * PAGE_SIZE) : 0), [page, total]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQ]);

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
        status:STATUS,
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
  }, [page, debouncedQ]);

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
  }, [page, debouncedQ]);

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
          r.status ?? "",
          r.data_inicio ?? "",
          r.honorario_mensal ?? 0,
        ]),
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      ws["!cols"] = [ 
        {wch:10}, {wch:30}, {wch:30}, {wch:18}, {wch:10}, {wch:12}, {wch:15} 
      ];

      const range = XLSX.utils.decode_range(ws['!ref'] || "A1:A1");
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const cell_address = { c: 6, r: R };
        const cell_ref = XLSX.utils.encode_cell(cell_address);
        if (!ws[cell_ref]) continue;
        ws[cell_ref].t = 'n';
        ws[cell_ref].z = 'R$ #,##0.00';
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
          "Status": r.status ?? "",
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
          r.status ?? "-",
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
    setPage((p) => (total ? (p + 1 < Math.ceil(totalPages) ? p + 1 : p) : p));
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Empresas BPO</h1>
          <div className="flex items-center gap-2">
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
                Mostrando <strong>{showingFrom || 0}</strong>–<strong>{showingTo || 0}</strong> de <strong>{total}</strong>
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
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500"><div className="inline-flex items-center gap-2"><Loader2 className="animate-spin" /> Carregando…</div></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">Nenhuma empresa BPO encontrada.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-gray-50/60">
                    <td className="px-4 py-3">{item.codigo_erp}</td>
                    <td className="px-4 py-3">{item.razao_social ?? "-"}</td>
                    <td className="px-4 py-3">{item.nome_fantasia ?? "-"}</td>
                    <td className="px-4 py-3">{item.cpf_cnpj ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${item.status?.toLowerCase() === 'ativo' ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-gray-100 border-gray-300 text-gray-600"}`}>
                        {item.status ?? "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.data_inicio ?? "-"}</td>
                    <td className="px-4 py-3">{item.honorario_mensal?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {/* ================================================== */}
                        {/* CORREÇÃO ESTÁ AQUI                                 */}
                        {/* Usando a variável `item.id` para criar o link      */}
                        {/* ================================================== */}
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
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-gray-600">Página <strong>{page + 1}</strong> de <strong>{totalPages}</strong></div>
          <div className="inline-flex items-center gap-2">
            <button onClick={prevPage} disabled={page === 0} className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 disabled:opacity-50">
              <ChevronLeft size={16} /> Anterior
            </button>
            <button onClick={nextPage} disabled={page + 1 >= totalPages} className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 disabled:opacity-50">
              Próxima <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
