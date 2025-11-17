"use client";

import * as React from "react";
import type { DateRange } from "react-day-picker";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Progress } from "@/components/ui/progress";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { Sun, Moon, ArrowUpRight, ArrowDownRight, Banknote } from "lucide-react";

// 🔗 ajuste o caminho conforme onde você salvou o contexto
import {
  usePeriod,
  usePeriodLabel,
  type PeriodPreset,
} from "@/components/layout/PeriodContext";

/* ------------------------------------------------------------------ */
/*                         MOCKS (trocar depois)                      */
/* ------------------------------------------------------------------ */
const contas = [
  { name: "Banco do Brasil", value: 35000 },
  { name: "Itaú", value: 25000 },
  { name: "Caixa", value: 15000 },
];

const fluxo = [
  { name: "Hoje", entrada: 12000, saida: 8000 },
  { name: "3 dias", entrada: 5000, saida: 7000 },
  { name: "7 dias", entrada: 8000, saida: 4000 },
  { name: "15 dias", entrada: 6000, saida: 9000 },
];
/* ------------------------------------------------------------------ */

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(n);

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#06b6d4", "#ef4444"];

type PageProps = {
  params: { empresaId: string };
};

const PERIOD_PRESETS: PeriodPreset[] = [
  "Hoje",
  "Ontem",
  "Últimos 7 dias",
  "Últimos 30 dias",
  "Este mês",
  "Mês passado",
];

export default function DashboardPage({ params }: PageProps) {
  /* ------------------------ PeriodContext ------------------------ */
  const { period, setPreset, setCustom } = usePeriod();
  const periodLabel = usePeriodLabel();

  const currentRange: DateRange = React.useMemo(
    () => ({
      from: period.from ?? undefined,
      to: period.to ?? undefined,
    }),
    [period.from, period.to]
  );

  const handleRangeChange = React.useCallback(
    (r: DateRange | undefined) => {
      if (!r) return;
      setCustom(r.from ?? null, r.to ?? null);
    },
    [setCustom]
  );

  /* ------------------------ Tema (claro/escuro) ------------------------ */
  const [isDark, setIsDark] = React.useState(true);

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("dashboardTheme");
    if (savedTheme === "light") setIsDark(false);
    if (savedTheme === "dark") setIsDark(true);
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("dashboardTheme", next ? "dark" : "light");
      return next;
    });
  };

  /* ------------------------- Totais de saldos ------------------------- */
  const totalSaldos = React.useMemo(
    () => contas.reduce((acc, c) => acc + (Number(c.value) || 0), 0),
    []
  );

  /* --------------------- Fluxo com Saldo acumulado -------------------- */
  const fluxoComSaldo = React.useMemo(() => {
    let running = totalSaldos;
    return fluxo.map((p) => {
      running = running + (p.entrada || 0) - (p.saida || 0);
      return {
        ...p,
        saldo: running,
        saldoNeg: running < 0 ? running : null,
      };
    });
  }, [totalSaldos]);

  React.useEffect(() => {
    // Buscar dados reais com { period.from, period.to, params.empresaId }
    // Ex:
    // if (!period.from || !period.to) return;
    // void fetch(`/api/dashboard?empresa=${params.empresaId}&from=${period.from.toISOString()}&to=${period.to.toISOString()}`);
  }, [period.from, period.to, params.empresaId]);

  /* ------------------------ Helpers de tema/UI ------------------------ */
  const pageBgClass = isDark
    ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50"
    : "bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900";

  const glowBg = isDark ? (
    <>
      <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl" />
      <div className="absolute -right-32 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="absolute bottom-[-6rem] left-1/3 h-60 w-60 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0.06),_transparent_55%)]" />
    </>
  ) : (
    <>
      <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-indigo-100 blur-3xl" />
      <div className="absolute -right-32 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-sky-100 blur-3xl" />
      <div className="absolute bottom-[-6rem] left-1/3 h-56 w-56 rounded-full bg-emerald-100 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.08),_transparent_55%)]" />
    </>
  );

  const cardBase =
    "rounded-2xl border transition-shadow duration-200 hover:shadow-md";
  const cardSkin = isDark
    ? "border-slate-700/70 bg-slate-900/80"
    : "border-slate-200 bg-white/90";

  const mutedText = isDark ? "text-slate-400" : "text-slate-500";
  const strongText = isDark ? "text-slate-50" : "text-slate-900";
  const subtleBorder = isDark ? "border-slate-700/60" : "border-slate-200";

  return (
    <div className={`relative min-h-screen overflow-hidden ${pageBgClass}`}>
      {/* Glow de fundo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {glowBg}
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/5 px-2 py-1 text-[11px] font-medium text-slate-500 dark:bg-white/5 dark:text-slate-300">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                ●
              </span>
              <span>BPO Financeiro · Visão geral</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Dashboard financeiro
              </h1>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  isDark
                    ? "bg-slate-900/80 text-slate-200 ring-1 ring-slate-700/80"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 shadow-sm"
                }`}
              >
                <Banknote className="h-3.5 w-3.5" />
                {params.empresaId}
              </span>
            </div>
            <p className={`text-xs sm:text-sm ${mutedText}`}>
              Resumo financeiro por período · saldos · fluxo · conciliações
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            {/* Presets de período (conectados ao PeriodContext) */}
            <div className="flex flex-wrap gap-1.5 text-[11px] sm:text-xs sm:justify-end">
              {PERIOD_PRESETS.map((p) => {
                const active = period.preset === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPreset(p)}
                    className={`rounded-full px-3 py-1 font-medium transition ${
                      active
                        ? isDark
                          ? "bg-slate-50 text-slate-900"
                          : "bg-slate-900 text-slate-50"
                        : isDark
                        ? "bg-slate-900/60 text-slate-300 hover:bg-slate-800"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className={
                  isDark
                    ? "flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/80 text-slate-200 ring-1 ring-slate-700/80 hover:bg-slate-800"
                    : "flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                }
                aria-label={isDark ? "Usar tema claro" : "Usar tema escuro"}
              >
                {isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>

              <div className="flex flex-col items-end gap-1">
                <span className={`text-[11px] ${mutedText}`}>
                  Período: {periodLabel}
                </span>
                <DateRangePicker
                  value={currentRange}
                  onChange={handleRangeChange}
                  aria-label="Selecionar período"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo principal */}
        <main className="flex-1 px-4 pb-8 pt-2 sm:px-8">
          <div className="space-y-6">
            {/* Linha 0: KPIs rápidos (mock) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className={`${cardBase} ${cardSkin}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm font-medium">
                    Caixa consolidado
                    <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-2xl font-semibold text-emerald-400">
                    {fmtBRL(totalSaldos)}
                  </p>
                  <p className={`text-xs ${mutedText}`}>
                    Soma das contas bancárias no período selecionado
                  </p>
                </CardContent>
              </Card>

              <Card className={`${cardBase} ${cardSkin}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm font-medium">
                    Fluxo 15 dias
                    <ArrowDownRight className="h-4 w-4 text-sky-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className={`text-2xl font-semibold ${strongText}`}>
                    {fmtBRL(
                      fluxo.reduce(
                        (acc, p) => acc + (p.entrada || 0) - (p.saida || 0),
                        0
                      )
                    )}
                  </p>
                  <p className={`text-xs ${mutedText}`}>
                    Entradas - saídas previstas para os próximos 15 dias
                  </p>
                </CardContent>
              </Card>

              <Card className={`${cardBase} ${cardSkin}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm font-medium">
                    Risco de caixa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Progress
                    value={fluxoComSaldo.some((p) => (p.saldo ?? 0) < 0) ? 72 : 20}
                    className="h-2.5 rounded-full"
                  />
                  <p className={`text-xs ${mutedText}`}>
                    {fluxoComSaldo.some((p) => (p.saldo ?? 0) < 0)
                      ? "Atenção: existe risco de saldo negativo em dias futuros."
                      : "Nenhum dia com saldo negativo previsto no período."}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Linha 1: Saldos + Fluxo */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              {/* SALDOS BANCÁRIOS */}
              <Card className={`${cardBase} ${cardSkin}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                    <span>Saldos bancários</span>
                    <span className={`text-[11px] sm:text-xs ${mutedText}`}>
                      Distribuição por conta
                    </span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-5 md:items-center">
                  {/* Lista */}
                  <div className="md:col-span-2">
                    <ul className="space-y-2 text-sm">
                      {contas.map((c, i) => (
                        <li
                          key={c.name}
                          className={`flex items-center justify-between gap-3 rounded-lg border px-2 py-2 ${subtleBorder}`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              aria-hidden
                              className="inline-block size-3 rounded-full"
                              style={{
                                backgroundColor: COLORS[i % COLORS.length],
                              }}
                            />
                            <span className="font-medium">{c.name}</span>
                          </div>
                          <span className="font-semibold">
                            {fmtBRL(c.value)}
                          </span>
                        </li>
                      ))}
                      <li className={`mt-3 border-t pt-3 ${subtleBorder}`}>
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[11px] uppercase tracking-wide ${mutedText}`}
                          >
                            Total
                          </span>
                          <span className="text-base font-extrabold">
                            {fmtBRL(totalSaldos)}
                          </span>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Donut */}
                  <div className="md:col-span-3 h-72">
                    <div className="relative h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip
                            formatter={(value: number, _name, props) => [
                              fmtBRL(value),
                              props?.payload?.name,
                            ]}
                            cursor={{ opacity: 0.15 }}
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid rgba(148,163,184,0.3)",
                              boxShadow:
                                "0 10px 25px rgba(15,23,42,0.18)",
                            }}
                          />
                          <Pie
                            data={contas}
                            dataKey="value"
                            nameKey="name"
                            outerRadius="75%"
                            innerRadius="50%"
                            paddingAngle={2}
                            labelLine={false}
                          >
                            {contas.map((c, i) => (
                              <Cell
                                key={c.name}
                                fill={COLORS[i % COLORS.length]}
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Total central */}
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div
                            className={`text-[11px] uppercase tracking-wide ${mutedText}`}
                          >
                            Total
                          </div>
                          <div className="text-base md:text-lg font-bold">
                            {fmtBRL(totalSaldos)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* FLUXO */}
              <Card className={`${cardBase} ${cardSkin} xl:col-span-2`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                    <span>Fluxo de caixa (15 dias)</span>
                    <span className={`text-[11px] sm:text-xs ${mutedText}`}>
                      Barras: entrada/saída · Linha: saldo acumulado
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={fluxoComSaldo}>
                      <defs>
                        <linearGradient
                          id="saldoLine"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#2563eb"
                            stopOpacity={1}
                          />
                          <stop
                            offset="100%"
                            stopColor="#2563eb"
                            stopOpacity={0.2}
                          />
                        </linearGradient>
                        <linearGradient
                          id="negFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#ef4444"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="100%"
                            stopColor="#ef4444"
                            stopOpacity={0.05}
                          />
                        </linearGradient>
                      </defs>

                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          if (name === "entrada")
                            return [fmtBRL(value), "Entrada"];
                          if (name === "saida")
                            return [fmtBRL(value), "Saída"];
                          if (name === "saldo" || name === "saldoNeg")
                            return [fmtBRL(value), "Saldo"];
                          return [fmtBRL(value), name];
                        }}
                        cursor={{ opacity: 0.1 }}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid rgba(148,163,184,0.35)",
                          boxShadow:
                            "0 10px 25px rgba(15,23,42,0.18)",
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{ paddingTop: 8 }}
                        formatter={(value: string) =>
                          value === "entrada"
                            ? "Entrada"
                            : value === "saida"
                            ? "Saída"
                            : "Saldo"
                        }
                      />

                      <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />

                      {/* Área para saldo negativo */}
                      <Area
                        type="monotone"
                        dataKey="saldoNeg"
                        stroke="none"
                        fill="url(#negFill)"
                        isAnimationActive={false}
                      />

                      {/* Barras */}
                      <Bar
                        dataKey="entrada"
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="saida"
                        fill="#ef4444"
                        radius={[6, 6, 0, 0]}
                      />

                      {/* Linha saldo */}
                      <Line
                        type="monotone"
                        dataKey="saldo"
                        stroke="url(#saldoLine)"
                        strokeWidth={2}
                        dot={(p) => {
                          const { cx, cy, payload, index } = p as any;
                          const negative = (payload?.saldo ?? 0) < 0;
                          return (
                            <circle
                              key={`dot-${index}`}
                              cx={cx}
                              cy={cy}
                              r={negative ? 4 : 3}
                              fill={negative ? "#ef4444" : "#2563eb"}
                              stroke="white"
                              strokeWidth={1.5}
                            />
                          );
                        }}
                        activeDot={{ r: 5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>

                  {/* Banner alerta saldo negativo */}
                  {fluxoComSaldo.some((p) => (p.saldo ?? 0) < 0) && (
                    <div
                      className={`mt-3 rounded-md border px-3 py-2 text-sm ${
                        isDark
                          ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                          : "border-rose-300 bg-rose-50 text-rose-700"
                      }`}
                    >
                      Alerta: existe dia com{" "}
                      <span className="font-semibold">
                        saldo previsto negativo
                      </span>{" "}
                      nos próximos 15 dias.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Linha 2: Contas a pagar / receber */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card className={`${cardBase} ${cardSkin}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base">
                    Próximos contas a pagar (15 dias)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <ul className="space-y-2">
                    {[{ t: "Fornecedor X", v: "R$ 1.200,00 · 25/09" }, { t: "Aluguel", v: "R$ 850,00 · 28/09" }].map(
                      (i) => (
                        <li
                          key={i.t}
                          className={`flex items-center justify-between rounded-lg border px-2 py-2 ${subtleBorder}`}
                        >
                          <span>{i.t}</span>
                          <span className="font-medium">{i.v}</span>
                        </li>
                      )
                    )}
                  </ul>
                </CardContent>
              </Card>

              <Card className={`${cardBase} ${cardSkin}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base">
                    Próximos contas a receber (15 dias)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <ul className="space-y-2">
                    {[{ t: "Cliente A", v: "R$ 5.000,00 · 26/09" }, { t: "Cliente B", v: "R$ 7.500,00 · 29/09" }].map(
                      (i) => (
                        <li
                          key={i.t}
                          className={`flex items-center justify-between rounded-lg border px-2 py-2 ${subtleBorder}`}
                        >
                          <span>{i.t}</span>
                          <span className="font-medium">{i.v}</span>
                        </li>
                      )
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Linha 3: Faturado + Conciliações */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <Card className={`${cardBase} ${cardSkin}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base">
                    Faturado no período
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-extrabold tracking-tight text-emerald-400 md:text-4xl">
                    R$ 120.000,00
                  </p>
                  <p className={`mt-1 text-xs ${mutedText}`}>
                    Com base no período selecionado
                  </p>
                </CardContent>
              </Card>

              <Card className={`${cardBase} ${cardSkin}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base">
                    Conciliação de cartão
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={60} className="h-3 rounded-full" />
                  <p className="mt-2 text-sm">
                    <span className="font-semibold">60%</span> conciliado com
                    adquirentes
                  </p>
                </CardContent>
              </Card>

              <Card className={`${cardBase} ${cardSkin}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base">
                    Conciliação bancária
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={75} className="h-3 rounded-full" />
                  <p className="mt-2 text-sm">
                    <span className="font-semibold">75%</span> de lançamentos
                    conciliados
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Linha 4: O que falta agendar */}
            <Card className={`${cardBase} ${cardSkin}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base">
                  O que falta agendar (5 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {[{ t: "Pagamento fornecedor Y", v: "R$ 1.000,00 · amanhã" }, { t: "Recebimento cliente Z", v: "R$ 2.300,00 · em 3 dias" }].map(
                    (i) => (
                      <li
                        key={i.t}
                        className={`flex items-center justify-between rounded-lg border px-2 py-2 ${subtleBorder}`}
                      >
                        <span>{i.t}</span>
                        <span className="font-medium">{i.v}</span>
                      </li>
                    )
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
