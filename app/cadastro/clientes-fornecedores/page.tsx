// app/cadastro/clientes-fornecedores/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import { Loader2, Plus, Search, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/* ========= Tipos ========= */
type CFItem = {
  id: string;               // "ID"
  nome: string | null;      // "CLIENTE_FORNECEDOR"
  cpf_cnpj: string | null;  // "CPF_CNPJ"
  chave_pix: string | null; // "CHAVE_PIX"
  ativo: boolean;           // "ATIVO"
};

type StatusFilter = "all" | "active" | "inactive";

const TABLE_NAME = "clientes_fornecedores" as const;
const PAGE_SIZE = 50;
const EXPORT_BATCH = 1000;

/* ========= Normalização ========= */
function fromRow(row: any): CFItem {
  return {
    id: String(row.ID ?? row.id),
    nome: row.CLIENTE_FORNECEDOR ?? row.nome ?? null,
    cpf_cnpj: row.CPF_CNPJ ?? row.cpf_cnpj ?? null,
    chave_pix: row.CHAVE_PIX ?? row.chave_pix ?? null,
    ativo: Boolean(row.ATIVO ?? row.ativo),
  };
}

/* ========= Toggle 3D Reutilizável =========
   - Ativo  -> knob à DIREITA (verde), trilho verde
   - Inativo -> knob à ESQUERDA (cinza claro), trilho cinza
   - Sem texto dentro do botão
*/
type Toggle3DProps = {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel?: string;
  scale?: number; // ex.: 1.3 = +30%
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
        width: 72,
        transform: `scale(${scale})`,
        transformOrigin: "left center",
      }}
      title={active ? "Ativo — clique para desativar" : "Inativo — clique para ativar"}
    >
      <span
        aria-hidden="true"
        className={[
          "absolute inset-0 rounded-full shadow-inner",
          active ? "shadow-emerald-600/10" : "shadow-black/10"
        ].join(" ")}
      />
      <span
        aria-hidden="true"
        className={[
          "relative z-10 h-7 w-7 rounded-full bg-white",
          "transition-transform duration-200",
          "shadow-[0_2px_0_#0000000a,0_6px_12px_#0000001a]",
          "border border-black/5"
        ].join(" ")}
        style={{ transform: active ? "translateX(39px)" : "translateX(6px)" }}
      />
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

/* ========= Página ========= */
export default function ClientesFornecedoresPage() {
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [items, setItems] = useState<CFItem[]>([]);
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

  // Debug opcional
  const [dbMaxId, setDbMaxId] = useState<string | null>(null);

  const totalPages = useMemo(() => (total ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1), [total]);
  const showingFrom = useMemo(() => (total ? page * PAGE_SIZE + 1 : 0), [page, total]);
  const showingTo = useMemo(() => (total ? Math.min(total, (page + 1) * PAGE_SIZE) : 0), [page, total]);

  /* ---- Debounce ---- */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  /* ---- Resetar página quando filtros mudam ---- */
  useEffect(() => {
    setPage(0);
  }, [debouncedQ, statusFilter]);

  /* ---- Fechar dropdown export ao clicar fora/ESC ---- */
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

  /* ---- Query builder ---- */
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
      const pat = `%${debouncedQ.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      // use as colunas quoted
      query = query.or(`"CLIENTE_FORNECEDOR".ilike.${pat},"CPF_CNPJ".ilike.${pat},"CHAVE_PIX".ilike.${pat}`);
    }

    // filtro de status (ATIVO boolean)
    if (statusFilter === "active") {
      query = query.eq("ATIVO", true);
    } else if (statusFilter === "inactive") {
      query = query.eq("ATIVO", false);
    }

    return query;
  }

  /* ---- Fetch page ---- */
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
      const normalized = (data ?? []).map(fromRow);
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
      } else {
        setDbMaxId(null);
      }
    } else {
      setDbMaxId(null);
    }
  }

  /* ---- Carga inicial e sempre que page/debouncedQ/statusFilter mudar ---- */
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedQ, statusFilter]);

  /* ---- Realtime ---- */
  useEffect(() => {
    const channel = supabase
      .channel("realtime:clientes_fornecedores")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE_NAME },
        async (payload) => {
          // para evitar confundir paginação/filtro, só aplico na primeira página sem busca
          if (debouncedQ || page !== 0) return;

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

  /* ---- Toggle status (ATIVO boolean) com update otimista ---- */
  async function toggleAtivo(id: string, atual: boolean) {
    const next = !atual;

    // otimista
    setSavingIds((s) => new Set(s).add(id));
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ativo: next } : it)));

    const idNum = Number(id);
    const idFilter = Number.isFinite(idNum) ? idNum : id;
    const { error } = await supabase.from(TABLE_NAME).update({ ATIVO: next }).eq("ID", idFilter);

    setSavingIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });

    if (error) {
      // rollback
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ativo: atual } : it)));
      setErrorMsg("Não foi possível atualizar o status. Tente novamente.");
      console.error("UPDATE ATIVO error:", error);
    }
  }

  /* ---- Export helpers ---- */
  const LOGO_URL =
    "https://jhjwxjixgjhueyupkvoz.supabase.co/storage/v1/object/public/logos-empresas/projetoBPOlogo.png"; // ajuste se necessário
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
      all.push(...(data ?? []).map(fromRow));
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

      // Logo no topo esquerdo
      let startY = 14;
      try {
        const dataUrl = await getLogoDataUrl();
        if (dataUrl) {
          const x = 10, y = 8, w = 22, h = 22;
          doc.addImage(dataUrl, "PNG", x, y, w, h);
          startY = y + h + 4;
        }
      } catch {}

      autoTable(doc, {
        startY,
        head: [["ID", "Nome", "CPF/CNPJ", "Chave Pix", "Status"]],
        body: rows.map((r: CFItem) => [r.id, r.nome ?? "", r.cpf_cnpj ?? "", r.chave_pix ?? "", r.ativo ? "Ativo" : "Inativo"]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [64, 64, 64], textColor: [255, 255, 255] },
        theme: "grid",
      });

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

  /* ========= Paginação ========= */
  function prevPage(): void {
    setPage((p) => Math.max(0, p - 1));
  }
  function nextPage(): void {
    setPage((p) => (total ? (p + 1 < Math.ceil(total / PAGE_SIZE) ? p + 1 : p) : p));
  }

  /* ========= Render ========= */
  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Clientes e Fornecedores</h1>
          <div className="flex items-center gap-2">
            {/* Filtro de status */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Status:</label>
              <div className="inline-flex overflow-hidden rounded-xl border bg-white">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={["px-3 py-1.5 text-sm", statusFilter === "all" ? "bg-gray-100 font-medium" : "hover:bg-gray-50"].join(" ")}
                >
                  Todas
                </button>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={["px-3 py-1.5 text-sm", statusFilter === "active" ? "bg-emerald-50 text-emerald-700 font-medium" : "hover:bg-gray-50"].join(" ")}
                >
                  Ativas
                </button>
                <button
                  onClick={() => setStatusFilter("inactive")}
                  className={["px-3 py-1.5 text-sm", statusFilter === "inactive" ? "bg-gray-50 text-gray-700 font-medium" : "hover:bg-gray-50"].join(" ")}
                >
                  Inativas
                </button>
              </div>
            </div>

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
            {total !== null && (
              <span>
                Mostrando <strong>{showingFrom || 0}</strong>–<strong>{showingTo || 0}</strong> de <strong>{total}</strong>
              </span>
            )}
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
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">Nenhum registro encontrado.</td>
                </tr>
              ) : (
                items.map((item) => {
                  const saving = savingIds.has(item.id);
                  return (
                    <tr key={item.id} className="border-t hover:bg-gray-50/60">
                      <td className="px-4 py-3">{item.nome ?? "-"}</td>
                      <td className="px-4 py-3">{item.cpf_cnpj ?? "-"}</td>
                      <td className="px-4 py-3">{item.chave_pix ?? "-"}</td>

                      {/* Status (ATIVO) com Toggle 3D */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Toggle3D
                            active={item.ativo}
                            disabled={saving}
                            onClick={() => toggleAtivo(item.id, item.ativo)}
                            ariaLabel="Status do cliente/fornecedor"
                          />
                          {saving && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                        </div>
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
                  );
                })
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
