'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

/* ---------------- helpers ---------------- */
function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/* ---------------- tipos ------------------ */
type EmpresaBPO = {
  codigo_erp: number;
  nome_fantasia: string | null;
};

type FormState = {
  tipo: string;
  banco: string;
  agencia?: string;
  conta?: string;
  apelido?: string;
  loja?: string;
  saldoInicial?: string;
  dataSaldoInicial?: string; // yyyy-mm-dd
  considerarFluxo: boolean;
  empresabpo?: string; // codigo_erp
  status?: string;
  pix_chave?: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function NovaContaBancariaPage() {
  const router = useRouter();

  const [empresas, setEmpresas] = useState<EmpresaBPO[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);

  const [empresaCookie, setEmpresaCookie] = useState<string | null>(null);
  const [empresaCodigoErp, setEmpresaCodigoErp] = useState<number | null>(null);
  const [resolvendoEmpresa, setResolvendoEmpresa] = useState(true);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    tipo: '',
    banco: '',
    agencia: '',
    conta: '',
    apelido: '',
    loja: '',
    saldoInicial: '',
    dataSaldoInicial: '',
    considerarFluxo: true,
    empresabpo: '',
    status: 'ATIVA',
    pix_chave: '',
  });

  /* --------- ler cookie ao montar --------- */
  useEffect(() => {
    setEmpresaCookie(getCookie('empresaId'));
  }, []);

  /* --------- resolver cookie -> codigo_erp --------- */
  useEffect(() => {
    let aborted = false;

    async function resolveEmpresa() {
      setResolvendoEmpresa(true);
      setEmpresaCodigoErp(null);

      const val = empresaCookie?.trim() || null;
      if (!val) {
        setResolvendoEmpresa(false);
        return;
      }

      // se já for número -> é o codigo_erp
      if (/^\d+$/.test(val)) {
        if (!aborted) {
          setEmpresaCodigoErp(Number(val));
          setResolvendoEmpresa(false);
        }
        return;
      }

      // senão, pode ser id (uuid) ou texto ⇒ tenta resolver
      const { data, error } = await supabase
        .from('empresas_bpo')
        .select('codigo_erp')
        .or(`id.eq.${val},codigo_erp.eq.${val}`)
        .limit(1);

      if (!aborted) {
        if (!error && data && data.length > 0) {
          const codigo = data[0].codigo_erp;
          if (codigo != null) setEmpresaCodigoErp(Number(codigo));
        }
        setResolvendoEmpresa(false);
      }
    }

    resolveEmpresa();
    return () => {
      aborted = true;
    };
  }, [empresaCookie]);

  /* --------- carregar empresas para o select --------- */
  useEffect(() => {
    (async () => {
      setLoadingEmpresas(true);
      const { data, error } = await supabase
        .from('empresas_bpo')
        .select('codigo_erp, nome_fantasia')
        .order('nome_fantasia', { ascending: true });
      if (error) {
        setErrorMsg(`Falha ao carregar empresas: ${error.message}`);
      } else {
        setEmpresas((data ?? []) as EmpresaBPO[]);
      }
      setLoadingEmpresas(false);
    })();
  }, []);

  /* --------- pré-selecionar empresabpo quando resolver o cookie --------- */
  useEffect(() => {
    if (resolvendoEmpresa) return;
    if (empresaCodigoErp != null) {
      setForm((prev) => {
        // só preenche se ainda estiver vazio (não sobrescrever escolha do usuário)
        if (!prev.empresabpo) {
          return { ...prev, empresabpo: String(empresaCodigoErp) };
        }
        return prev;
      });
    }
  }, [resolvendoEmpresa, empresaCodigoErp]);

  const canSubmit = useMemo(() => {
    return (
      !!form.banco?.trim() &&
      !!form.apelido?.trim() &&
      !!form.empresabpo?.trim() &&
      !saving
    );
  }, [form, saving]);

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // tenta inserir sem "Id"; se precisar, calcula max("Id")+1 sem BigInt literal
  async function tryInsert(row: Record<string, any>) {
    const attempt = await supabase.from('contas_bancarias').insert(row).select().single();

    if (!attempt.error) return attempt;

    const msg = attempt.error.message?.toLowerCase() ?? '';
    const needsId = msg.includes('null value in column "id"') || msg.includes('not-null constraint');

    if (!needsId) return attempt;

    const { data: maxRow, error: selErr } = await supabase
      .from('contas_bancarias')
      .select('Id')
      .order('Id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selErr) return { data: null, error: selErr };

    let nextId = '1';
    if (maxRow && maxRow.Id != null) {
      const s = String(maxRow.Id).trim();
      if (/^\d+$/.test(s)) nextId = (Number(s) + 1).toString();
    }

    const attemptWithId = await supabase
      .from('contas_bancarias')
      .insert({ ...row, Id: nextId })
      .select()
      .single();

    return attemptWithId;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSaving(true);

    try {
      const inclusaoISO = new Date().toISOString();

      const row: Record<string, any> = {
        ['Tipo']: form.tipo?.trim() || null,
        ['Banco']: form.banco?.trim() || null,
        ['Agencia']: form.agencia ? Number(form.agencia) : null,
        ['Conta']: form.conta?.trim() || null,
        ['Apelido']: form.apelido?.trim() || null,
        ['Loja']: form.loja ? Number(form.loja) : null,
        saldo_inicial:
          form.saldoInicial && form.saldoInicial.replace(',', '.').trim() !== ''
            ? Number(form.saldoInicial.replace('.', '').replace(',', '.'))
            : null,
        data_saldo_inicial: form.dataSaldoInicial || null,
        considerar_fluxo: !!form.considerarFluxo,
        empresabpo: form.empresabpo ? Number(form.empresabpo) : null,
        ['Status']: form.status?.trim() || 'ATIVA',
        ['Inclusao']: inclusaoISO,
        pix_chave: form.pix_chave?.trim() || null,
      };

      const { error } = await tryInsert(row);

      if (error) {
        setErrorMsg(`Falha ao salvar: ${error.message}`);
        setSaving(false);
        return;
      }

      // sucesso: fecha a tela e volta para cadastros
      router.replace('/cadastro/contas-bancarias');
      // a página desmonta após o replace
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro inesperado ao salvar.');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Nova Conta Bancária</h1>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* EmpresaBPO */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Empresa BPO *{' '}
            {resolvendoEmpresa && <span className="text-gray-500 text-xs">(detectando…)</span>}
          </label>
          {loadingEmpresas ? (
            <div className="text-sm text-gray-500">Carregando empresas...</div>
          ) : (
            <select
              className="w-full rounded-md border px-3 py-2"
              value={form.empresabpo}
              onChange={(e) => onChange('empresabpo', e.target.value)}
              required
            >
              <option value="">
                {resolvendoEmpresa ? 'Detectando empresa selecionada…' : 'Selecione a empresa'}
              </option>
              {empresas.map((emp) => (
                <option key={emp.codigo_erp} value={emp.codigo_erp}>
                  {emp.nome_fantasia ?? emp.codigo_erp}
                </option>
              ))}
            </select>
          )}
          {/* dica opcional */}
          {empresaCodigoErp != null && form.empresabpo !== String(empresaCodigoErp) && (
            <div className="mt-1 text-xs text-gray-500">
              Empresa selecionada atual: <b>{empresaCodigoErp}</b> (cookie)
            </div>
          )}
        </div>

        {/* Banco */}
        <div>
          <label className="block text-sm font-medium mb-1">Banco *</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            placeholder="Ex.: Itaú, Sicoob..."
            value={form.banco}
            onChange={(e) => onChange('banco', e.target.value)}
            required
          />
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium mb-1">Tipo</label>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={form.tipo}
            onChange={(e) => onChange('tipo', e.target.value)}
          >
            <option value="">Selecione</option>
            <option value="CONTA_CORRENTE">Conta corrente</option>
            <option value="CONTA_PAGAMENTO">Conta de pagamento</option>
            <option value="APLICACAO">Aplicação</option>
            <option value="CAIXA">Caixa</option>
          </select>
        </div>

        {/* Agência e Conta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Agência</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              inputMode="numeric"
              value={form.agencia}
              onChange={(e) => onChange('agencia', e.target.value.replace(/\D/g, ''))}
              placeholder="0001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Conta</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={form.conta}
              onChange={(e) => onChange('conta', e.target.value)}
              placeholder="12345-6"
            />
          </div>
        </div>

        {/* Apelido (nome da conta) */}
        <div>
          <label className="block text-sm font-medium mb-1">Apelido *</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={form.apelido}
            onChange={(e) => onChange('apelido', e.target.value)}
            placeholder="Ex.: Itaú Matriz, Sicoob Loja 1"
            required
          />
        </div>

        {/* Loja (opcional) */}
        <div>
          <label className="block text-sm font-medium mb-1">Loja (opcional)</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            inputMode="numeric"
            value={form.loja}
            onChange={(e) => onChange('loja', e.target.value.replace(/\D/g, ''))}
            placeholder="Número da loja"
          />
        </div>

        {/* Pix */}
        <div>
          <label className="block text-sm font-medium mb-1">Chave PIX</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={form.pix_chave}
            onChange={(e) => onChange('pix_chave', e.target.value)}
            placeholder="CPF/CNPJ, e-mail, telefone ou aleatória"
          />
        </div>

        {/* Saldo inicial + data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Saldo inicial</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              inputMode="decimal"
              value={form.saldoInicial}
              onChange={(e) => onChange('saldoInicial', e.target.value)}
              placeholder="Ex.: 1500,00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data do saldo inicial</label>
            <input
              type="date"
              className="w-full rounded-md border px-3 py-2"
              value={form.dataSaldoInicial}
              onChange={(e) => onChange('dataSaldoInicial', e.target.value)}
            />
          </div>
        </div>

        {/* Considerar no fluxo */}
        <div className="flex items-center gap-3">
          <input
            id="considerarFluxo"
            type="checkbox"
            className="h-4 w-4"
            checked={form.considerarFluxo}
            onChange={(e) => onChange('considerarFluxo', e.target.checked)}
          />
          <label htmlFor="considerarFluxo" className="text-sm">
            Considerar no Fluxo de Caixa
          </label>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={form.status}
            onChange={(e) => onChange('status', e.target.value)}
          >
            <option value="ATIVA">ATIVA</option>
            <option value="INATIVA">INATIVA</option>
          </select>
        </div>

        {/* mensagens */}
        {errorMsg && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          <button
            type="button"
            className="rounded-md border px-4 py-2"
            onClick={() => router.replace('/cadastro/contas-bancarias')}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
