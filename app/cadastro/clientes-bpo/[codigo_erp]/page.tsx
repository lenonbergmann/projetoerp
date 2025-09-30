// app/cadastro/clientes-bpo/[codigo_erp]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import { ArrowLeft, Loader2 } from "lucide-react";

// Componente de Input reutilizável (o mesmo da página de cadastro)
function Input({ label, id, ...props }: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1">
        <input
          id={id}
          name={id}
          className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm disabled:bg-gray-100"
          {...props}
        />
      </div>
    </div>
  );
}

const TABLE_NAME = "empresas_bpo";

// O `params` é injetado pelo Next.js e contém os segmentos dinâmicos da URL
export default function EditarEmpresaBPOPage({ params }: { params: { codigo_erp: string } }) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const codigo_erp = params.codigo_erp; // Pega o código da URL

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  // Função para buscar os dados da empresa ao carregar a página
  const fetchEmpresa = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(`codigo_erp, razao_social, nome_fantasia, cpf_cnpj, STATUS, data_inicio, honorario_mensal`)
      .eq('codigo_erp', codigo_erp)
      .single(); // .single() espera um único resultado

    if (error) {
      console.error("Erro ao buscar empresa:", error);
      setErrorMsg(`Não foi possível carregar os dados da empresa. Erro: ${error.message}`);
    } else if (data) {
      // Renomeia STATUS para status para consistência no formulário
      const { STATUS, ...rest } = data;
      setFormData({ ...rest, status: STATUS });
    }
    setLoading(false);
  }, [supabase, codigo_erp]);

  // Executa a busca dos dados quando o componente é montado
  useEffect(() => {
    fetchEmpresa();
  }, [fetchEmpresa]);

  // Função para lidar com a mudança nos inputs do formulário
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  }

  // Função para salvar as alterações
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const submission = {
      razao_social: formData.razao_social || null,
      nome_fantasia: formData.nome_fantasia || null,
      cpf_cnpj: formData.cpf_cnpj || null,
      STATUS: formData.status || null,
      data_inicio: formData.data_inicio || null,
      honorario_mensal: formData.honorario_mensal ? Number(formData.honorario_mensal) : null,
    };

    const { error } = await supabase
      .from(TABLE_NAME)
      .update(submission)
      .eq('codigo_erp', codigo_erp); // A condição WHERE para atualizar o registro correto

    if (error) {
      console.error("Erro ao atualizar empresa:", error);
      setErrorMsg(`Erro ao salvar: ${error.message}`);
    } else {
      setSuccessMsg("Empresa atualizada com sucesso!");
      router.refresh(); // Atualiza os dados na página de listagem
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Editar Empresa BPO</h1>
          <Link href="/cadastro/clientes-bpo" className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">
            <ArrowLeft size={16} />
            Voltar
          </Link>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* O Código ERP não é editável, pois é a chave primária */}
            <Input label="Código ERP" id="codigo_erp" type="text" value={formData.codigo_erp || ''} disabled />
            <Input label="Razão Social" id="razao_social" type="text" value={formData.razao_social || ''} onChange={handleChange} />
            <Input label="Nome Fantasia" id="nome_fantasia" type="text" value={formData.nome_fantasia || ''} onChange={handleChange} />
            <Input label="CPF/CNPJ" id="cpf_cnpj" type="text" value={formData.cpf_cnpj || ''} onChange={handleChange} />
            <Input label="Status" id="status" type="text" value={formData.status || ''} onChange={handleChange} />
            <Input label="Data de Início" id="data_inicio" type="date" value={formData.data_inicio || ''} onChange={handleChange} />
            <Input label="Honorário Mensal" id="honorario_mensal" type="number" step="0.01" value={formData.honorario_mensal || ''} onChange={handleChange} />

            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
            {successMsg && <p className="text-sm text-green-600">{successMsg}</p>}

            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center rounded-xl bg-black px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800 disabled:bg-gray-400">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
