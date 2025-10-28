"use client";

import * as React from "react";
import type { DateRange } from "react-day-picker";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker, getCurrentMonthRange } from "@/components/ui/date-range-picker";
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
  LabelList,
} from "recharts";

/* ------------------------------------------------------------------ */
/*                         MOCKS (trocar depois)                      */
/* ------------------------------------------------------------------ */
const contas = [
  { name: "Banco do Brasil", value: 35000 },
  { name: "Itaú", value: 25000 },
  { name: "Caixa", value: 15000 },
];

const fluxo = [
  { name: "Hoje",   entrada: 12000, saida: 8000 },
  { name: "3 dias", entrada: 5000,  saida: 7000 },
  { name: "7 dias", entrada: 8000,  saida: 4000 },
  { name: "15 dias",entrada: 6000,  saida: 9000 },
];
/* ------------------------------------------------------------------ */

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(n);

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#06b6d4", "#ef4444"];

type PageProps = {
  params: { empresaId: string };
};

export default function DashboardPage({ params }: PageProps) {
  /* ------------------------ Filtro (mês atual) ------------------------ */
  const [range, setRange] = React.useState<DateRange>(() => getCurrentMonthRange());

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
    // Buscar dados reais com { range.from, range.to, params.empresaId }
  }, [range, params.empresaId]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Topo: título + filtro */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Dashboard — <span className="text-muted-foreground">{params.empresaId}</span>
          </h1>
          <p className="text-sm text-muted-foreground">Resumo financeiro por período</p>
        </div>
        <DateRangePicker
          value={range}
          onChange={(r) => r && setRange(r)}
          aria-label="Selecionar período"
        />
      </div>

      {/* Linha 1: Saldos + Fluxo */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* ---------- SALDOS BANCÁRIOS ---------- */}
        <Card className="rounded-2xl border-muted-foreground/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Saldos Bancários</span>
              <span className="text-xs text-muted-foreground">Resumo por conta</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-5 md:items-center">
            {/* Legenda / Lista */}
            <div className="md:col-span-2">
              <ul className="space-y-2">
                {contas.map((c, i) => (
                  <li
                    key={c.name}
                    className="flex items-center justify-between gap-3 rounded-lg border p-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="inline-block size-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm font-medium">{c.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{fmtBRL(c.value)}</span>
                  </li>
                ))}
                <li className="mt-3 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Total
                    </span>
                    <span className="text-base font-extrabold">{fmtBRL(totalSaldos)}</span>
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
                        <Cell key={c.name} fill={COLORS[i % COLORS.length]} />
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
                    <div className="text-base md:text-lg font-bold">
                      {fmtBRL(totalSaldos)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* ---------- / SALDOS BANCÁRIOS ---------- */}

        {/* ---------- FLUXO ---------- */}
        <Card className="rounded-2xl border-muted-foreground/20 xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Fluxo de Caixa (15 dias)</span>
              <span className="text-xs text-muted-foreground">
                Barras: Entradas/Saídas · Linha: Saldo acumulado
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={fluxoComSaldo}>
                {/* Gradientes sutis */}
                <defs>
                  <linearGradient id="saldoLine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={1} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.2} />
                  </linearGradient>
                  <linearGradient id="negFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                </defs>

                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "entrada") return [fmtBRL(value), "Entrada"];
                    if (name === "saida") return [fmtBRL(value), "Saída"];
                    if (name === "saldo" || name === "saldoNeg") return [fmtBRL(value), "Saldo"];
                    return [fmtBRL(value), name];
                  }}
                  cursor={{ opacity: 0.1 }}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ paddingTop: 8 }}
                  formatter={(value: string) =>
                    value === "entrada" ? "Entrada" :
                    value === "saida"   ? "Saída"   :
                    "Saldo"
                  }
                />

                {/* Linha de referência Y=0 */}
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />

                {/* Área abaixo de zero */}
                <Area
                  type="monotone"
                  dataKey="saldoNeg"
                  stroke="none"
                  fill="url(#negFill)"
                  isAnimationActive={false}
                />

                {/* Barras */}
                <Bar dataKey="entrada" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="saida"   fill="#ef4444" radius={[6, 6, 0, 0]} />

                {/* Linha saldo com DOT custom — AGORA COM KEY ✅ */}
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
                        key={`dot-${index}`}             // ✅ key único por ponto
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
                >
                  {/* Labels apenas saldo < 0 (com key estável) */}
                  <LabelList
                    dataKey="saldo"
                    position="top"
                    content={(props) => {
                      const { x, y, value, index } = props as any;
                      if (typeof value !== "number" || value >= 0) return null;
                      return (
                        <text
                          key={`lbl-${index}`}           // ✅ key no label
                          x={x}
                          y={(y ?? 0) - 6}
                          textAnchor="middle"
                          fontSize={12}
                          fill="#b91c1c"
                          fontWeight={600}
                        >
                          {fmtBRL(value)}
                        </text>
                      );
                    }}
                  />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>

            {/* Banner alerta saldo negativo */}
            {fluxoComSaldo.some((p) => (p.saldo ?? 0) < 0) && (
              <div className="mt-2 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                Alerta: existe dia com <span className="font-semibold">saldo previsto negativo</span> nos próximos 15 dias.
              </div>
            )}
          </CardContent>
        </Card>
        {/* ---------- / FLUXO ---------- */}
      </div>

      {/* Linha 2: Contas a pagar / receber */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-muted-foreground/20">
          <CardHeader>
            <CardTitle>Próximos Contas a Pagar (15 dias)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-2 text-sm">
              {[
                { t: "Fornecedor X", v: "R$ 1.200,00 · 25/09" },
                { t: "Aluguel",      v: "R$ 850,00 · 28/09"  },
              ].map((i) => (
                <li key={i.t} className="flex items-center justify-between rounded-lg border p-2">
                  <span>{i.t}</span>
                  <span className="font-medium">{i.v}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-muted-foreground/20">
          <CardHeader>
            <CardTitle>Próximos Contas a Receber (15 dias)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-2 text-sm">
              {[
                { t: "Cliente A", v: "R$ 5.000,00 · 26/09" },
                { t: "Cliente B", v: "R$ 7.500,00 · 29/09" },
              ].map((i) => (
                <li key={i.t} className="flex items-center justify-between rounded-lg border p-2">
                  <span>{i.t}</span>
                  <span className="font-medium">{i.v}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Linha 3: Faturado + Conciliações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-muted-foreground/20">
          <CardHeader>
            <CardTitle>Faturado no Período</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl md:text-4xl font-extrabold tracking-tight text-green-600">
              R$ 120.000,00
            </p>
            <p className="text-xs text-muted-foreground mt-1">Com base no filtro</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-muted-foreground/20">
          <CardHeader>
            <CardTitle>Conciliação de Cartão</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={60} className="h-3 rounded-full" />
            <p className="text-sm mt-2">60% conciliado</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-muted-foreground/20">
          <CardHeader>
            <CardTitle>Conciliação Bancária</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={75} className="h-3 rounded-full" />
            <p className="text-sm mt-2">75% conciliado</p>
          </CardContent>
        </Card>
      </div>

      {/* Linha 4: O que falta agendar */}
      <Card className="rounded-2xl border-muted-foreground/20">
        <CardHeader>
          <CardTitle>O que falta agendar (5 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {[
              { t: "Pagamento fornecedor Y", v: "R$ 1.000,00 · amanhã" },
              { t: "Recebimento cliente Z",  v: "R$ 2.300,00 · em 3 dias" },
            ].map((i) => (
              <li key={i.t} className="flex items-center justify-between rounded-lg border p-2">
                <span>{i.t}</span>
                <span className="font-medium">{i.v}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
