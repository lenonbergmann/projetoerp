// app/cadastro/contas-bancarias/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import {
  Loader2,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ---------------- helpers ---------------- */
function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(^| )" + name + "=([^;]+)")
  );
  return match ? decodeURIComponent(match[2]) : null;
}

/* ---------------- tipos ------------------ */
type ContaBancaria = {
  id: string; // "Id" (bigint -> string)
  tipo: string | null; // "Tipo"
  banco: string | null; // "Banco"
  agencia: number | null; // "Agencia"
  conta: string | null; // "Conta"
  apelido: string | null; // "Apelido"
  loja: number | null; // "Loja"
  considerar_fluxo: boolean; // considerar_fluxo (boolean)
  status: string | null; // "Status" (Ativo/Inativo)
  empresabpo: number | null; // empresabpo (bigint -> number)
};

type StatusFilter = "all" | "active" | "inactive";

const TABLE = "contas_bancarias" as const;
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
  active: boolean; // true = ativo (verde/direita)
  disabled?: boolean;
  onClick: () => void;
  ariaLabel?: string;
};

function Toggle3D({
  active,
  disabled,
  onClick,
  ariaLabel,
}: Toggle3DProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={ariaLabel ?? (active ? "Ativo" : "Inativo")}
      className={[
        "relative inline-flex h-7 w-[64px] items-center rounded-full",
        "border transition-all duration-200",
        "bg-gradient-to-b",
        active
          ? "from-emerald-200 to-emerald-300 border-emerald-400"
          : "from-gray-100 to-gray-200 border-gray-300",
        "shadow-sm",
        active ? "shadow-emerald-200/60" : "shadow-gray-300/60",
        disabled
          ? "opacity-60 cursor-not-allowed"
          : "hover:shadow-md",
      ].join(" ")}
      title={
        active
          ? "Ativo — clique para desativar"
          : "Inativo — clique para ativar"
      }
    >
      <span
        aria-hidden="true"
        className={[
          "absolute inset-0 rounded-full",
          "shadow-inner",
          active ? "shadow-emerald-600/10" : "shadow-black/10",
        ].join(" ")}
      />
      <span
        aria-hidden="true"
        className={[
          "relative z-10 h-5 w-5 rounded-full",
          "bg-white",
          "transition-transform duration-200",
          "shadow-[0_1px_0_#0000000a,0_4px_8px_#0000001a]",
          "border border-black/5",
        ].join(" ")}
        style={{
          transform: active
            ? "translateX(32px)"
            : "translateX(6px)",
        }}
      />
      <span
        aria-hidden="true"
        className={[
          "absolute inset-0 rounded-full pointer-events-none",
          active ? "ring-1 ring-emerald-700/20" : "ring-1 ring-black/10",
        ].join(" ")}
      />
      <span className="sr-only">
        {active ? "Ativo" : "Inativo"}
      </span>
    </button>
  );
}

export default function ContasBancariasPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [empresaCookie, setEmpresaCookie] = useState<string | null>(
    null
  );
  const [empresaFiltro, setEmpresaFiltro] = useState<number | null>(
    null
  ); // codigo_erp numérico
  const [resolvendoEmpresa, setResolvendoEmpresa] =
    useState(true);

  const [hasSession, setHasSession] = useState<boolean | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [items, setItems] = useState<ContaBancaria[]>([]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [page, setPage] = useState(0);
  const [total, setTotal] = useState<number | null>(null);

  const totalPages = useMemo(
    () =>
      total ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1,
    [total]
  );
  const showingFrom = useMemo(
    () => (total ? page * PAGE_SIZE + 1 : 0),
    [page, total]
  );
  const showingTo = useMemo(
    () =>
      total ? Math.min(total, (page + 1) * PAGE_SIZE) : 0,
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
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setHasSession(!!session);
      }
    );
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  /* ---------- cookie da empresa ---------- */
  useEffect(() => {
    setEmpresaCookie(getCookie("empresaId"));
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
        .from("empresas_bpo")
        .select("codigo_erp")
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
    const t = setTimeout(
      () => setDebouncedQ(q.trim()),
      250
    );
    return () => clearTimeout(t);
  }, [q]);

  /* ---------- resetar página ao mudar filtros ---------- */
  useEffect(() => {
    setPage(0);
  }, [debouncedQ, empresaFiltro, statusFilter]);

  /* ---------- montar query ---------- */
  function buildQuery() {
    let query = supabase
      .from(TABLE)
      .select(baseSelect(), { count: "exact" })
      .order("Id", { ascending: false });

    if (empresaFiltro != null) {
      query = query.eq("empresabpo", empresaFiltro);
    } else {
      // evita retornar tudo acidentalmente
      query = query.eq("empresabpo", -999999999);
    }

    if (debouncedQ) {
      const pat = `%${debouncedQ
        .replace(/%/g, "\\%")
        .replace(/_/g, "\\_")}%`;
      query = query.or(
        `"Tipo".ilike.${pat},"Banco".ilike.${pat},"Conta".ilike.${pat},"Apelido".ilike.${pat}`
      );
    }

    if (statusFilter === "active") {
      query = query.eq("Status", "Ativo");
    } else if (statusFilter === "inactive") {
      query = query.eq("Status", "Inativo");
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

      const { data, error, count } = await buildQuery().range(
        from,
        to
      );
      if (ctrl.signal.aborted || myReqId !== reqIdRef.current)
        return;

      if (error) {
        if (withRetry) {
          const { data: s } =
            await supabase.auth.getSession();
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
      setErrorMsg(e?.message ?? "Falha ao carregar.");
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
      setErrorMsg("Sem sessão ativa. Faça login novamente.");
      return;
    }
    if (resolvendoEmpresa) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasSession,
    resolvendoEmpresa,
    empresaFiltro,
    page,
    debouncedQ,
    statusFilter,
  ]);

  /* ---------- toggles com update otimista ---------- */
  const [savingIdStatus, setSavingIdStatus] =
    useState<string | null>(null);
  const [savingIdFluxo, setSavingIdFluxo] =
    useState<string | null>(null);

  async function toggleStatus(
    id: string,
    statusAtual: string | null
  ) {
    const next =
      (statusAtual || "").toLowerCase() === "ativo"
        ? "Inativo"
        : "Ativo";

    setSavingIdStatus(id);
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: next } : i
      )
    );

    const idNum = Number(id);
    const idFilter = Number.isFinite(idNum) ? idNum : id;
    const { error } = await supabase
      .from(TABLE)
      .update({ Status: next })
      .eq("Id", idFilter);

    if (error) {
      // rollback
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, status: statusAtual }
            : i
        )
      );
      alert(
        "Não foi possível alterar o status. Tente novamente."
      );
    }
    setSavingIdStatus(null);
  }

  async function toggleFluxo(id: string, atual: boolean) {
    const next = !atual;

    setSavingIdFluxo(id);
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, considerar_fluxo: next }
          : i
      )
    );

    const idNum = Number(id);
    const idFilter = Number.isFinite(idNum) ? idNum : id;
    const { error } = await supabase
      .from(TABLE)
      .update({ considerar_fluxo: next })
      .eq("Id", idFilter);

    if (error) {
      // rollback
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, considerar_fluxo: atual }
            : i
        )
      );
      alert(
        'Não foi possível alterar "Considerar Fluxo". Tente novamente.'
      );
    }
    setSavingIdFluxo(null);
  }

  /* ---------- busca local adicional (opcional) ---------- */
  const filtrados = useMemo(() => {
    if (!q) return items;
    const t = q.toLowerCase();
    return items.filter((i) =>
      [
        i.tipo ?? "",
        i.banco ?? "",
        i.agencia?.toString() ?? "",
        i.conta ?? "",
        i.apelido ?? "",
        i.loja?.toString() ?? "",
        i.considerar_fluxo ? "sim" : "nao",
        i.status ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(t)
    );
  }, [items, q]);

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-6xl px-3 py-4 md:px-6 md:py-6">
        {/* Cabeçalho compacto */}
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight md:text-xl">
              Contas bancárias
            </h1>
            <p className="text-xs text-muted-foreground md:text-sm">
              Gerencie as contas utilizadas para fluxo de caixa,
              conciliação e pagamentos.
            </p>
          </div>
          <Link
            href="/cadastro/contas-bancarias/novo"
            className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-1.5 text-xs font-medium shadow-sm transition hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova conta
          </Link>
        </div>

        {/* Toolbar de filtros mais enxuta */}
        <div className="mb-4 flex flex-col gap-2 rounded-2xl border bg-white/80 px-3 py-2.5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2">
            {/* Status pills */}
            <div className="inline-flex overflow-hidden rounded-full border bg-slate-50 text-[11px] font-medium">
              <button
                onClick={() => setStatusFilter("all")}
                className={[
                  "px-3 py-1 transition",
                  statusFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                Todas
              </button>
              <button
                onClick={() => setStatusFilter("active")}
                className={[
                  "px-3 py-1 transition",
                  statusFilter === "active"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                Ativas
              </button>
              <button
                onClick={() => setStatusFilter("inactive")}
                className={[
                  "px-3 py-1 transition",
                  statusFilter === "inactive"
                    ? "bg-slate-200 text-slate-900"
                    : "text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                Inativas
              </button>
            </div>

            {/* Busca */}
            <div className="relative ml-2 flex-1 max-w-xs">
              <Search className="pointer-events-none absolute left-2 top-1.5 h-3.5 w-3.5 text-slate-400" />
              <input
                value={q}
                onChange={(e) =>
                  setQ(e.target.value)
                }
                placeholder="Buscar banco, conta, apelido…"
                className="h-8 w-full rounded-full border bg-white pl-7 pr-2 text-xs outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          {/* Info rápida / páginação */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 md:justify-end">
            {total !== null && total > 0 && (
              <span>
                Mostrando{" "}
                <strong>
                  {showingFrom || 0}–{showingTo || 0}
                </strong>{" "}
                de <strong>{total}</strong>
              </span>
            )}
            <span className="hidden md:inline-block">
              Empresa:{" "}
              <strong>
                {resolvendoEmpresa
                  ? "resolvendo…"
                  : empresaFiltro ?? "—"}
              </strong>
            </span>
          </div>
        </div>

        {/* Tabela mais fina */}
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <table className="w-full border-collapse text-xs md:text-sm">
            <thead className="bg-slate-50 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">
                  Tipo
                </th>
                <th className="px-3 py-2 text-left">
                  Banco
                </th>
                <th className="px-3 py-2 text-left">
                  Agência
                </th>
                <th className="px-3 py-2 text-left">
                  Conta
                </th>
                <th className="px-3 py-2 text-left">
                  Apelido
                </th>
                <th className="px-3 py-2 text-left">
                  Loja
                </th>
                <th className="px-3 py-2 text-left">
                  Fluxo
                </th>
                <th className="px-3 py-2 text-left">
                  Status
                </th>
                <th className="px-3 py-2 text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ||
              resolvendoEmpresa ||
              hasSession === null ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    <div className="inline-flex items-center gap-2 text-xs">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando contas bancárias…
                    </div>
                  </td>
                </tr>
              ) : hasSession === false ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-rose-600 text-sm"
                  >
                    Sem sessão ativa. Faça login novamente.
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-slate-500 text-sm"
                  >
                    Nenhuma conta bancária encontrada.
                  </td>
                </tr>
              ) : (
                filtrados.map((item) => {
                  const isActive =
                    (item.status || "")
                      .toLowerCase() === "ativo";
                  const savingStatus =
                    savingIdStatus === item.id;
                  const savingFluxo =
                    savingIdFluxo === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="border-t text-xs hover:bg-slate-50 cursor-pointer transition-colors"
                      onDoubleClick={() =>
                        router.push(
                          `/cadastro/contas-bancarias/${item.id}`
                        )
                      }
                    >
                      <td className="px-3 py-2 align-middle">
                        {item.tipo ?? "—"}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {item.banco ?? "—"}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {item.agencia ?? "—"}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {item.conta ?? "—"}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {item.apelido ?? "—"}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {item.loja ?? "—"}
                      </td>

                      {/* Considerar Fluxo (toggle 3D) */}
                      <td className="px-3 py-2 align-middle">
                        <div className="flex items-center gap-1.5">
                          <Toggle3D
                            active={item.considerar_fluxo}
                            disabled={savingFluxo}
                            onClick={() =>
                              toggleFluxo(
                                item.id,
                                item.considerar_fluxo
                              )
                            }
                            ariaLabel="Considerar Fluxo"
                          />
                          {savingFluxo && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                          )}
                        </div>
                      </td>

                      {/* Status (toggle 3D) */}
                      <td className="px-3 py-2 align-middle">
                        <div className="flex items-center gap-1.5">
                          <Toggle3D
                            active={isActive}
                            disabled={savingStatus}
                            onClick={() =>
                              toggleStatus(
                                item.id,
                                item.status
                              )
                            }
                            ariaLabel="Status da conta"
                          />
                          {savingStatus && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2 align-middle text-right">
                        <Link
                          href={`/cadastro/contas-bancarias/${item.id}`}
                          className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                          title="Editar"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação compacta */}
        <div className="mt-3 flex flex-col items-center justify-between gap-2 text-[11px] text-slate-500 md:flex-row">
          <div>
            Página{" "}
            <strong>{page + 1}</strong> de{" "}
            <strong>{totalPages}</strong>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <button
              onClick={() =>
                setPage((p) => Math.max(0, p - 1))
              }
              disabled={page === 0}
              className="inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-[11px] font-medium disabled:opacity-40"
            >
              <ChevronLeft className="h-3 w-3" />
              Anterior
            </button>
            <button
              onClick={() =>
                setPage((p) =>
                  total
                    ? p + 1 <
                      Math.ceil(total / PAGE_SIZE)
                      ? p + 1
                      : p
                    : p
                )
              }
              disabled={page + 1 >= totalPages}
              className="inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-[11px] font-medium disabled:opacity-40"
            >
              Próxima
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Erro geral */}
        {errorMsg && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {errorMsg}
          </div>
        )}
      </main>
    </div>
  );
}
