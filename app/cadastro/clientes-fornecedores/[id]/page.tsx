// app/cadastro/clientes-fornecedores/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import { Loader2 } from "lucide-react";

const TABLE_NAME = "clientes_fornecedores" as const;

type CFItem = {
  id: string;
  nome: string | null;       // CLIENTE_FORNECEDOR
  cpf_cnpj: string | null;   // CPF_CNPJ
  chave_pix: string | null;  // CHAVE_PIX
  ativo: boolean;            // ATIVO
};

export default function EditarClienteFornecedorPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: "",
    cpf_cnpj: "",
    chave_pix: "",
    ativo: true,
  });

  // guardamos o CPF/CNPJ original para atualizar os correlatos
  const [origCpfCnpj, setOrigCpfCnpj] = useState<string | null>(null);

  const validId = useMemo(() => typeof id === "string" && id.length > 0, [id]);

  useEffect(() => {
    async function load() {
      if (!validId) return;
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(
          "id:ID, nome:CLIENTE_FORNECEDOR, cpf_cnpj:CPF_CNPJ, chave_pix:CHAVE_PIX, ativo:ATIVO"
        )
        .eq("ID", id)
        .maybeSingle<CFItem>();

      if (error || !data) {
        setLoadError(error?.message || "Registro não encontrado.");
        setLoading(false);
        return;
      }

      setForm({
        nome: data.nome ?? "",
        cpf_cnpj: data.cpf_cnpj ?? "",
        chave_pix: data.chave_pix ?? "",
        ativo: !!data.ativo,
      });
      setOrigCpfCnpj(data.cpf_cnpj ?? null);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!form.nome.trim()) {
      alert("Informe o Nome.");
      return;
    }

    setSaving(true);

    // payload para atualização
    const payload = {
      CLIENTE_FORNECEDOR: form.nome.trim(),
      CPF_CNPJ: form.cpf_cnpj.trim() || null,
      CHAVE_PIX: form.chave_pix.trim() || null,
      ATIVO: form.ativo,
    };

    // 1) Atualiza o registro pelo ID
    const up1 = await supabase.from(TABLE_NAME).update(payload).eq("ID", id as string);

    if (up1.error) {
      console.error(up1.error);
      alert("Não foi possível salvar. Tente novamente.");
      setSaving(false);
      return;
    }

    // 2) Atualiza TODOS os registros que tinham o mesmo CPF/CNPJ ORIGINAL (se existir)
    //    Obs.: usamos eq + neq (sem .or) para evitar problemas de encoding/aspas
    if (origCpfCnpj) {
      const up2 = await supabase
        .from(TABLE_NAME)
        .update(payload)
        .eq("CPF_CNPJ", origCpfCnpj)
        .neq("ID", id as string);

      if (up2.error) {
        console.error(up2.error);
        // não impedimos a navegação; apenas avisamos
        alert("Registro principal salvo, mas a atualização dos relacionados falhou.");
      }
    }

    setSaving(false);
    router.push("/cadastro/clientes-fornecedores");
  }

  if (!validId) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-sm text-red-600">ID inválido.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white border-b">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Editar Cliente/Fornecedor</h1>
          <Link href="/cadastro/clientes-fornecedores" className="text-sm underline">
            Voltar
          </Link>
        </div>
      </div>

      <form onSubmit={handleSave} className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-2xl border">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium">Nome *</label>
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="mt-1 w-full rounded-xl border px-3 py-2 focus:ring-2 focus:ring-black/10"
              required
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium">CPF/CNPJ</label>
            <input
              value={form.cpf_cnpj}
              onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
              className="mt-1 w-full rounded-xl border px-3 py-2 focus:ring-2 focus:ring-black/10"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Chave Pix</label>
            <input
              value={form.chave_pix}
              onChange={(e) => setForm({ ...form, chave_pix: e.target.value })}
              placeholder="e-mail, CPF/CNPJ, aleatória, telefone…"
              className="mt-1 w-full rounded-xl border px-3 py-2 focus:ring-2 focus:ring-black/10"
            />
          </div>
          <div className="md:col-span-1 flex items-center gap-3">
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
          <Link href="/cadastro/clientes-fornecedores" className="text-sm">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
