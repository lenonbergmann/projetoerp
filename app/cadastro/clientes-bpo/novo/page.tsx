// app/cadastro/clientes-bpo/novo/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import { ArrowLeft, Loader2 } from "lucide-react";

// Componente de Input reutilizável para manter o formulário limpo
function Input({ label, id, ...props }: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="mt-1">
        <input
          id={id}
          name={id}
          className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
          {...props}
        />
      </div>
    </div>
  );
}

const TABLE_NAME = "empresas_bpo";

export default function NovaEmpresaBPOPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());

    // Validação simples: codigo_erp é obrigatório
    if (!data.codigo_erp) {
      setErrorMsg("O campo 'Código ERP' é obrigatório.");
      setLoading(false);
      return;
    }

    // Converte valores vazios para null para o Supabase
    const submission = {
      codigo_erp: data.codigo_erp,
      razao_social: data.razao_social || null,
      nome_fantasia: data.nome_fantasia || null,
      cpf_cnpj: data.cpf_cnpj || null,
      STATUS: data.status || null,
      data_inicio: data.data_inicio || null,
      honorario_mensal: data.honorario_mensal ? Number(data.honorario_mensal) : null,
    };

    const { error } = await supabase.from(TABLE_NAME).insert(submission);

    if (error) {
      console.error("Erro ao inserir empresa:", error);
      setErrorMsg(`Erro ao salvar: ${error.message}`);
      setLoading(false);
    } else {
      setSuccessMsg("Empresa cadastrada com sucesso! Redirecionando...");
      // Redireciona para a página de listagem após um curto intervalo
      setTimeout(() => {
        router.push("/cadastro/clientes-bpo");
        router.refresh(); // Força a atualização dos dados na página de listagem
      }, 1500);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Cadastrar Nova Empresa BPO</h1>
          <Link
            href="/cadastro/clientes-bpo"
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Código ERP"
              id="codigo_erp"
              type="text"
              required
              placeholder="Ex: 102030"
            />
            <Input
              label="Razão Social"
              id="razao_social"
              type="text"
              placeholder="Ex: Empresa Exemplo LTDA"
            />
            <Input
              label="Nome Fantasia"
              id="nome_fantasia"
              type="text"
              placeholder="Ex: Nome Fantasia Exemplo"
            />
            <Input
              label="CPF/CNPJ"
              id="cpf_cnpj"
              type="text"
              placeholder="00.000.000/0001-00"
            />
            <Input
              label="Status"
              id="status"
              type="text"
              placeholder="Ativo"
            />
            <Input
              label="Data de Início"
              id="data_inicio"
              type="date"
            />
            <Input
              label="Honorário Mensal"
              id="honorario_mensal"
              type="number"
              step="0.01"
              placeholder="1500.00"
            />

            {/* Mensagens de feedback */}
            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
            {successMsg && <p className="text-sm text-green-600">{successMsg}</p>}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-black px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800 disabled:bg-gray-400"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
