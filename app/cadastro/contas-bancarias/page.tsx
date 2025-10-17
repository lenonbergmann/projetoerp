// app/cadastro/contas-bancarias/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@/lib/supabase/clientComponentClient';
import { Loader2, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';

/* ---------------- helpers ---------------- */
function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/* ---------------- tipos ------------------ */
type ContaBancaria = {
  id: string;               // "Id" (bigint -> string)
  tipo: string | null;      // "Tipo"
  banco: string | null;     // "Banco"
  agencia: number | null;   // "Agencia"
  conta: string | null;     // "Conta"
  apelido: string | null;   // "Apelido"
  loja: number | null;      // "Loja"
  considerar_fluxo: boolean; // considerar_fluxo (boolean)
  status: string | null;    // "Status" (Ativo/Inativo)
  empresabpo: number | null; // empresabpo (bigint -> number)
};

type StatusFilter = 'all' | 'active' | 'inactive';

const TABLE = 'contas_bancarias' as const;
const PAGE_SIZE = 50;

/** Converte linha do banco (com/sem alias) */
function fromRow(row: any): ContaBancaria {
  return {
    id: String(row.id ?? row.Id),
    tipo: row.tipo ?? row.Tipo ?? null,
    banco: row.banco ?? row.Banco ?? null,
    agencia: (row.agencia ?? row.Agencia ?? null) as number | null,
    conta: row.conta ?? row.Conta ?? null,
    apelido: row.apelido ?? row.Apelido ?? null,
    loja: (row.loja ?? row.Loja ?? null) as number | null,
    considerar_fluxo: Boolean(row.considerar_fluxo),
    status: row.status ?? row.Status ?? null,
    empresabpo: row.empresabpo != null ? Number(row.empresabpo) : null,
  };
}

/** SELECT com aliases respeitando nomes do schema */
function baseSelect() {
  return `
    id:"Id",
    tipo:"Tipo",
    banco:"Banco",
    agencia:"Agencia",
    conta:"Conta",
    apelido:"Apelido",
    loja:"Loja",
    considerar_fluxo:considerar_fluxo,
    status:"Status",
    empresabpo:empresabpo
  `;
}

/* =============== Toggle 3D Reutilizável =============== */
type Toggle3DProps = {
  active: boolean;          // true = ativo (verde/direita)
  disabled?: boolean;
  onClick: () => void;
  ariaLabel?: string;
};
function Toggle3D({ active, disabled, onClick, ariaLabel }: Toggle3DProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={ariaLabel ?? (active ? 'Ativo' : 'Inativo')}
      className={[
        // trilho com profundidade
        'relative inline-flex h-9 w-18 items-center rounded-full',
        'border transition-colors duration-200',
        'bg-gradient-to-b',
        active
          ? 'from-emerald-200 to-emerald-300 border-emerald-400'
          : 'from-gray-100 to-gray-200 border-gray-300',
        // “3D” com sombras internas e externas
        'shadow-md',
        active ? 'shadow-emerald-200/60' : 'shadow-gray-300/60',
        disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg'
      ].join(' ')}
      style={{ width: '72px' }} // w-18 (72px) – garante espaço pro knob
      title={active ? 'Ativo — clique para desativar' : 'Inativo — clique para ativar'}
    >
      {/* trilho interno (efeito "inset") */}
      <span
        aria-hidden="true"
        className={[
          'absolute inset-0 rounded-full',
          'shadow-inner',
          active ? 'shadow-emerald-600/10' : 'shadow-black/10'
        ].join(' ')}
      />
      {/* knob */}
      <span
        aria-hidden="true"
        className={[
          'relative z-10 h-7 w-7 rounded-full',
          'bg-white',
          'transition-transform duration-200',
          'shadow-[0_2px_0_#0000000a,0_6px_12px_#0000001a]',
          'border border-black/5'
        ].join(' ')}
        style={{
          transform: active ? 'translateX(39px)' : 'translateX(6px)', // esquerda≈6px, direita≈39px
        }}
      />
      {/* ring suave quando ativo */}
      <span
        aria-hidden="true"
        className={[
          'absolute inset-0 rounded-full pointer-events-none',
          active ? 'ring-1 ring-emerald-700/20' : 'ring-1 ring-black/10'
        ].join(' ')}
      />
      <span className="sr-only">{active ? 'Ativo' : 'Inativo'}</span>
    </button>
  );
}

export default function ContasBancariasPage() {
  const supabase = createClientComponentClient();

  const [empresaCookie, setEmpresaCookie] = useState<string | null>(null);
  const [empresaFiltro, setEmpresaFiltro] = useState<number | null>(null); // codigo_erp numérico
  const [resolvendoEmpresa, setResolvendoEmpresa] = useState(true);

  const [hasSession, setHasSession] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [items, setItems] = useState<ContaBancaria[]>([]);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [page, setPage] = useState(0);
  const [total, setTotal] = useState<number | null>(null);

  const totalPages = useMemo(
    () => (total ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1),
    [total]
  );
  const showingFrom = useMemo(() => (total ? page * PAGE_SIZE + 1 : 0), [page, total]);
  const showingTo = useMemo(
    () => (total ? Math.min(total, (page + 1) * PAGE_SIZE) : 0),
    [page, total]
  );

  /* ---------- sessão estável ---------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      setHasSession(error ? false : !!data?.session);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  /* ---------- cookie da empresa ---------- */
  useEffect(() => {
    setEmpresaCookie(getCookie('empresaId'));
  }, []);

  /* ---------- resolver codigo_erp a partir do cookie ---------- */
  useEffect(() => {
    let aborted = false;
    async function resolveEmpresa() {
      setResolvendoEmpresa(true);
      setEmpresaFiltro(null);

      const val = empresaCookie?.trim() || null;
      if (!val) {
        setResolvendoEmpresa(false);
        return;
      }
      if (/^\d+$/.test(val)) {
        if (!aborted) {
          setEmpresaFiltro(Number(val));
          setResolvendoEmpresa(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from('empresas_bpo')
        .select('codigo_erp')
        .or(`id.eq.${val},codigo_erp.eq.${val}`)
        .limit(1);
      if (!aborted) {
        if (!error && data && data.length > 0) {
          const codigo = data[0].codigo_erp;
          if (codigo != null) setEmpresaFiltro(Number(codigo));
        }
        setResolvendoEmpresa(false);
      }
    }
    resolveEmpresa();
    return () => {
      aborted = true;
    };
  }, [empresaCookie, supabase]);

  /* ---------- debounce da busca ---------- */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  /* ---------- resetar página ao mudar filtros ---------- */
  useEffect(() => {
    setPage(0);
  }, [debouncedQ, empresaFiltro, statusFilter]);

  /* ---------- montar query ---------- */
  function buildQuery() {
    let query = supabase.from(TABLE).select(baseSelect(), { count: 'exact' }).order('Id', { ascending: false });

    if (empresaFiltro != null) {
      query = query.eq('empresabpo', empresaFiltro);
    } else {
      // evita retornar tudo acidentalmente
      query = query.eq('empresabpo', -999999999);
    }

    if (debouncedQ) {
      const pat = `%${debouncedQ.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      query = query.or(`"Tipo".ilike.${pat},"Banco".ilike.${pat},"Conta".ilike.${pat},"Apelido".ilike.${pat}`);
    }

    if (statusFilter === 'active') {
      query = query.eq('Status', 'Ativo');
    } else if (statusFilter === 'inactive') {
      query = query.eq('Status', 'Inativo');
    }

    return query;
  }

  /* ---------- fetch controlado ---------- */
  const fetchCtrlRef = useRef<AbortController | null>(null);
  const reqIdRef = useRef(0);

  async function fetchData(withRetry = true) {
    fetchCtrlRef.current?.abort();
    const ctrl = new AbortController();
    fetchCtrlRef.current = ctrl;
    const myReqId = ++reqIdRef.current;

    setLoading(true);
    setErrorMsg(null);

    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await buildQuery().range(from, to);
      if (ctrl.signal.aborted || myReqId !== reqIdRef.current) return;

      if (error) {
        if (withRetry) {
          const { data: s } = await supabase.auth.getSession();
          if (s?.session) return fetchData(false);
        }
        setErrorMsg(error.message);
        setItems([]);
        setTotal(0);
      } else {
        const rows = (data ?? []).map(fromRow);
        setItems(rows);
        setTotal(count ?? rows.length);
      }
    } catch (e: any) {
      if (ctrl.signal.aborted) return;
      setErrorMsg(e?.message ?? 'Falha ao carregar.');
      setItems([]);
      setTotal(0);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    if (hasSession === null) return;
    if (!hasSession) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      setErrorMsg('Sem sessão ativa. Faça login novamente.');
      return;
    }
    if (resolvendoEmpresa) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSession, resolvendoEmpresa, empresaFiltro, page, debouncedQ, statusFilter]);

  /* ---------- toggles com update otimista ---------- */
  const [savingIdStatus, setSavingIdStatus] = useState<string | null>(null);
  const [savingIdFluxo, setSavingIdFluxo] = useState<string | null>(null);

  async function toggleStatus(id: string, statusAtual: string | null) {
    const next = (statusAtual || '').toLowerCase() === 'ativo' ? 'Inativo' : 'Ativo';

    setSavingIdStatus(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: next } : i)));

    const idNum = Number(id);
    const idFilter = Number.isFinite(idNum) ? idNum : id;
    const { error } = await supabase.from(TABLE).update({ Status: next }).eq('Id', idFilter);

    if (error) {
      // rollback
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: statusAtual } : i)));
      alert('Não foi possível alterar o status. Tente novamente.');
    }
    setSavingIdStatus(null);
  }

  async function toggleFluxo(id: string, atual: boolean) {
    const next = !atual;

    setSavingIdFluxo(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, considerar_fluxo: next } : i)));

    const idNum = Number(id);
    const idFilter = Number.isFinite(idNum) ? idNum : id;
    const { error } = await supabase.from(TABLE).update({ considerar_fluxo: next }).eq('Id', idFilter);

    if (error) {
      // rollback
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, considerar_fluxo: atual } : i)));
      alert('Não foi possível alterar "Considerar Fluxo". Tente novamente.');
    }
    setSavingIdFluxo(null);
  }

  /* ---------- busca local adicional (opcional) ---------- */
  const filtrados = useMemo(() => {
    if (!q) return items;
    const t = q.toLowerCase();
    return items.filter((i) =>
      [
        i.tipo ?? '',
        i.banco ?? '',
        i.agencia?.toString() ?? '',
        i.conta ?? '',
        i.apelido ?? '',
        i.loja?.toString() ?? '',
        i.considerar_fluxo ? 'sim' : 'nao',
        i.status ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(t)
    );
  }, [items, q]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Contas Bancárias</h1>
          <div className="flex items-center gap-2">
            {/* Filtro de status */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Status:</label>
              <div className="inline-flex overflow-hidden rounded-xl border bg-white">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={[
                    'px-3 py-1.5 text-sm',
                    statusFilter === 'all' ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
                  ].join(' ')}
                >
                  Todas
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={[
                    'px-3 py-1.5 text-sm',
                    statusFilter === 'active' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'hover:bg-gray-50'
                  ].join(' ')}
                >
                  Ativas
                </button>
                <button
                  onClick={() => setStatusFilter('inactive')}
                  className={[
                    'px-3 py-1.5 text-sm',
                    statusFilter === 'inactive' ? 'bg-gray-50 text-gray-700 font-medium' : 'hover:bg-gray-50'
                  ].join(' ')}
                >
                  Inativas
                </button>
              </div>
            </div>

            <Link
              href="/cadastro/contas-bancarias/novo"
              className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 shadow-sm hover:shadow transition"
            >
              <Plus size={18} /> Cadastrar novo
            </Link>
          </div>
        </div>

        {/* Busca + info */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por tipo, banco, agência, conta, apelido, loja…"
              className="w-full rounded-2xl border px-10 py-2 outline-none focus:ring-2 focus:ring-black/10"
            />
            <Search className="absolute left-3 top-2.5" size={18} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
            <span>Cookie empresaId: <strong>{empresaCookie ?? '(vazio)'}</strong></span>
            <span>Filtro (empresabpo): <strong>{resolvendoEmpresa ? 'resolvendo…' : empresaFiltro ?? '(indefinido)'}</strong></span>
            {total !== null ? (
              <span>Mostrando <strong>{showingFrom || 0}</strong>–<strong>{showingTo || 0}</strong> de <strong>{total}</strong></span>
            ) : null}
            {errorMsg ? <span className="text-rose-600">Erro ao carregar: {errorMsg}</span> : null}
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-hidden rounded-2xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Banco</th>
                <th className="text-left px-4 py-3">Agência</th>
                <th className="text-left px-4 py-3">Conta</th>
                <th className="text-left px-4 py-3">Apelido</th>
                <th className="text-left px-4 py-3">Loja</th>
                <th className="text-left px-4 py-3">Considerar Fluxo</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(loading || resolvendoEmpresa || hasSession === null) ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" /> Carregando…
                    </div>
                  </td>
                </tr>
              ) : hasSession === false ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-rose-600">
                    Sem sessão ativa. Faça login novamente.
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                    Nenhuma conta bancária encontrada.
                  </td>
                </tr>
              ) : (
                filtrados.map((item) => {
                  const isActive = (item.status || '').toLowerCase() === 'ativo';
                  const savingStatus = savingIdStatus === item.id;
                  const savingFluxo = savingIdFluxo === item.id;

                  return (
                    <tr key={item.id} className="border-t hover:bg-gray-50/60">
                      <td className="px-4 py-3">{item.tipo ?? '-'}</td>
                      <td className="px-4 py-3">{item.banco ?? '-'}</td>
                      <td className="px-4 py-3">{item.agencia ?? '-'}</td>
                      <td className="px-4 py-3">{item.conta ?? '-'}</td>
                      <td className="px-4 py-3">{item.apelido ?? '-'}</td>
                      <td className="px-4 py-3">{item.loja ?? '-'}</td>

                      {/* Considerar Fluxo (toggle 3D) */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Toggle3D
                            active={item.considerar_fluxo}
                            disabled={savingFluxo}
                            onClick={() => toggleFluxo(item.id, item.considerar_fluxo)}
                            ariaLabel="Considerar Fluxo"
                          />
                          {savingFluxo && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                        </div>
                      </td>

                      {/* Status (toggle 3D) */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Toggle3D
                            active={isActive}
                            disabled={savingStatus}
                            onClick={() => toggleStatus(item.id, item.status)}
                            ariaLabel="Status da conta"
                          />
                          {savingStatus && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/cadastro/contas-bancarias/${item.id}`}
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
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 disabled:opacity-50"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              onClick={() =>
                setPage((p) => (total ? (p + 1 < Math.ceil(total / PAGE_SIZE) ? p + 1 : p) : p))
              }
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
