// app/cadastro/clientes-fornecedores/novo/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import { Loader2 } from "lucide-react";

const TABLE_NAME = "clientes_fornecedores" as const;

export default function NovoClienteFornecedorPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [form, setForm] = useState({
    nome: "",
    cpf_cnpj: "",
    chave_pix: "",
    ativo: true,
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!form.nome.trim()) {
      setErrorMsg("Informe o Nome.");
      return;
    }

    setSaving(true);

    const payload = {
      CLIENTE_FORNECEDOR: form.nome.trim(),
      CPF_CNPJ: form.cpf_cnpj.trim() || null,
      CHAVE_PIX: form.chave_pix.trim() || null,
      ATIVO: form.ativo,
    };

    const { error } = await supabase.from(TABLE_NAME).insert(payload);
    setSaving(false);

    if (error) {
      console.error("INSERT clientes_fornecedores error:", error);
      setErrorMsg(error.message || "Não foi possível salvar. Tente novamente.");
      return;
    }

    // volta à lista; o realtime já insere o item sem recarregar
    router.push("/cadastro/clientes-fornecedores");
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white border-b">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Novo Cliente/Fornecedor</h1>
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
              "Salvar"
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
