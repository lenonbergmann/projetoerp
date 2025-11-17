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

import { ArrowUpRight, ArrowDownRight } from "lucide-react";

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

const proximosPagar = [
  { t: "Fornecedor X", v: "R$ 1.200,00 · 25/09" },
  { t: "Aluguel", v: "R$ 850,00 · 28/09" },
  { t: "Impostos federais", v: "R$ 4.500,00 · 30/09" },
];

const proximosReceber = [
  { t: "Cliente A", v: "R$ 5.000,00 · 26/09" },
  { t: "Cliente B", v: "R$ 7.500,00 · 29/09" },
  { t: "Marketplace", v: "R$ 12.800,00 · 01/10" },
];

const faltandoAgendar = [
  { t: "Pagamento fornecedor Y", v: "R$ 1.000,00 · amanhã" },
  { t: "Recebimento cliente Z", v: "R$ 2.300,00 · em 3 dias" },
  { t: "GNRE ICMS", v: "R$ 9.750,00 · em 5 dias" },
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

export default function DashboardPage(_props: PageProps) {
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

  const riscoCaixa = fluxoComSaldo.some((p) => (p.saldo ?? 0) < 0);

  /* ------------------------- Estilos utilitários ---------------------- */

  const cardBase =
    "rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md hover:border-border";
  const sectionTitle =
    "text-sm font-medium tracking-tight text-foreground sm:text-base";

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-300">
      {/* Header “flutuante” da página */}
      <header className="rounded-2xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm backdrop-blur-sm sm:px-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            {/* Breadcrumbs */}
            <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">BPO Financeiro</span>
              <span>/</span>
              <span>Dashboard</span>
              <span>/</span>
              <span className="text-muted-foreground">Visão geral</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Dashboard financeiro
              </h1>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                Online · visão consolidada
              </span>
            </div>

            <p className="text-xs text-muted-foreground sm:text-sm">
              Resumo financeiro por período: saldos, fluxo de caixa, contas a pagar/receber
              e conciliações.
            </p>
          </div>

          {/* Filtros de período (presets + date range) */}
          <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:gap-3">
            <div className="flex flex-wrap justify-end gap-1.5 text-[11px] sm:text-xs">
              {PERIOD_PRESETS.map((p) => {
                const active = period.preset === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPreset(p)}
                    className={`rounded-full px-3 py-1 font-medium transition ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-background/80 text-muted-foreground ring-1 ring-border hover:bg-background"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] text-muted-foreground">
                Período selecionado:{" "}
                <span className="font-medium text-foreground">{periodLabel}</span>
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
      <main className="space-y-6">
        {/* Linha 0: KPIs rápidos (4 colunas em telas grandes) */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3 2xl:grid-cols-4">
          <Card className={cardBase}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-medium">
                Caixa consolidado
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-semibold text-emerald-500">
                {fmtBRL(totalSaldos)}
              </p>
              <p className="text-xs text-muted-foreground">
                Soma das contas bancárias no período selecionado.
              </p>
            </CardContent>
          </Card>

          <Card className={cardBase}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-medium">
                Fluxo 15 dias
                <ArrowDownRight className="h-4 w-4 text-sky-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-semibold">
                {fmtBRL(
                  fluxo.reduce(
                    (acc, p) => acc + (p.entrada || 0) - (p.saida || 0),
                    0
                  )
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Entradas − saídas previstas para os próximos 15 dias.
              </p>
            </CardContent>
          </Card>

          <Card className={cardBase}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-medium">
                Faturado no período
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-semibold text-primary">
                R$ 120.000,00
              </p>
              <p className="text-xs text-muted-foreground">
                Valor bruto faturado no intervalo selecionado.
              </p>
            </CardContent>
          </Card>

          <Card className={cardBase}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-medium">
                Risco de caixa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress
                value={riscoCaixa ? 72 : 20}
                className="h-2.5 rounded-full"
              />
              <p className="text-xs text-muted-foreground">
                {riscoCaixa
                  ? "Atenção: existe risco de saldo negativo em dias futuros."
                  : "Nenhum dia com saldo negativo previsto no período."}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Linha 1: Saldos + Fluxo de caixa (chart grande) */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
          {/* SALDOS BANCÁRIOS */}
          <Card className={cardBase}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                <span className={sectionTitle}>Saldos bancários</span>
                <span className="text-[11px] text-muted-foreground sm:text-xs">
                  Distribuição por conta
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] md:items-center">
              {/* Lista */}
              <div>
                <ul className="space-y-2 text-sm">
                  {contas.map((c, i) => (
                    <li
                      key={c.name}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 px-2.5 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="inline-block size-3 rounded-full"
                          style={{
                            backgroundColor: COLORS[i % COLORS.length],
                          }}
                        />
                        <span className="font-medium text-foreground">
                          {c.name}
                        </span>
                      </div>
                      <span className="font-semibold">{fmtBRL(c.value)}</span>
                    </li>
                  ))}

                  <li className="mt-3 border-t border-dashed border-border/60 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
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
              <div className="h-[260px] sm:h-[280px] lg:h-[320px]">
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
                        outerRadius="80%"
                        innerRadius="55%"
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
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Total
                      </div>
                      <div className="text-base font-bold sm:text-lg">
                        {fmtBRL(totalSaldos)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FLUXO DE CAIXA */}
          <Card className={cardBase}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                <span className={sectionTitle}>Fluxo de caixa (15 dias)</span>
                <span className="text-[11px] text-muted-foreground sm:text-xs">
                  Barras: entrada/saída · Linha: saldo acumulado
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] lg:h-[340px] 2xl:h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={fluxoComSaldo}>
                  <defs>
                    <linearGradient id="saldoLine" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={1} />
                      <stop
                        offset="100%"
                        stopColor="#2563eb"
                        stopOpacity={0.2}
                      />
                    </linearGradient>
                    <linearGradient id="negFill" x1="0" y1="0" x2="0" y2="1">
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
                      if (name === "entrada") return [fmtBRL(value), "Entrada"];
                      if (name === "saida") return [fmtBRL(value), "Saída"];
                      if (name === "saldo" || name === "saldoNeg")
                        return [fmtBRL(value), "Saldo"];
                      return [fmtBRL(value), name];
                    }}
                    cursor={{ opacity: 0.1 }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,0.35)",
                      boxShadow: "0 10px 25px rgba(15,23,42,0.18)",
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

                  {/* Área saldo negativo */}
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

              {riscoCaixa && (
                <div className="mt-3 rounded-md border border-rose-300/60 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-100">
                  Alerta: existe dia com{" "}
                  <span className="font-semibold">saldo previsto negativo</span>{" "}
                  nos próximos 15 dias.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Linha 2: Contas a pagar / receber */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className={cardBase}>
            <CardHeader className="pb-3">
              <CardTitle className={sectionTitle}>
                Próximos contas a pagar (15 dias)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <ul className="space-y-2">
                {proximosPagar.map((i) => (
                  <li
                    key={i.t}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-background/80 px-2.5 py-2"
                  >
                    <span>{i.t}</span>
                    <span className="font-medium">{i.v}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className={cardBase}>
            <CardHeader className="pb-3">
              <CardTitle className={sectionTitle}>
                Próximos contas a receber (15 dias)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <ul className="space-y-2">
                {proximosReceber.map((i) => (
                  <li
                    key={i.t}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-background/80 px-2.5 py-2"
                  >
                    <span>{i.t}</span>
                    <span className="font-medium">{i.v}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Linha 3: Conciliações / performance */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className={cardBase}>
            <CardHeader className="pb-3">
              <CardTitle className={sectionTitle}>
                Conciliação de cartão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={60} className="h-3 rounded-full" />
              <p className="mt-2 text-sm">
                <span className="font-semibold">60%</span> conciliado com
                adquirentes.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Considerando vendas com cartão de crédito e débito.
              </p>
            </CardContent>
          </Card>

          <Card className={cardBase}>
            <CardHeader className="pb-3">
              <CardTitle className={sectionTitle}>
                Conciliação bancária
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={75} className="h-3 rounded-full" />
              <p className="mt-2 text-sm">
                <span className="font-semibold">75%</span> dos lançamentos
                conciliados.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Baseado na última importação de extratos.
              </p>
            </CardContent>
          </Card>

          <Card className={cardBase}>
            <CardHeader className="pb-3">
              <CardTitle className={sectionTitle}>
                Saúde do fluxo de caixa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={riscoCaixa ? 45 : 80} className="h-3 rounded-full" />
              <p className="mt-2 text-sm">
                {riscoCaixa
                  ? "Fluxo pressionado: acompanhe de perto os próximos pagamentos."
                  : "Fluxo saudável: entradas suficientes para cobrir os compromissos."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Indicador calculado com base na projeção de 15 dias.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Linha 4: O que falta agendar */}
        <section>
          <Card className={cardBase}>
            <CardHeader className="pb-3">
              <CardTitle className={sectionTitle}>
                O que falta agendar (5 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {faltandoAgendar.map((i) => (
                  <li
                    key={i.t}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-background/80 px-2.5 py-2"
                  >
                    <span>{i.t}</span>
                    <span className="font-medium">{i.v}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
