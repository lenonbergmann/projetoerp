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
  considerar_fluxo: boolean; // considerar_fluxo
  status: string | null;    // "Status"
  empresabpo: number | null; // empresabpo (bigint -> number)
};

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

  /* ---------- sessão estável (getSession + onAuthStateChange) ---------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) {
        setHasSession(false);
      } else {
        setHasSession(!!data?.session);
      }
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

      // se já for número -> é o codigo_erp
      if (/^\d+$/.test(val)) {
        if (!aborted) {
          setEmpresaFiltro(Number(val));
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
  }, [debouncedQ, empresaFiltro]);

  /* ---------- montar query ---------- */
  function buildQuery() {
    let query = supabase.from(TABLE).select(baseSelect(), { count: 'exact' }).order('Id', { ascending: false });

    if (empresaFiltro != null) {
      query = query.eq('empresabpo', empresaFiltro);
    } else {
      // sem empresa resolvida ainda → evita retornar tudo acidentalmente
      query = query.eq('empresabpo', -999999999);
    }

    if (debouncedQ) {
      const pat = `%${debouncedQ.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      // Referenciando colunas com aspas porque foram criadas quoted no schema
      query = query.or(`"Tipo".ilike.${pat},"Banco".ilike.${pat},"Conta".ilike.${pat},"Apelido".ilike.${pat}`);
    }

    return query;
  }

  /* ---------- fetch com cancelamento e proteção a respostas atrasadas ---------- */
  const fetchCtrlRef = useRef<AbortController | null>(null);
  const reqIdRef = useRef(0);

  async function fetchData(withRetry = true) {
    // cancela requisição anterior
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
        // se foi falta de sessão inesperada, tenta 1x novamente após forçar getSession
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
      if (ctrl.signal.aborted) return; // navegação rápida
      setErrorMsg(e?.message ?? 'Falha ao carregar.');
      setItems([]);
      setTotal(0);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }

  /* ---------- dispare o fetch quando tudo estiver pronto ---------- */
  useEffect(() => {
    if (hasSession === null) return;            // esperando sessão inicial
    if (!hasSession) {                          // sem sessão → mostre msg e não busca
      setItems([]);
      setTotal(0);
      setLoading(false);
      setErrorMsg('Sem sessão ativa. Faça login novamente.');
      return;
    }
    if (resolvendoEmpresa) return;              // aguardando empresa
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSession, resolvendoEmpresa, empresaFiltro, page, debouncedQ]);

  /* ---------- alternar status (usa number no filtro de Id) ---------- */
  const [savingId, setSavingId] = useState<string | null>(null);
  async function toggleStatus(id: string, statusAtual: string | null) {
    const proximo = (statusAtual || '').toLowerCase() === 'ativo' ? 'Inativo' : 'Ativo';

    setSavingId(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: proximo } : i)));

    const idNum = Number(id);
    const idFilter = Number.isFinite(idNum) ? idNum : id;

    const { error } = await supabase.from(TABLE).update({ Status: proximo }).eq('Id', idFilter);

    if (error) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: statusAtual } : i)));
      alert('Não foi possível alterar o status. Tente novamente.');
    }
    setSavingId(null);
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

  const ativoBadge = (ativo: boolean) =>
    ativo ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700';

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Contas Bancárias</h1>
          <Link href="/cadastro/contas-bancarias/novo" className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 shadow-sm hover:shadow transition">
            <Plus size={18} /> Cadastrar novo
          </Link>
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
              {loading || resolvendoEmpresa || hasSession === null ? (
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
                  const ativo = (item.status || '').toLowerCase() === 'ativo';
                  return (
                    <tr key={item.id} className="border-t hover:bg-gray-50/60">
                      <td className="px-4 py-3">{item.tipo ?? '-'}</td>
                      <td className="px-4 py-3">{item.banco ?? '-'}</td>
                      <td className="px-4 py-3">{item.agencia ?? '-'}</td>
                      <td className="px-4 py-3">{item.conta ?? '-'}</td>
                      <td className="px-4 py-3">{item.apelido ?? '-'}</td>
                      <td className="px-4 py-3">{item.loja ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${item.considerar_fluxo ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                          {item.considerar_fluxo ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${ativo ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                          {ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link href={`/cadastro/contas-bancarias/${item.id}`} className="rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50" title="Editar">
                            Editar
                          </Link>
                          <button
                            onClick={() => toggleStatus(item.id, item.status)}
                            className="rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-60"
                            disabled={savingId === item.id}
                            title={ativo ? 'Desativar' : 'Reativar'}
                          >
                            {savingId === item.id ? (
                              <span className="inline-flex items-center gap-2">
                                <Loader2 className="animate-spin" size={14} /> Salvando…
                              </span>
                            ) : ativo ? (
                              'Desativar'
                            ) : (
                              'Ativar'
                            )}
                          </button>
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
