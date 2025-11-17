// app/cadastro/clientes-bpo/novo/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import { ArrowLeft, Building2, Loader2, Info } from "lucide-react";

/* ========================================================================
 * Input simples reutilizável
 * ====================================================================== */
function InputField({
  label,
  id,
  required,
  ...props
}: {
  label: string;
  id: string;
  required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-neutral-800 dark:text-neutral-100"
      >
        {label}{" "}
        {required && (
          <span className="text-[10px] font-semibold text-rose-500">*</span>
        )}
      </label>
      <input
        id={id}
        name={id}
        required={required}
        className="block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-100 dark:focus:ring-neutral-100"
        {...props}
      />
    </div>
  );
}

/* ========================================================================
 * Constantes
 * ====================================================================== */

const TABLE_NAME = "empresas_bpo" as const;
const AUDIT_TABLE = "empresas_bpo_audit" as const;

/* ========================================================================
 * Helpers
 * ====================================================================== */

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/* ========================================================================
 * Página: Novo Cliente BPO (cadastro mínimo + auditoria de criação)
 * ====================================================================== */

export default function NovoClienteBPOPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [codigoErp, setCodigoErp] = React.useState("");
  const [cpfCnpj, setCpfCnpj] = React.useState("");
  const [razaoSocial, setRazaoSocial] = React.useState("");
  const [nomeFantasia, setNomeFantasia] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const codigoStr = codigoErp.trim();
    const cpfRaw = cpfCnpj.trim();
    const cpfDigits = onlyDigits(cpfRaw);
    const razao = razaoSocial.trim();
    const fantasia = nomeFantasia.trim();

    // Código ERP – apenas números
    if (!codigoStr || !/^\d+$/.test(codigoStr)) {
      setErrorMsg("Informe um Código ERP válido (apenas números).");
      setSaving(false);
      return;
    }

    // CPF/CNPJ – somente dígitos, 11 ou 14
    if (!cpfDigits) {
      setErrorMsg("O campo CPF/CNPJ é obrigatório.");
      setSaving(false);
      return;
    }
    if (![11, 14].includes(cpfDigits.length)) {
      setErrorMsg(
        "CPF/CNPJ inválido. Use somente números (11 dígitos para CPF ou 14 para CNPJ)."
      );
      setSaving(false);
      return;
    }

    if (!razao) {
      setErrorMsg("O campo Razão social é obrigatório.");
      setSaving(false);
      return;
    }
    if (!fantasia) {
      setErrorMsg("O campo Nome fantasia é obrigatório.");
      setSaving(false);
      return;
    }

    const codigoNumeric = Number(codigoStr);

    // Payload mínimo, coerente com o schema atual
    const submission = {
      codigo_erp: codigoNumeric,
      cpf_cnpj: cpfDigits,
      razao_social: razao,
      nome_fantasia: fantasia,
    };

    // 1) Insere na empresas_bpo
    const { error: insertError } = await supabase
      .from(TABLE_NAME)
      .insert(submission);

    if (insertError) {
      console.error("Erro ao criar empresa BPO:", insertError);
      setErrorMsg(
        insertError.message.includes("cpf_cnpj_fmt")
          ? "CPF/CNPJ não está no formato esperado pelo banco. Verifique se está usando somente números (sem pontos, barras ou traços)."
          : insertError.message.includes("duplicate key")
          ? "Já existe um cliente com esse Código ERP."
          : `Erro ao salvar: ${insertError.message}`
      );
      setSaving(false);
      return;
    }

    // 2) Registra auditoria de criação (data + usuário) na empresas_bpo_audit
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from(AUDIT_TABLE).insert({
        codigo_erp: codigoNumeric,
        action: "INSERT",
        changed_by: user?.id ?? null, // uuid do usuário
        row_old: null,
        row_new: submission,
        changed_diff: null,
        // changed_at usa default now()
      });
    } catch (auditError) {
      console.error("Falha ao registrar histórico de criação:", auditError);
      // Não bloqueia navegação se o histórico falhar
    }

    setSaving(false);

    // Vai direto para a tela de edição completa (que já mostra o histórico)
    router.push(`/cadastro/clientes-bpo/${codigoStr}`);
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-0">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2">
              <Building2 className="h-5 w-5 text-neutral-700 dark:text-neutral-100" />
              <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                Novo Cliente BPO
              </h1>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Preencha os dados mínimos para criar o cliente. Depois você
              poderá completar o cadastro nas abas de edição.
            </p>
          </div>

          <Link
            href="/cadastro/clientes-bpo"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </div>

        {/* Formulário mínimo */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="grid grid-cols-1 gap-4">
            <InputField
              label="Código ERP"
              id="codigo_erp"
              required
              inputMode="numeric"
              placeholder="Ex: 102030 (somente números)"
              value={codigoErp}
              onChange={(e) => setCodigoErp(e.target.value)}
            />
            <InputField
              label="CPF/CNPJ"
              id="cpf_cnpj"
              required
              placeholder="Somente números (CPF 11 / CNPJ 14)"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
            />
            <InputField
              label="Razão social"
              id="razao_social"
              required
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
            />
            <InputField
              label="Nome fantasia"
              id="nome_fantasia"
              required
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-[11px] text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-300">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <p>
              Ao salvar, será criado um registro na tabela{" "}
              <code className="rounded bg-neutral-900/5 px-1 py-[1px] text-[10px] dark:bg-neutral-950/60">
                empresas_bpo_audit
              </code>{" "}
              com a ação <strong>INSERT</strong>, contendo a data de criação, o
              usuário que criou e os dados cadastrados.
            </p>
          </div>

          {errorMsg && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-900/30 dark:text-rose-200">
              {errorMsg}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 disabled:bg-neutral-500 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Criando cliente…" : "Salvar e abrir edição"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
