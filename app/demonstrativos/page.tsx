"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

// shadcn/ui essenciais já existentes no seu projeto
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// icons
import {
  Calendar as CalendarIcon,
  RefreshCw,
  Download,
  BarChart3,
  PieChart as PieIcon,
  Banknote,
  TrendingUp,
  TrendingDown,
  LineChart,
  Building2,
  Layers3,
  Info,
} from "lucide-react";

// charts
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export type DateRange = {
  from?: Date;
  to?: Date;
};

type Filtros = {
  empresaCodigoERP: string;
  lojas: string[];
  base: "caixa" | "competencia";
  moeda: "BRL" | "USD" | "PYG" | "EUR";
  range: DateRange;
  comparar: boolean;
  consolidado: boolean;
};

export type FluxoResumidoRow = { data: string; entradas: number; saidas: number; saldo: number };
export type DFCategoriaRow = { categoria: string; entradas: number; saidas: number; saldo: number };
export type DFFornecedorRow = { fornecedor: string; entradas: number; saidas: number; saldo: number };
export type DRERow = { conta: string; nivel: number; valor: number };
export type FechamentoRow = { nome: string; valor: number };

/* -------------------------------------------------------------------------- */
/*                              Mocks / placeholders                           */
/* -------------------------------------------------------------------------- */
const MOCK_EMPRESAS = [
  { codigo: "1581", nome: "CENTILLION LTDA" },
  { codigo: "2001", nome: "CELLSHOP DUTY FREE" },
];

const MOCK_LOJAS: Record<string, { id: string; nome: string }[]> = {
  "1581": [
    { id: "1", nome: "Matriz" },
    { id: "2", nome: "Filial 2" },
  ],
  "2001": [
    { id: "1", nome: "Matriz (PY)" },
    { id: "3", nome: "Foz Duty" },
  ],
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF", "#FF5A5F", "#00A5CF"]; // Pie mocks

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */
function brl(n: number, moeda: string = "BRL") {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda }).format(n);
  } catch {
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n);
  }
}

function makeDefaultFilters(): Filtros {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    empresaCodigoERP: MOCK_EMPRESAS[0].codigo,
    lojas: [],
    base: "caixa",
    moeda: "BRL",
    range: { from, to },
    comparar: true,
    consolidado: true,
  };
}

/* -------------------------------------------------------------------------- */
/*                                 Fake fetchers                               */
/* -------------------------------------------------------------------------- */
async function fetchFluxoResumido(_f: Filtros): Promise<FluxoResumidoRow[]> {
  const baseDate = _f.range.from ?? new Date();
  const endDate = _f.range.to ?? baseDate;
  const diffDays = Math.max(1, Math.min(31, Math.ceil((endDate.getTime() - baseDate.getTime()) / 86_400_000) + 1));
  const out: FluxoResumidoRow[] = Array.from({ length: diffDays }).map((_, i) => {
    const d = addDays(baseDate, i);
    const entradas = Math.max(0, Math.round(Math.sin(i / 3) * 12000 + 18000));
    const saidas = Math.max(0, Math.round(Math.cos(i / 4) * 8000 + 15000));
    return { data: format(d, "dd/MM", { locale: ptBR }), entradas, saidas, saldo: entradas - saidas };
  });
  return new Promise((r) => setTimeout(() => r(out), 150));
}

async function fetchDFCateg(_f: Filtros): Promise<DFCategoriaRow[]> {
  const mock: DFCategoriaRow[] = [
    { categoria: "Vendas", entradas: 120000, saidas: 0, saldo: 120000 },
    { categoria: "Impostos", entradas: 0, saidas: 38000, saldo: -38000 },
    { categoria: "Fornecedores", entradas: 0, saidas: 54000, saldo: -54000 },
    { categoria: "RH", entradas: 0, saidas: 31000, saldo: -31000 },
    { categoria: "Logística", entradas: 0, saidas: 12000, saldo: -12000 },
  ];
  return new Promise((r) => setTimeout(() => r(mock), 120));
}

async function fetchDFForn(_f: Filtros): Promise<DFFornecedorRow[]> {
  const mock: DFFornecedorRow[] = [
    { fornecedor: "ACME IMPORTS", entradas: 0, saidas: 24000, saldo: -24000 },
    { fornecedor: "PAGAR.ME", entradas: 9800, saidas: 0, saldo: 9800 },
    { fornecedor: "CIELO", entradas: 13400, saidas: 0, saldo: 13400 },
    { fornecedor: "REDE", entradas: 11800, saidas: 0, saldo: 11800 },
    { fornecedor: "OSHER", entradas: 0, saidas: 16000, saldo: -16000 },
  ];
  return new Promise((r) => setTimeout(() => r(mock), 120));
}

async function fetchDRE(_f: Filtros): Promise<DRERow[]> {
  const mock: DRERow[] = [
    { conta: "RECEITA BRUTA", nivel: 1, valor: 320000 },
    { conta: "(-) DEDUÇÕES E IMPOSTOS", nivel: 1, valor: -58000 },
    { conta: "RECEITA LÍQUIDA", nivel: 1, valor: 262000 },
    { conta: "CMV", nivel: 1, valor: -172000 },
    { conta: "LUCRO BRUTO", nivel: 1, valor: 90000 },
    { conta: "DESPESAS OPERACIONAIS", nivel: 1, valor: -54000 },
    { conta: "LUCRO OPERACIONAL", nivel: 1, valor: 36000 },
    { conta: "RESULTADO FINANCEIRO", nivel: 1, valor: -6000 },
    { conta: "LUCRO LÍQUIDO", nivel: 1, valor: 30000 },
  ];
  return new Promise((r) => setTimeout(() => r(mock), 120));
}

async function fetchFechamento(_f: Filtros): Promise<FechamentoRow[]> {
  const mock: FechamentoRow[] = [
    { nome: "Saldo inicial", valor: 50000 },
    { nome: "Entradas", valor: 182000 },
    { nome: "Saídas", valor: -156000 },
    { nome: "Saldo final", valor: 76000 },
  ];
  return new Promise((r) => setTimeout(() => r(mock), 100));
}

/* -------------------------------------------------------------------------- */
/*                                Subcomponents                               */
/* -------------------------------------------------------------------------- */
function KPI({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm text-muted-foreground font-medium">{label}</CardTitle>
          {icon ? <div className="opacity-70">{icon}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function LoadingBlock() {
  return (
    <div className="space-y-3">
      <div className="h-6 w-44 bg-muted/60 rounded" />
      <div className="h-[240px] w-full bg-muted/40 rounded" />
    </div>
  );
}

// Tabs headless (sem dependência de @/components/ui/tabs)
function TabsTrigger({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant={active ? "default" : "outline"} size="sm" onClick={onClick}>{children}</Button>
  );
}

// Date range inputs simples
function DateRangeInputs({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const fromStr = value.from ? format(value.from, "yyyy-MM-dd") : "";
  const toStr = value.to ? format(value.to, "yyyy-MM-dd") : "";
  return (
    <div className="flex items-center gap-2">
      <Input type="date" value={fromStr} onChange={(e) => onChange({ ...value, from: e.target.value ? new Date(e.target.value) : undefined })} />
      <span className="text-muted-foreground">até</span>
      <Input type="date" value={toStr} onChange={(e) => onChange({ ...value, to: e.target.value ? new Date(e.target.value) : undefined })} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Main Page                                 */
/* -------------------------------------------------------------------------- */
export default function DemonstrativosPage() {
  const [filters, setFilters] = React.useState<Filtros>(makeDefaultFilters);

  const [loading, setLoading] = React.useState({ fluxo: true, dfcateg: true, dfforn: true, dre: true, fechamento: true });
  const [fluxo, setFluxo] = React.useState<FluxoResumidoRow[]>([]);
  const [dfcateg, setDFCateg] = React.useState<DFCategoriaRow[]>([]);
  const [dfforn, setDFForn] = React.useState<DFFornecedorRow[]>([]);
  const [dre, setDRE] = React.useState<DRERow[]>([]);
  const [fechamento, setFechamento] = React.useState<FechamentoRow[]>([]);
  const [tab, setTab] = React.useState("fluxo");

  const totalEntradas = React.useMemo(() => fluxo.reduce((acc, r) => acc + r.entradas, 0), [fluxo]);
  const totalSaidas = React.useMemo(() => fluxo.reduce((acc, r) => acc + r.saidas, 0), [fluxo]);
  const saldoPeriodo = React.useMemo(() => totalEntradas - totalSaidas, [totalEntradas, totalSaidas]);

  React.useEffect(() => {
    let alive = true;
    (async () => { setLoading((s) => ({ ...s, fluxo: true })); const data = await fetchFluxoResumido(filters); if (alive) { setFluxo(data); setLoading((s) => ({ ...s, fluxo: false })); } })();
    (async () => { setLoading((s) => ({ ...s, dfcateg: true })); const data = await fetchDFCateg(filters); if (alive) { setDFCateg(data); setLoading((s) => ({ ...s, dfcateg: false })); } })();
    (async () => { setLoading((s) => ({ ...s, dfforn: true })); const data = await fetchDFForn(filters); if (alive) { setDFForn(data); setLoading((s) => ({ ...s, dfforn: false })); } })();
    (async () => { setLoading((s) => ({ ...s, dre: true })); const data = await fetchDRE(filters); if (alive) { setDRE(data); setLoading((s) => ({ ...s, dre: false })); } })();
    (async () => { setLoading((s) => ({ ...s, fechamento: true })); const data = await fetchFechamento(filters); if (alive) { setFechamento(data); setLoading((s) => ({ ...s, fechamento: false })); } })();
    return () => { alive = false; };
  }, [filters.empresaCodigoERP, filters.base, filters.moeda, filters.range.from?.toISOString(), filters.range.to?.toISOString(), filters.lojas.join("|"), filters.consolidado]);

  function apply(next: Partial<Filtros>) {
    setFilters((f) => ({ ...f, ...next }));
  }

  return (
    <div className="px-4 md:px-6 py-4 space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Demonstrativos</h1>
          <p className="text-muted-foreground text-sm">Fluxo de Caixa, DFC por Categoria/Fornecedor, DRE e Fechamento — visão {filters.base}.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setFilters(makeDefaultFilters())}>
            <RefreshCw className="w-4 h-4 mr-2" />Resetar filtros
          </Button>
          <Button size="sm" onClick={() => alert("Export em construção — gere CSV/XLSX/PDF aqui.")}> 
            <Download className="w-4 h-4 mr-2" />Exportar
          </Button>
        </div>
      </div>

      {/* FILTROS */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Empresa */}
            <div className="md:col-span-3">
              <Label>Empresa BPO</Label>
              <Select value={filters.empresaCodigoERP} onValueChange={(v) => apply({ empresaCodigoERP: v, lojas: [] })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Empresas</SelectLabel>
                    {MOCK_EMPRESAS.map((e) => (<SelectItem key={e.codigo} value={e.codigo}>{e.nome}</SelectItem>))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Lojas */}
            <div className="md:col-span-3">
              <Label>Loja</Label>
              <Select
                value={filters.consolidado ? "__all__" : filters.lojas[0] || "__all__"}
                onValueChange={(v) => { if (v === "__all__") apply({ consolidado: true, lojas: [] }); else apply({ consolidado: false, lojas: [v] }); }}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Lojas</SelectLabel>
                    <SelectItem value="__all__">Consolidado</SelectItem>
                    {(MOCK_LOJAS[filters.empresaCodigoERP] || []).map((l) => (<SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Base */}
            <div className="md:col-span-2">
              <Label>Base</Label>
              <Select value={filters.base} onValueChange={(v: any) => apply({ base: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="caixa">Caixa</SelectItem>
                  <SelectItem value="competencia">Competência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Moeda */}
            <div className="md:col-span-2">
              <Label>Moeda</Label>
              <Select value={filters.moeda} onValueChange={(v: any) => apply({ moeda: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="PYG">PYG</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Período */}
            <div className="md:col-span-2">
              <Label>Período</Label>
              <div className="mt-1"><DateRangeInputs value={filters.range} onChange={(range) => apply({ range })} /></div>
            </div>

            {/* Comparar */}
            <div className="md:col-span-12 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={filters.comparar} onCheckedChange={(ck) => apply({ comparar: ck })} />
                <Label>Comparar com período anterior</Label>
                {filters.comparar && (<Badge variant="secondary" className="ml-1">Automático: mesmo número de dias</Badge>)}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => apply({ range: makeDefaultFilters().range })}>
                  <CalendarIcon className="w-4 h-4 mr-2" />Mês atual
                </Button>
                <Button variant="outline" size="sm" onClick={() => apply({ range: { from: addDays(new Date(), -29), to: new Date() } })}>
                  Últimos 30 dias
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs RÁPIDOS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <KPI label="Entradas" value={brl(totalEntradas, filters.moeda)} icon={<TrendingUp className="w-4 h-4" />} />
        <KPI label="Saídas" value={brl(totalSaidas, filters.moeda)} icon={<TrendingDown className="w-4 h-4" />} />
        <KPI label="Saldo do período" value={brl(saldoPeriodo, filters.moeda)} icon={<Banknote className="w-4 h-4" />} />
        <KPI label="Lojas" value={filters.consolidado ? "Consolidado" : filters.lojas[0] || "-"} icon={<Building2 className="w-4 h-4" />} />
      </div>

      {/* TABS lightweight */}
      <div>
        <div className="flex flex-wrap gap-2">
          <TabsTrigger active={tab === "fluxo"} onClick={() => setTab("fluxo")}><BarChart3 className="w-4 h-4 mr-2"/>Fluxo resumido</TabsTrigger>
          <TabsTrigger active={tab === "dfc-categoria"} onClick={() => setTab("dfc-categoria")}><Layers3 className="w-4 h-4 mr-2"/>DFC por categoria</TabsTrigger>
          <TabsTrigger active={tab === "dfc-fornecedor"} onClick={() => setTab("dfc-fornecedor")}><Layers3 className="w-4 h-4 mr-2"/>DFC por fornecedor</TabsTrigger>
          <TabsTrigger active={tab === "dre"} onClick={() => setTab("dre")}><LineChart className="w-4 h-4 mr-2"/>DRE</TabsTrigger>
          <TabsTrigger active={tab === "fechamento"} onClick={() => setTab("fechamento")}><PieIcon className="w-4 h-4 mr-2"/>Fechamento</TabsTrigger>
        </div>

        {/* FLUXO RESUMIDO */}
        {tab === "fluxo" && (
          <Card className="shadow-sm mt-4">
            <CardHeader className="pb-2"><CardTitle className="text-base">Fluxo de caixa (Entradas x Saídas x Saldo)</CardTitle></CardHeader>
            <CardContent>
              {loading.fluxo ? (
                <LoadingBlock />
              ) : (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={fluxo} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="data" />
                      <YAxis tickFormatter={(v) => brl(v, filters.moeda)} />
                      <ReTooltip formatter={(v: any) => brl(Number(v), filters.moeda)} />
                      <Legend />
                      <Area type="monotone" dataKey="saldo" fillOpacity={0.2} fill="#16a34a" stroke="#16a34a" />
                      <Bar dataKey="entradas" barSize={22} fill="#2563eb" />
                      <Bar dataKey="saidas" barSize={22} fill="#ef4444" />
                      <Line type="monotone" dataKey="saldo" stroke="#16a34a" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* DFC POR CATEGORIA */}
        {tab === "dfc-categoria" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">Categorias — Entradas x Saídas</CardTitle></CardHeader>
              <CardContent>
                {loading.dfcateg ? (
                  <LoadingBlock />
                ) : (
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={dfcateg} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="categoria" interval={0} angle={-15} dy={10} height={60} />
                        <YAxis tickFormatter={(v) => brl(v, filters.moeda)} />
                        <ReTooltip formatter={(v: any) => brl(Number(v), filters.moeda)} />
                        <Legend />
                        <Bar dataKey="entradas" stackId="a" fill="#2563eb" />
                        <Bar dataKey="saidas" stackId="a" fill="#ef4444" />
                        <Line type="monotone" dataKey="saldo" stroke="#16a34a" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">Participação por categoria</CardTitle></CardHeader>
              <CardContent>
                {loading.dfcateg ? (
                  <LoadingBlock />
                ) : (
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dfcateg} dataKey="saldo" nameKey="categoria" label>
                          {dfcateg.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                        </Pie>
                        <ReTooltip formatter={(v: any) => brl(Number(v), filters.moeda)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* DFC POR FORNECEDOR */}
        {tab === "dfc-fornecedor" && (
          <Card className="shadow-sm mt-4">
            <CardHeader className="pb-2"><CardTitle className="text-base">Movimentação por fornecedor</CardTitle></CardHeader>
            <CardContent>
              {loading.dfforn ? (
                <LoadingBlock />
              ) : (
                <div className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dfforn} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fornecedor" interval={0} angle={-10} dy={10} height={50} />
                      <YAxis tickFormatter={(v) => brl(v, filters.moeda)} />
                      <ReTooltip formatter={(v: any) => brl(Number(v), filters.moeda)} />
                      <Legend />
                      <Bar dataKey="entradas" fill="#2563eb" />
                      <Bar dataKey="saidas" fill="#ef4444" />
                      <Line type="monotone" dataKey="saldo" stroke="#16a34a" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* DRE */}
        {tab === "dre" && (
          <Card className="shadow-sm mt-4">
            <CardHeader className="pb-2 flex items-center justify-between"><CardTitle className="text-base">Demonstrativo de Resultado do Exercício (DRE)</CardTitle></CardHeader>
            <CardContent>
              {loading.dre ? (
                <LoadingBlock />
              ) : (
                <div className="overflow-auto rounded-md border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Conta</th>
                        <th className="text-right px-3 py-2 font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dre.map((row, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-1">
                            <div className="flex items-center" style={{ paddingLeft: `${(row.nivel - 1) * 16}px` }}>{row.conta}</div>
                          </td>
                          <td className="px-3 py-1 text-right font-medium {row.valor < 0 ? 'text-red-600' : ''}">{brl(row.valor, filters.moeda)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* FECHAMENTO */}
        {tab === "fechamento" && (
          <Card className="shadow-sm mt-4">
            <CardHeader className="pb-2"><CardTitle className="text-base">Resumo de Fechamento</CardTitle></CardHeader>
            <CardContent>
              {loading.fechamento ? (
                <LoadingBlock />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    {fechamento.map((f, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md border p-3">
                        <span className="text-sm text-muted-foreground">{f.nome}</span>
                        <span className={`text-sm font-semibold ${f.valor < 0 ? 'text-red-600' : ''}`}>{brl(f.valor, filters.moeda)}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={fechamento} dataKey="valor" nameKey="nome" label>
                            {fechamento.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                          </Pie>
                          <ReTooltip formatter={(v: any) => brl(Number(v), filters.moeda)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* RODAPÉ */}
      <div className="text-[11px] text-muted-foreground">
        <p>
          Dica: estruture <strong>views SQL</strong> para cada relatório (ex.: <code>vw_fluxo_resumido</code>, <code>vw_dfc_categoria</code>, <code>vw_dfc_fornecedor</code>, <code>vw_dre</code>) e crie rotas <code>/api/demonstrativos/*</code> com parâmetros: <code>empresa</code>, <code>lojas</code>, <code>base</code>, <code>from</code>, <code>to</code>, <code>moeda</code>.
        </p>
      </div>
    </div>
  );
}
