// app/cadastro/tipos-documentos/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import { Loader2, Plus, Search, ChevronDown } from "lucide-react";

// Export libs
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type TipoDocumento = {
  id: string | number;
  codigo: string | null;
  descricao: string;
  ativo: boolean;
  created_at?: string;
};

type StatusFilter = "all" | "active" | "inactive";

const LOGO_URL =
  "https://jhjwxjixgjhueyupkvoz.supabase.co/storage/v1/object/public/logos-empresas/projetoBPOlogo.png";

/* =============== Toggle 3D reutilizável =============== */
type Toggle3DProps = {
  active: boolean;          // true = Ativo (verde/direita)
  disabled?: boolean;
  onClick: () => void;
  ariaLabel?: string;
  scale?: number;           // ex.: 1.3 = +30%
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
      {/* trilho/“inset” */}
      <span
        aria-hidden
        className={[
          "absolute inset-0 rounded-full shadow-inner",
          active ? "shadow-emerald-600/10" : "shadow-black/10"
        ].join(" ")}
      />
      {/* knob */}
      <span
        aria-hidden
        className={[
          "relative z-10 h-7 w-7 rounded-full bg-white",
          "transition-transform duration-200",
          "shadow-[0_2px_0_#0000000a,0_6px_12px_#0000001a]",
          "border border-black/5"
        ].join(" ")}
        style={{ transform: active ? "translateX(39px)" : "translateX(6px)" }}
      />
      {/* ring suave */}
      <span
        aria-hidden
        className={[
          "absolute inset-0 rounded-full pointer-events-none",
          active ? "ring-1 ring-emerald-700/20" : "ring-1 ring-black/10"
        ].join(" ")}
      />
      <span className="sr-only">{active ? "Ativo" : "Inativo"}</span>
    </button>
  );
}

export default function TiposDocumentosPage() {
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [itens, setItens] = useState<TipoDocumento[]>([]);
  const [q, setQ] = useState("");

  // filtro de status (aplicado no SELECT)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // saving por linha
  const [savingId, setSavingId] = useState<string | number | null>(null);

  // Export states
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);

  // debounce de busca
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // fechar dropdown export ao clicar fora / ESC
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

  async function fetchData() {
    setLoading(true);
    setErrorMsg(null);

    let query = supabase
      .from("tipos_documento")
      .select("id, codigo, descricao, ativo, created_at")
      .order("descricao", { ascending: true });

    if (debouncedQ) {
      const pat = `%${debouncedQ.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      query = query.or(`codigo.ilike.${pat},descricao.ilike.${pat}`);
    }

    if (statusFilter === "active") {
      query = query.eq("ativo", true);
    } else if (statusFilter === "inactive") {
      query = query.eq("ativo", false);
    }

    const { data, error } = await query;

    if (error) {
      console.error("SELECT tipos_documento error:", error);
      setErrorMsg(error.message);
      setItens([]);
    } else {
      setItens((data || []) as TipoDocumento[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, statusFilter]);

  const filtrados = useMemo(() => {
    if (!debouncedQ) return itens;
    const t = debouncedQ.toLowerCase();
    return itens.filter(
      (i) => (i.codigo || "").toLowerCase().includes(t) || i.descricao.toLowerCase().includes(t)
    );
  }, [itens, debouncedQ]);

  async function toggleAtivo(id: string | number, valorAtual: boolean) {
    setSavingId(id);
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, ativo: !valorAtual } : i)));

    const { error } = await supabase.from("tipos_documento").update({ ativo: !valorAtual }).eq("id", id);

    if (error) {
      console.error("UPDATE tipos_documento error:", error);
      setItens((prev) => prev.map((i) => (i.id === id ? { ...i, ativo: valorAtual } : i)));
      alert("Não foi possível alterar o status. Tente novamente.");
    }
    setSavingId(null);
  }

  // ------- Helpers: logo para PDF -------
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

  // ------- Exportações (exporta os itens filtrados na tela) -------
  async function handleExportXLSX() {
    try {
      setExportError(null);
      setExporting(true);
      const rows = filtrados;
      const wsData = [
        ["Código", "Descrição", "Status"],
        ...rows.map((r) => [r.codigo ?? "", r.descricao ?? "", r.ativo ? "Ativo" : "Inativo"]),
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "TiposDocumentos");
      XLSX.writeFile(wb, `tipos_documentos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e: any) {
      setExportError(e?.message || String(e));
    } finally {
      setExporting(false);
    }
  }

  async function handleExportCSV() {
    try {
      setExportError(null);
      setExporting(true);
      const rows = filtrados;
      const ws = XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          Codigo: r.codigo ?? "",
          Descricao: r.descricao ?? "",
          Status: r.ativo ? "Ativo" : "Inativo",
        }))
      );
      const csv = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tipos_documentos_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setExportError(e?.message || String(e));
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPDF() {
    try {
      setExportError(null);
      setExporting(true);
      const rows = filtrados;

      const doc = new jsPDF({ orientation: "landscape" });

      // Logo no topo esquerdo
      let startY = 14; // fallback
      try {
        const dataUrl = await getLogoDataUrl();
        if (dataUrl) {
          const x = 10, y = 8, w = 22, h = 22;
          doc.addImage(dataUrl, "PNG", x, y, w, h);
          startY = y + h + 4;
        }
      } catch {}

      // Tabela
      autoTable(doc, {
  startY,
  head: [["Código", "Descrição", "Status"]],
  body: rows.map((r) => [r.codigo ?? "", r.descricao ?? "", r.ativo ? "Ativo" : "Inativo"]),
  styles: { fontSize: 8 },
  headStyles: { fillColor: [64, 64, 64], textColor: [255, 255, 255] },
  theme: "grid",
});


      // timestamp
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const ts = new Date().toLocaleString("pt-BR");
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(ts, pageW - 10, pageH - 8, { align: "right" });

      doc.save(`tipos_documentos_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e: any) {
      setExportError(e?.message || String(e));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Tipos de Documentos</h1>

          <div className="flex items-center gap-2">
            {/* Filtro de status */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Status:</label>
              <div className="inline-flex overflow-hidden rounded-xl border bg-white">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={["px-3 py-1.5 text-sm", statusFilter === "all" ? "bg-gray-100 font-medium" : "hover:bg-gray-50"].join(" ")}
                >
                  Todos
                </button>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={["px-3 py-1.5 text-sm", statusFilter === "active" ? "bg-emerald-50 text-emerald-700 font-medium" : "hover:bg-gray-50"].join(" ")}
                >
                  Ativos
                </button>
                <button
                  onClick={() => setStatusFilter("inactive")}
                  className={["px-3 py-1.5 text-sm", statusFilter === "inactive" ? "bg-gray-50 text-gray-700 font-medium" : "hover:bg-gray-50"].join(" ")}
                >
                  Inativos
                </button>
              </div>
            </div>

            <Link
              href="/cadastro/tipos-documentos/novo"
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

        {/* Busca + Erro */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por código ou descrição…"
              className="w-full rounded-2xl border px-10 py-2 outline-none focus:ring-2 focus:ring-black/10"
            />
            <Search className="absolute left-3 top-2.5" size={18} />
          </div>
          {errorMsg ? <p className="mt-2 text-sm text-rose-600">Erro ao carregar: {errorMsg}</p> : null}
          {exportError ? <p className="mt-2 text-sm text-rose-600">Erro ao exportar: {exportError}</p> : null}
        </div>

        {/* Tabela */}
        <div className="overflow-hidden rounded-2xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Código</th>
                <th className="text-left px-4 py-3">Descrição</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" /> Carregando…
                    </div>
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                    Nenhum tipo de documento encontrado.
                  </td>
                </tr>
              ) : (
                filtrados.map((item) => {
                  const saving = savingId === item.id;
                  return (
                    <tr key={item.id} className="border-t hover:bg-gray-50/60">
                      <td className="px-4 py-3 font-mono">{item.codigo}</td>
                      <td className="px-4 py-3">{item.descricao}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Toggle3D
                            active={item.ativo}
                            disabled={saving}
                            onClick={() => toggleAtivo(item.id, item.ativo)}
                            ariaLabel="Status do tipo de documento"
                          />
                          {saving && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/cadastro/tipos-documentos/${item.id}`}
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
      </main>
    </div>
  );
}
