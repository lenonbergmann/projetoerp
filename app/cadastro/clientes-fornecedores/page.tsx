// app/cadastro/clientes-fornecedores/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import { Loader2, Plus, Search, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
// Export: instale antes -> npm i xlsx jspdf jspdf-autotable
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ===== Tipos =====
type CFItem = {
  id: string; // "ID"
  nome: string | null; // "CLIENTE_FORNECEDOR"
  cpf_cnpj: string | null; // "CPF_CNPJ"
  chave_pix: string | null; // "CHAVE_PIX"
  ativo: boolean; // "ATIVO"
};

const TABLE_NAME = "clientes_fornecedores" as const;
const PAGE_SIZE = 50; // ajuste conforme necessário
const EXPORT_BATCH = 1000; // lote ao exportar tudo

// Normaliza uma linha (maiúsculas vs minúsculas e id number/string)
function fromRow(row: any): CFItem {
  return {
    id: String(row.ID ?? row.id),
    nome: row.CLIENTE_FORNECEDOR ?? row.nome ?? null,
    cpf_cnpj: row.CPF_CNPJ ?? row.cpf_cnpj ?? null,
    chave_pix: row.CHAVE_PIX ?? row.chave_pix ?? null,
    ativo: Boolean(row.ATIVO ?? row.ativo),
  };
}

export default function ClientesFornecedoresPage() {
  const supabase = createClientComponentClient();

  // ===== States =====
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [items, setItems] = useState<CFItem[]>([]);
  const [q, setQ] = useState<string>("");
  const [debouncedQ, setDebouncedQ] = useState<string>("");

  const [page, setPage] = useState<number>(0); // 0-based
  const [total, setTotal] = useState<number | null>(null);

  // Export helpers
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState<boolean>(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  // Debug opcional
  const [dbMaxId, setDbMaxId] = useState<string | null>(null);

  const totalPages = useMemo(() => (total ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1), [total]);
  const showingFrom = useMemo(() => (total ? page * PAGE_SIZE + 1 : 0), [page, total]);
  const showingTo = useMemo(() => (total ? Math.min(total, (page + 1) * PAGE_SIZE) : 0), [page, total]);

  // Debounce da busca (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Quando a busca muda, resetar para página 0
  useEffect(() => {
    setPage(0);
  }, [debouncedQ]);

  // Fechar dropdown export ao clicar fora/ESC
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!exportRef.current) return;
      if (!exportRef.current.contains(e.target as Node)) setExportOpen(false);
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

  // ===== Query builder =====
  function buildBaseQuery() {
    let query = supabase
      .from(TABLE_NAME)
      .select(
        `
        id:"ID",
        nome:"CLIENTE_FORNECEDOR",
        cpf_cnpj:"CPF_CNPJ",
        chave_pix:"CHAVE_PIX",
        ativo:"ATIVO"
        `,
        { count: "exact" }
      )
      .order("ID", { ascending: false });

    if (debouncedQ) {
      const pat = `%${debouncedQ.replace(/%/g, "\%").replace(/_/g, "\_")}%`;
      query = query.or(`"CLIENTE_FORNECEDOR".ilike.${pat},"CPF_CNPJ".ilike.${pat},"CHAVE_PIX".ilike.${pat}`);
    }
    return query;
  }

  // ===== Fetch page =====
  async function fetchData(): Promise<void> {
    setLoading(true);
    setErrorMsg(null);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await buildBaseQuery().range(from, to);

    if (error) {
      console.error("SELECT clientes_fornecedores error:", error);
      setErrorMsg(error.message);
      setItems([]);
      setTotal(0);
    } else {
      const normalized = (data ?? []).map((r: any) => ({ ...r, id: String(r.id) })) as CFItem[];
      setItems(normalized);
      setTotal(count ?? 0);
    }
    setLoading(false);

    // debug: maior ID no banco (apenas quando sem busca)
    if (!debouncedQ) {
      const maxq = await supabase
        .from(TABLE_NAME)
        .select(`"ID"`)
        .order("ID", { ascending: false })
        .limit(1);
      if (!maxq.error && maxq.data && maxq.data.length > 0) {
        setDbMaxId(String((maxq.data as any[])[0].ID));
      }
    } else {
      setDbMaxId(null);
    }
  }

  // Carga inicial e sempre que page/debouncedQ mudar
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedQ]);

  // ===== Realtime =====
  useEffect(() => {
    const channel = supabase
      .channel("realtime:clientes_fornecedores")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE_NAME },
        async (payload) => {
          if (debouncedQ || page !== 0) return; // evite misturar paginação/filtro

          if (payload.eventType === "INSERT") {
            const novo = fromRow(payload.new);
            setItems((prev) => {
              if (prev.some((i) => i.id === novo.id)) return prev;
              const next = [novo, ...prev];
              return next.slice(0, PAGE_SIZE);
            });
            setTotal((t) => (t == null ? t : t + 1));
          } else if (payload.eventType === "UPDATE") {
            const upd = fromRow(payload.new);
            setItems((prev) => prev.map((i) => (i.id === upd.id ? upd : i)));
          } else if (payload.eventType === "DELETE") {
            const oldId = String((payload.old as any)?.ID ?? (payload.old as any)?.id);
            setItems((prev) => prev.filter((i) => i.id !== oldId));
            setTotal((t) => (t == null ? t : Math.max(0, t - 1)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedQ]);

  // ===== Export helpers =====
  // Carregar logo de /public/logo.png
  const LOGO_URL = "https://jhjwxjixgjhueyupkvoz.supabase.co/storage/v1/object/public/logos-empresas/projetoBPOlogo.png"; // ajuste se necessário
  let logoCache: string | null = null;
  async function getLogoDataUrl(): Promise<string | null> {
    if (logoCache !== null) return logoCache;
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = LOGO_URL;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return (logoCache = null);
      ctx.drawImage(img, 0, 0);
      logoCache = canvas.toDataURL("image/png");
      return logoCache;
    } catch {
      return (logoCache = null);
    }
  }

  // Busca todos os registros que batem com o filtro atual (em lotes) – para exportar tudo
  async function fetchAllMatching(): Promise<CFItem[]> {
    setExportError(null);
    const head = await buildBaseQuery().range(0, 0);
    if (head.error) throw head.error;
    const totalCount = head.count ?? 0;
    if (totalCount === 0) return [];

    const all: CFItem[] = [];
    for (let from = 0; from < totalCount; from += EXPORT_BATCH) {
      const to = Math.min(from + EXPORT_BATCH - 1, totalCount - 1);
      const { data, error } = await buildBaseQuery().range(from, to);
      if (error) throw error;
      const normalized = (data ?? []).map((r: any) => ({ ...r, id: String(r.id) })) as CFItem[];
      all.push(...normalized);
    }
    return all;
  }

  async function handleExportXLSX(): Promise<void> {
    try {
      setExporting(true);
      const rows = await fetchAllMatching();
      const wsData = [
        ["ID", "Nome", "CPF/CNPJ", "Chave Pix", "Status"],
        ...rows.map((r: CFItem) => [r.id, r.nome ?? "", r.cpf_cnpj ?? "", r.chave_pix ?? "", r.ativo ? "Ativo" : "Inativo"]),
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "ClientesFornecedores");
      XLSX.writeFile(wb, `clientes_fornecedores_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
        rows.map((r: CFItem) => ({
          ID: r.id,
          Nome: r.nome ?? "",
          CPF_CNPJ: r.cpf_cnpj ?? "",
          Chave_Pix: r.chave_pix ?? "",
          Status: r.ativo ? "Ativo" : "Inativo",
        }))
      );
      const csv = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clientes_fornecedores_${new Date().toISOString().slice(0, 10)}.csv`;
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

      // ===== Logo no topo esquerdo
      let startY = 14; // altura padrão do topo caso não tenha logo
      try {
        const dataUrl = await getLogoDataUrl();
        if (dataUrl) {
          const x = 10;
          const y = 8;
          const w = 22; // largura da imagem em mm
          const h = 22; // altura da imagem em mm
          doc.addImage(dataUrl, "PNG", x, y, w, h);
          startY = y + h + 4; // tabela começa depois da logo
        }
      } catch {}

      // ===== Tabela com cabeçalho cinza escuro (e startY para não sobrepor a logo)
      autoTable(doc, {
        startY,
        head: [["ID", "Nome", "CPF/CNPJ", "Chave Pix", "Status"]],
        body: rows.map((r: CFItem) => [r.id, r.nome ?? "", r.cpf_cnpj ?? "", r.chave_pix ?? "", r.ativo ? "Ativo" : "Inativo"]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [64, 64, 64], textColor: [255, 255, 255] },
        theme: "grid",
      });

      // ===== Data/hora no canto inferior direito
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const ts = new Date().toLocaleString("pt-BR");
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(ts, pageW - 10, pageH - 8, { align: "right" });

      doc.save(`clientes_fornecedores_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e: any) {
      console.error("Export PDF error:", e);
      setExportError(e?.message || String(e));
    } finally {
      setExporting(false);
    }
  }

  // ===== Paginação handlers =====
  function prevPage(): void {
    setPage((p) => Math.max(0, p - 1));
  }
  function nextPage(): void {
    setPage((p) => (total ? (p + 1 < Math.ceil(total / PAGE_SIZE) ? p + 1 : p) : p));
  }

  // ===== Render =====
  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Clientes e Fornecedores</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/cadastro/clientes-fornecedores/novo"
              className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 shadow-sm hover:shadow transition"
            >
              <Plus size={18} /> Cadastrar novo
            </Link>
            {/* Exportar (dropdown) */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen((s) => !s)}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 hover:shadow disabled:opacity-60"
                aria-haspopup="menu"
                aria-expanded={exportOpen}
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
                Exportar
              </button>
              <div
                className={`absolute right-0 mt-2 w-48 rounded-2xl border bg-white shadow-xl overflow-hidden ${
                  exportOpen ? "opacity-100 visible" : "opacity-0 invisible"
                }`}
                role="menu"
              >
                <button
                  onClick={() => {
                    setExportOpen(false);
                    handleExportXLSX();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  role="menuitem"
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => {
                    setExportOpen(false);
                    handleExportCSV();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  role="menuitem"
                >
                  CSV (.csv)
                </button>
                <button
                  onClick={() => {
                    setExportOpen(false);
                    handleExportPDF();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  role="menuitem"
                >
                  PDF (.pdf)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Busca + Erro + Debug */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, CPF/CNPJ ou chave pix…"
              className="w-full rounded-2xl border px-10 py-2 outline-none focus:ring-2 focus:ring-black/10"
            />
            <Search className="absolute left-3 top-2.5" size={18} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
            {total !== null ? (
              <span>
                Mostrando <strong>{showingFrom || 0}</strong>–<strong>{showingTo || 0}</strong> de <strong>{total}</strong>
              </span>
            ) : null}
            {dbMaxId ? <span>Maior ID no banco: <strong>{dbMaxId}</strong></span> : null}
            {errorMsg ? <span className="text-rose-600">Erro ao carregar: {errorMsg}</span> : null}
            {exportError ? <span className="text-rose-600">Erro ao exportar: {exportError}</span> : null}
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-hidden rounded-2xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">CPF/CNPJ</th>
                <th className="text-left px-4 py-3">Chave Pix</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" /> Carregando…
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                items.map((item: CFItem) => (
                  <tr key={item.id} className="border-t hover:bg-gray-50/60">
                    <td className="px-4 py-3">{item.nome ?? "-"}</td>
                    <td className="px-4 py-3">{item.cpf_cnpj ?? "-"}</td>
                    <td className="px-4 py-3">{item.chave_pix ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${
                          item.ativo
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-rose-50 border-rose-200 text-rose-700"
                        }`}
                      >
                        {item.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/cadastro/clientes-fornecedores/${item.id}`}
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

        {/* Paginação */}
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
