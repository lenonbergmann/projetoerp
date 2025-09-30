// app/cadastro/tipos-documentos/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import {
  Loader2,
  Plus,
  Search,
  ChevronDown,
} from "lucide-react";

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

const LOGO_URL =
  "https://jhjwxjixgjhueyupkvoz.supabase.co/storage/v1/object/public/logos-empresas/projetoBPOlogo.png";

export default function TiposDocumentosPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [itens, setItens] = useState<TipoDocumento[]>([]);
  const [q, setQ] = useState("");
  const [savingId, setSavingId] = useState<string | number | null>(null);

  // Export states
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);

  async function fetchData() {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("tipos_documento") // <- confirme esse nome se necessário
      .select("id, codigo, descricao, ativo, created_at")
      .order("descricao", { ascending: true });

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
  }, []);

  // Fecha dropdown de export ao clicar fora / ESC
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

  const filtrados = useMemo(() => {
    if (!q) return itens;
    const t = q.toLowerCase();
    return itens.filter(
      (i) =>
        (i.codigo || "").toLowerCase().includes(t) ||
        i.descricao.toLowerCase().includes(t)
    );
  }, [itens, q]);

  async function toggleAtivo(id: string | number, valorAtual: boolean) {
    setSavingId(id);
    setItens((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ativo: !valorAtual } : i))
    );

    const { error } = await supabase
      .from("tipos_documento")
      .update({ ativo: !valorAtual })
      .eq("id", id);

    if (error) {
      console.error("UPDATE tipos_documento error:", error);
      setItens((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ativo: valorAtual } : i))
      );
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

  // ------- Exportações -------
  async function handleExportXLSX() {
    try {
      setExportError(null);
      setExporting(true);
      const rows = filtrados; // exporta o que está filtrado na tela
      const wsData = [
        ["Código", "Descrição", "Status"],
        ...rows.map((r) => [
          r.codigo ?? "",
          r.descricao ?? "",
          r.ativo ? "Ativo" : "Inativo",
        ]),
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "TiposDocumentos");
      XLSX.writeFile(
        wb,
        `tipos_documentos_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
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
      a.download = `tipos_documentos_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
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
          const x = 10;
          const y = 8;
          const w = 22;
          const h = 22;
          doc.addImage(dataUrl, "PNG", x, y, w, h);
          startY = y + h + 4; // tabela começa abaixo da logo
        }
      } catch {
        // silencioso
      }

      // Tabela com cabeçalho cinza escuro
      autoTable(doc, {
        startY,
        head: [["Código", "Descrição", "Status"]],
        body: rows.map((r) => [
          r.codigo ?? "",
          r.descricao ?? "",
          r.ativo ? "Ativo" : "Inativo",
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [64, 64, 64], textColor: [255, 255, 255] },
        theme: "grid",
      });

      // Data/hora no rodapé direito
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
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
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
          {errorMsg ? (
            <p className="mt-2 text-sm text-rose-600">
              Erro ao carregar: {errorMsg}
            </p>
          ) : null}
          {exportError ? (
            <p className="mt-2 text-sm text-rose-600">
              Erro ao exportar: {exportError}
            </p>
          ) : null}
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
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" /> Carregando…
                    </div>
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    Nenhum tipo de documento encontrado.
                  </td>
                </tr>
              ) : (
                filtrados.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-mono">{item.codigo}</td>
                    <td className="px-4 py-3">{item.descricao}</td>
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
                          href={`/cadastro/tipos-documentos/${item.id}`}
                          className="rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                          title="Editar"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => toggleAtivo(item.id, item.ativo)}
                          className="rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-60"
                          disabled={savingId === item.id}
                          title={item.ativo ? "Desativar" : "Reativar"}
                        >
                          {savingId === item.id ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="animate-spin" size={14} />{" "}
                              Salvando…
                            </span>
                          ) : item.ativo ? (
                            "Desativar"
                          ) : (
                            "Ativar"
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
