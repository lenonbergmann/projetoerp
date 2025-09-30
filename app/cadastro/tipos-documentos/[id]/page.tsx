// app/cadastro/tipos-documentos/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import { Loader2 } from "lucide-react";

type TipoDocumento = {
  id: number | string;
  codigo: string | null;
  descricao: string;
  ativo: boolean;
};

export default function EditarTipoDocumentoPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const rawId = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<TipoDocumento>({
    id: "",
    codigo: "",
    descricao: "",
    ativo: true,
  });

  // aceita tanto string quanto number para o filtro
  const idFilter = useMemo(() => {
    if (typeof rawId !== "string" || !rawId) return null;
    const asNum = Number(rawId);
    return Number.isFinite(asNum) ? asNum : rawId;
  }, [rawId]);

  useEffect(() => {
    async function load() {
      if (idFilter == null) return;
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("tipos_documento")
        .select("id, codigo, descricao, ativo")
        .eq("id", idFilter as any)
        .maybeSingle<TipoDocumento>();

      if (error || !data) {
        setErrorMsg(error?.message || "Registro não encontrado.");
        setLoading(false);
        return;
      }

      setForm({
        id: data.id,
        codigo: data.codigo,
        descricao: data.descricao,
        ativo: data.ativo,
      });
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idFilter]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!form.descricao.trim()) {
      alert("Descrição é obrigatória");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const payload = {
      codigo: (form.codigo || "").trim() || null,
      descricao: form.descricao.trim(),
      ativo: form.ativo,
    };

    const up = await supabase
      .from("tipos_documento")
      .update(payload)
      .eq("id", idFilter as any)
      .select("id")
      .maybeSingle();

    if (up.error) {
      console.error("UPDATE tipos_documento error:", up.error);
      setErrorMsg(up.error.message);
      setSaving(false);
      return;
    }
    if (!up.data) {
      setErrorMsg("Nenhum registro foi alterado. Verifique o ID.");
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push("/cadastro/tipos-documentos");
  }

  if (idFilter == null) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-sm text-rose-600">ID inválido.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white border-b">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Editar Tipo de Documento</h1>
          <Link href="/cadastro/tipos-documentos" className="text-sm underline">
            Voltar
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-gray-600 text-sm inline-flex items-center gap-2">
            <Loader2 className="animate-spin" /> Carregando…
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-2xl border">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium">Código</label>
                <input
                  value={form.codigo ?? ""}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  placeholder="Ex.: NF, BOL, CTR… (opcional)"
                  className="mt-1 w-full rounded-xl border px-3 py-2 focus:ring-2 focus:ring-black/10"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Descrição *</label>
                <input
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Ex.: Nota Fiscal, Boleto, Contrato…"
                  className="mt-1 w-full rounded-xl border px-3 py-2 focus:ring-2 focus:ring-black/10"
                  required
                />
              </div>
              <div className="md:col-span-1">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  />
                  Ativo
                </label>
              </div>
            </div>

            {errorMsg ? (
              <p className="mt-3 text-sm text-rose-600">Erro: {errorMsg}</p>
            ) : null}

            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                className="rounded-2xl border px-4 py-2 shadow-sm hover:shadow transition disabled:opacity-60"
                disabled={saving}
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} /> Salvando…
                  </span>
                ) : (
                  "Salvar alterações"
                )}
              </button>
              <Link href="/cadastro/tipos-documentos" className="text-sm">
                Cancelar
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
