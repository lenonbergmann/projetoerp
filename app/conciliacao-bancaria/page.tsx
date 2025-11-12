"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  LockOpen,
  Lock,
  Upload,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                               Helper: Dates                                */
/* -------------------------------------------------------------------------- */
const PT_WEEKDAYS = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"] as const;

function firstDayOfMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0, 1);
}
function lastDayOfMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0);
}
function daysInMonth(year: number, monthIndex0: number) {
  return lastDayOfMonth(year, monthIndex0).getDate();
}
function allDaysOfMonth(year: number, monthIndex0: number) {
  const n = daysInMonth(year, monthIndex0);
  return Array.from({ length: n }, (_, i) => new Date(year, monthIndex0, i + 1));
}
function isWeekend(d: Date) {
  const w = d.getDay();
  return w === 0 || w === 6;
}
function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

/* -------------------------------------------------------------------------- */
/*                             Minimal UI primitives                           */
/* -------------------------------------------------------------------------- */
function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "ghost" | "outline"; size?: "sm" | "md" }
) {
  const { className = "", variant = "default", size = "md", ...rest } = props;
  const base = "inline-flex items-center justify-center gap-2 rounded-xl transition active:scale-[.98]";
  const byVariant =
    variant === "ghost"
      ? "bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800"
      : variant === "outline"
      ? "border border-zinc-300 dark:border-zinc-700 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900"
      : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white";
  const bySize = size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm";
  return <button className={`${base} ${byVariant} ${bySize} ${className}`} {...rest} />;
}

function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className = "", ...rest } = props;
  return <div className={`rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 ${className}`} {...rest} />;
}
function CardHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 ${props.className ?? ""}`}>{props.children}</div>;
}
function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-4 ${props.className ?? ""}`}>{props.children}</div>;
}

/* -------------------------------------------------------------------------- */
/*                              Domain: mock data                             */
/* -------------------------------------------------------------------------- */
type Banco = {
  id: string;
  nome: string;
  tipo: "Corrente" | "Poupança" | "Aplicação";
};

// Mocks (trocar pelo Supabase)
const MOCK_BANCOS: Banco[] = [
  { id: "bb", nome: "Banco do Brasil", tipo: "Corrente" },
  { id: "ita", nome: "Itaú", tipo: "Corrente" },
  { id: "cef", nome: "Caixa", tipo: "Poupança" },
];

// extrato diário por banco (entradas/saídas) — números em centavos para evitar float
type ExtratoDia = { data: string; entradas: number; saidas: number };
// sistema diário por banco (somatório dos lançamentos) — valor líquido em centavos
type SistemaDia = { data: string; valor: number };

// Gerador de mocks determinísticos por mês/banco (substituir por query)
function seedFor(bancoId: string, year: number, monthIndex0: number) {
  let s = 0;
  for (const ch of `${bancoId}-${year}-${monthIndex0}`) s = (s * 31 + ch.charCodeAt(0)) % 1_000_000;
  return s;
}
function randomBySeed(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
function buildMockFor(bancoId: string, year: number, monthIndex0: number) {
  const rand = randomBySeed(seedFor(bancoId, year, monthIndex0));
  const dates = allDaysOfMonth(year, monthIndex0).map(toISO);
  const extrato: ExtratoDia[] = dates.map((d) => ({
    data: d,
    entradas: Math.round(rand() * 12_000_00),
    saidas: Math.round(rand() * 10_000_00),
  }));
  const sistema: SistemaDia[] = dates.map((d) => ({
    data: d,
    valor: Math.round((rand() - 0.5) * 5_000_00),
  }));
  // alguns dias conciliados (dif ≈ 0)
  for (let i = 0; i < sistema.length; i += 5) {
    const e = extrato[i];
    sistema[i].valor = e.entradas - e.saidas;
  }
  return { extrato, sistema };
}

/* -------------------------------------------------------------------------- */
/*                               Modal simples                                */
/* -------------------------------------------------------------------------- */
function Modal(
  props: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }
) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={props.onClose} />
      <div className="relative z-10 w-[95vw] max-w-6xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold text-lg">{props.title}</h3>
          <Button variant="ghost" onClick={props.onClose}>Fechar</Button>
        </div>
        <div className="p-4">{props.children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                        Página: Conciliação Bancária                         */
/* -------------------------------------------------------------------------- */
export default function ConciliacaoBancariaPage() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth()); // 0..11
  const [bancoId, setBancoId] = useState<string>(MOCK_BANCOS.find(b => b.tipo === "Corrente")?.id ?? "");
  const [lockedDates, setLockedDates] = useState<Record<string, boolean>>({}); // yyyy-mm-dd => locked

  const bancosCorrente = useMemo(() => MOCK_BANCOS.filter(b => b.tipo === "Corrente"), []);
  const { extrato, sistema } = useMemo(() => buildMockFor(bancoId, year, month), [bancoId, year, month]);

  const days = useMemo(() => allDaysOfMonth(year, month), [year, month]);

  type ResumoBanco = { id: string; nome: string; extrato: number; sistema: number; diff: number };
  const resumo: ResumoBanco[] = useMemo(() => {
    return bancosCorrente.map((b) => {
      const { extrato, sistema } = buildMockFor(b.id, year, month);
      const extTotal = extrato.reduce((acc, d) => acc + (d.entradas - d.saidas), 0);
      const sisTotal = sistema.reduce((acc, d) => acc + d.valor, 0);
      return { id: b.id, nome: b.nome, extrato: extTotal, sistema: sisTotal, diff: sisTotal - extTotal };
    });
  }, [bancosCorrente, year, month]);

  const extratoByDay = useMemo(() => Object.fromEntries(extrato.map(e => [e.data, e])), [extrato]);
  const sistemaByDay = useMemo(() => Object.fromEntries(sistema.map(s => [s.data, s])), [sistema]);

  function fmtMoneyCents(v: number) {
    const n = v / 100;
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function onPrevMonth() {
    const d = new Date(year, month, 1);
    d.setMonth(d.getMonth() - 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }
  function onNextMonth() {
    const d = new Date(year, month, 1);
    d.setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  // Detail modal (duplo clique)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDate, setDetailDate] = useState<string | null>(null); // yyyy-mm-dd
  const [detailFilter, setDetailFilter] = useState<"nao" | "sim" | "todos">("nao");

  // mocks de linhas (sistema × extrato): normalmente viria da API por dia/banco
  const linhasSistema = useMemo(() => {
    if (!detailDate) return [] as { id: string; descricao: string; valor: number; conciliado: boolean }[];
    const rnd = randomBySeed(seedFor(bancoId + "-S", year, month));
    return Array.from({ length: 12 }, (_, i) => ({
      id: `S-${detailDate}-${i}`,
      descricao: `Lançamento S${i + 1}`,
      valor: Math.round((rnd() - 0.3) * 2_000_00),
      conciliado: rnd() > 0.6,
    }));
  }, [detailDate, bancoId, year, month]);
  const linhasExtrato = useMemo(() => {
    if (!detailDate) return [] as { id: string; descricao: string; valor: number; conciliado: boolean }[];
    const rnd = randomBySeed(seedFor(bancoId + "-E", year, month));
    return Array.from({ length: 10 }, (_, i) => ({
      id: `E-${detailDate}-${i}`,
      descricao: `Extrato E${i + 1}`,
      valor: Math.round((rnd() - 0.3) * 2_000_00),
      conciliado: rnd() > 0.5,
    }));
  }, [detailDate, bancoId, year, month]);

  const [selSistema, setSelSistema] = useState<Record<string, boolean>>({});
  const [selExtrato, setSelExtrato] = useState<Record<string, boolean>>({});
  const somaSelSistema = useMemo(() =>
    Object.entries(selSistema).filter(([, v]) => v).reduce((acc, [id]) => acc + (linhasSistema.find(l => l.id === id)?.valor ?? 0), 0),
  [selSistema, linhasSistema]);
  const somaSelExtrato = useMemo(() =>
    Object.entries(selExtrato).filter(([, v]) => v).reduce((acc, [id]) => acc + (linhasExtrato.find(l => l.id === id)?.valor ?? 0), 0),
  [selExtrato, linhasExtrato]);

  const filteredSistema = useMemo(() => linhasSistema.filter(l => detailFilter === "todos" ? true : detailFilter === "sim" ? l.conciliado : !l.conciliado), [linhasSistema, detailFilter]);
  const filteredExtrato = useMemo(() => linhasExtrato.filter(l => detailFilter === "todos" ? true : detailFilter === "sim" ? l.conciliado : !l.conciliado), [linhasExtrato, detailFilter]);

  function openDetail(dateISO: string) {
    setDetailDate(dateISO);
    setDetailFilter("nao");
    setSelSistema({});
    setSelExtrato({});
    setDetailOpen(true);
  }

  function toggleLock(dateISO: string) {
    // só permite fechar se todos os anteriores estiverem conciliados
    const date = new Date(dateISO);
    for (const d of allDaysOfMonth(year, month)) {
      if (d.getTime() >= date.getTime()) break;
      const k = toISO(d);
      const e = extratoByDay[k];
      const s = sistemaByDay[k];
      const diff = (s?.valor ?? 0) - ((e?.entradas ?? 0) - (e?.saidas ?? 0));
      if (Math.abs(diff) > 0) {
        toast.error("Não é possível fechar o período", { description: "Há data anterior pendente de conciliação." });
        return;
      }
    }
    setLockedDates((prev) => ({ ...prev, [dateISO]: !prev[dateISO] }));
  }

  function handleAutoConciliar() {
    toast("Conciliação automática executada (mock). Revise os resultados.");
  }
  function handleConciliarSelecionados() {
    toast.success("Lançamentos marcados como conciliados (mock).");
    setSelSistema({});
    setSelExtrato({});
  }
  function handleDesconciliarSelecionados() {
    toast("Conciliação removida (mock).");
    setSelSistema({});
    setSelExtrato({});
  }

  // Resumo: cabeçalho
  const monthLabel = new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Topo: Resumo + ações */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-xl font-semibold">Conciliação Bancária</div>
          <div className="ml-auto flex items-center gap-2">
            <select
              className="h-10 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
              value={bancoId}
              onChange={(e) => setBancoId(e.target.value)}
            >
              {bancosCorrente.map((b) => (
                <option key={b.id} value={b.id}>{b.nome}</option>
              ))}
            </select>
            <Button variant="outline" onClick={() => toast("Importar extrato (wire)")}> <Upload className="h-4 w-4"/> Importar extrato</Button>
          </div>
        </div>

        {/* Resumo dos bancos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {resumo.map((r) => (
            <Card key={r.id} className={`p-4 ${r.id === bancoId ? "ring-2 ring-zinc-900 dark:ring-zinc-200" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="font-medium">{r.nome}</div>
                <div className={`text-sm rounded-full px-2 py-0.5 ${Math.abs(r.diff) === 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {Math.abs(r.diff) === 0 ? "Conciliado" : "Pendente"}
                </div>
              </div>
              <div className="mt-2 text-sm grid grid-cols-3 gap-2">
                <div>
                  <div className="text-zinc-500">Extrato</div>
                  <div className="font-semibold">{fmtMoneyCents(r.extrato)}</div>
                </div>
                <div>
                  <div className="text-zinc-500">Sistema</div>
                  <div className="font-semibold">{fmtMoneyCents(r.sistema)}</div>
                </div>
                <div>
                  <div className="text-zinc-500">Diferença</div>
                  <div className={`font-semibold ${r.diff === 0 ? "text-green-600" : "text-red-600"}`}>{fmtMoneyCents(r.diff)}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Navegação de mês/ano */}
      <div className="flex items-center justify-center gap-3 select-none">
        <Button variant="ghost" onClick={onPrevMonth}><ChevronLeft className="h-5 w-5"/></Button>
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold capitalize">{monthLabel}</div>
          <div className="flex flex-col -my-1">
            <button className="p-1" onClick={() => setYear((y) => y + 1)}><ChevronUp className="h-4 w-4"/></button>
            <button className="p-1" onClick={() => setYear((y) => y - 1)}><ChevronDown className="h-4 w-4"/></button>
          </div>
        </div>
        <Button variant="ghost" onClick={onNextMonth}><ChevronRight className="h-5 w-5"/></Button>
      </div>

      {/* Grade de cards (calendário) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {days.map((d) => {
          const iso = toISO(d);
          const w = d.getDay();
          const e = extratoByDay[iso];
          const s = sistemaByDay[iso];
          const ext = (e?.entradas ?? 0) - (e?.saidas ?? 0);
          const sis = s?.valor ?? 0;
          const diff = sis - ext;
          const isWknd = isWeekend(d);
          const locked = !!lockedDates[iso];
          const statusColor = locked ? "bg-zinc-100 dark:bg-zinc-800" : Math.abs(diff) === 0 ? "bg-green-50" : "bg-red-50";
          const clickable = !isWknd;

          return (
            <Card key={iso} className={`${statusColor} ${isWknd ? "opacity-70" : ""}`}>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold text-zinc-500">{PT_WEEKDAYS[w]}</div>
                  <div className="text-lg font-bold">{d.getDate().toString().padStart(2, "0")}</div>
                </div>
                <button
                  className="rounded-xl px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-1"
                  onClick={() => toggleLock(iso)}
                  disabled={isWknd}
                  title={locked ? "Período fechado" : "Fechar período"}
                >
                  {locked ? <Lock className="h-4 w-4"/> : <LockOpen className="h-4 w-4"/>}
                  {locked ? "Fechado" : "Aberto"}
                </button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-zinc-500">Extrato</div>
                    <div className="font-semibold">{fmtMoneyCents(ext)}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Sistema</div>
                    <div className="font-semibold">{fmtMoneyCents(sis)}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Diferença</div>
                    <div className={`font-semibold ${diff === 0 ? "text-green-600" : "text-red-600"}`}>{fmtMoneyCents(diff)}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onDoubleClick={() => clickable && openDetail(iso)}
                    disabled={!clickable}
                    title={clickable ? "Clique duplo para ver detalhes" : "Indisponível em finais de semana"}
                  >
                    {clickable ? "Detalhar (duplo clique)" : "Final de semana"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal de Detalhes */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={`Detalhes — ${detailDate ?? ""}`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="filtro"
                value="nao"
                checked={detailFilter === "nao"}
                onChange={() => setDetailFilter("nao")}
              />
              Não conciliados
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="filtro"
                value="sim"
                checked={detailFilter === "sim"}
                onChange={() => setDetailFilter("sim")}
              />
              Conciliados
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="filtro"
                value="todos"
                checked={detailFilter === "todos"}
                onChange={() => setDetailFilter("todos")}
              />
              Todos
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleAutoConciliar}>Conciliar automaticamente</Button>
            <Button onClick={handleConciliarSelecionados}>Conciliar selecionados</Button>
            <Button variant="ghost" onClick={handleDesconciliarSelecionados}>Desconciliar</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Lado Sistema */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="font-semibold">Sistema</div>
                <div className="text-sm">Selecionados: <span className="font-semibold">{fmtMoneyCents(somaSelSistema)}</span></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[50vh] overflow-auto divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredSistema.map((l) => (
                  <label key={l.id} className="flex items-center justify-between py-2 gap-3">
                    <span className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!selSistema[l.id]}
                        onChange={(e) => setSelSistema((prev) => ({ ...prev, [l.id]: e.target.checked }))}
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">{l.descricao}</span>
                    </span>
                    <span className={`text-sm ${l.valor >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtMoneyCents(l.valor)}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lado Extrato */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="font-semibold">Extrato</div>
                <div className="text-sm">Selecionados: <span className="font-semibold">{fmtMoneyCents(somaSelExtrato)}</span></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[50vh] overflow-auto divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredExtrato.map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-2 gap-3">
                    <span className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!selExtrato[l.id]}
                        onChange={(e) => setSelExtrato((prev) => ({ ...prev, [l.id]: e.target.checked }))}
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">{l.descricao}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${l.valor >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtMoneyCents(l.valor)}</span>
                      {/* Ações do extrato */}
                      <Button variant="ghost" size="sm" onClick={() => toast("Criar despesa (wire)")}>Criar despesa</Button>
                      <Button variant="ghost" size="sm" onClick={() => toast("Criar transferência (wire)")}>Criar transferência</Button>
                      <Button variant="ghost" size="sm" onClick={() => toast("Buscar lançamento (wire)")}>Buscar lançamento</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </Modal>
    </div>
  );
}
