'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronRight, FileText, Filter, RefreshCcw, Search, Upload } from 'lucide-react';

// =========================
// Tipos
// =========================
type Moeda = 'USD' | 'EUR';
type APStatus = 'PREVISTO' | 'ABERTO' | 'PAGO' | 'CANCELADO';

type ImportProcess = {
  id: string;
  import_code: string; // código curto amigável
  empresa_codigo_erp: number;
  fornecedor: string;
  moeda_base: Moeda;
  cotacao_prevista: number | null;
  cotacao_realizada: number | null; // se já realizou câmbio
  data_prev_pagamento: string | null; // YYYY-MM-DD
  numero_processo?: string | null;
  numero_di?: string | null;

  // Resumos financeiros
  mercadoria_prev_brl: number;
  mercadoria_real_brl: number | null;
  despesas_brl: number; // sempre BRL
  total_previsto_brl: number;
  total_realizado_brl: number | null;
  variacao_cambial_mercadoria_brl: number;

  // Status (derivado: se há cotacao_realizada -> "COM CÂMBIO"; senão "S/ CÂMBIO")
  ap_status: APStatus;

  // Dados de vitrine (mock)
  invoices_count: number;
  docs_count: number;
};

// =========================
// Helpers
// =========================
function brl(n: number | null | undefined) {
  if (n == null) return '-';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
}
function pct(n: number) {
  return `${n.toFixed(2)}%`;
}
function fmtDate(d: string | null) {
  if (!d) return '-';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('pt-BR');
}
function statusFromCotacao(cotReal?: number | null): 'COM_CAMBIO' | 'SEM_CAMBIO' {
  return cotReal ? 'COM_CAMBIO' : 'SEM_CAMBIO';
}
function StatusBadgeAP({ status }: { status: APStatus }) {
  const map: Record<APStatus, string> = {
    PREVISTO: 'outline',
    ABERTO: 'secondary',
    PAGO: 'default',
    CANCELADO: 'destructive',
  };
  return <Badge variant={map[status] as any}>{status}</Badge>;
}
function CambioBadge({ cotRealizada }: { cotRealizada: number | null }) {
  const sc = statusFromCotacao(cotRealizada);
  return (
    <Badge variant={sc === 'COM_CAMBIO' ? 'default' : 'outline'}>
      {sc === 'COM_CAMBIO' ? 'Câmbio realizado' : 'Câmbio pendente'}
    </Badge>
  );
}
function MoedaBadge({ m }: { m: Moeda }) {
  return <Badge variant="secondary">{m}</Badge>;
}

// =========================
// Mock Data (20 exemplos)
// =========================
const MOCK_IMPORTS: ImportProcess[] = (() => {
  // Para deixar realista, variamos moeda, fornecedor, cotações e valores
  const fornecedores = [
    'Global Tech LLC',
    'EuroTrade GmbH',
    'Pacific Imports Co.',
    'Azul Marinho Logistics',
    'Nordic Parts AB',
    'Shanghai Export Ltd.',
    'Iberia Components SA',
    'Atlantic Freight',
    'Roma Industrial SRL',
    'Baltic Traders OU',
    'Seoul Semis Inc.',
    'Lisboa Cargo PT',
    'Andes Supply CL',
    'Maple Machines CA',
    'Mediterra Foods',
    'Sahara Equip. ME',
    'Tokyo Precision JP',
    'Milan Metals IT',
    'Celtic Pharma IE',
    'Helvetic Tools CH',
  ];
  const moedas: Moeda[] = ['USD', 'EUR'];
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const pad = (n: number) => n.toString().padStart(2, '0');
  const today = new Date();

  const rows: ImportProcess[] = [];
  for (let i = 0; i < 20; i++) {
    const moeda = pick(moedas);
    const prev = moeda === 'USD' ? rand(5.1, 5.7) : rand(5.4, 6.2); // média móvel
    const realized = Math.random() > 0.5 ? prev + rand(-0.2, 0.2) : null;
    const mercadoriaMoeda = rand(10000, 90000); // valor em moeda estrangeira (apenas referência para cálculos)
    const mercadoriaPrevBRL = mercadoriaMoeda * prev;
    const mercadoriaRealBRL = realized ? mercadoriaMoeda * realized : null;
    const despesas = rand(3000, 25000); // BRL
    const totalPrev = mercadoriaPrevBRL + despesas;
    const totalReal = mercadoriaRealBRL ? mercadoriaRealBRL + despesas : null;
    const variacao = mercadoriaRealBRL ? mercadoriaRealBRL - mercadoriaPrevBRL : 0;

    const dt = new Date(today);
    dt.setDate(dt.getDate() + (i - 6)); // alguns no passado, outros no futuro
    const dataPrev = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

    const apStatus: APStatus = realized ? (Math.random() > 0.6 ? 'PAGO' : 'ABERTO') : 'PREVISTO';

    rows.push({
      id: cryptoRandomId(),
      import_code: randomCode8(),
      empresa_codigo_erp: [1534, 2001, 3002][Math.floor(Math.random() * 3)],
      fornecedor: fornecedores[i],
      moeda_base: moeda,
      cotacao_prevista: Number(prev.toFixed(4)),
      cotacao_realizada: realized ? Number(realized.toFixed(4)) : null,
      data_prev_pagamento: dataPrev,
      numero_processo: `PRC-${2025}-${1000 + i}`,
      numero_di: Math.random() > 0.4 ? `DI${2025}${pad(i + 1)}${Math.floor(rand(100, 999))}` : null,

      mercadoria_prev_brl: round2(mercadoriaPrevBRL),
      mercadoria_real_brl: mercadoriaRealBRL ? round2(mercadoriaRealBRL) : null,
      despesas_brl: round2(despesas),
      total_previsto_brl: round2(totalPrev),
      total_realizado_brl: totalReal ? round2(totalReal) : null,
      variacao_cambial_mercadoria_brl: round2(variacao),

      ap_status: apStatus,
      invoices_count: Math.floor(rand(1, 4)),
      docs_count: Math.floor(rand(0, 6)),
    });
  }
  return rows;
})();

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function randomCode8() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function cryptoRandomId() {
  // fallback simples para id mock
  return `${randomCode8()}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// =========================
// Página
// =========================
export default function ImportacoesPage() {
  const [q, setQ] = useState('');
  const [moeda, setMoeda] = useState<'ALL' | Moeda>('ALL');
  const [cambio, setCambio] = useState<'ALL' | 'COM' | 'SEM'>('ALL');
  const [tab, setTab] = useState<'lista' | 'resumo'>('lista');

  const filtered = useMemo(() => {
    return MOCK_IMPORTS.filter((r) => {
      const matchesQ =
        !q ||
        r.fornecedor.toLowerCase().includes(q.toLowerCase()) ||
        r.import_code.toLowerCase().includes(q.toLowerCase()) ||
        (r.numero_processo ?? '').toLowerCase().includes(q.toLowerCase()) ||
        (r.numero_di ?? '').toLowerCase().includes(q.toLowerCase());

      const matchesMoeda = moeda === 'ALL' ? true : r.moeda_base === moeda;
      const matchesCambio =
        cambio === 'ALL'
          ? true
          : cambio === 'COM'
          ? !!r.cotacao_realizada
          : !r.cotacao_realizada;

      return matchesQ && matchesMoeda && matchesCambio;
    }).sort((a, b) => (b.data_prev_pagamento ?? '').localeCompare(a.data_prev_pagamento ?? ''));
  }, [q, moeda, cambio]);

  const kpis = useMemo(() => {
    const totalPrev = filtered.reduce((acc, r) => acc + r.total_previsto_brl, 0);
    const totalReal = filtered.reduce((acc, r) => acc + (r.total_realizado_brl ?? 0), 0);
    const totalVar = filtered.reduce((acc, r) => acc + r.variacao_cambial_mercadoria_brl, 0);
    const countCom = filtered.filter((r) => r.cotacao_realizada).length;
    const countSem = filtered.length - countCom;
    return { totalPrev, totalReal, totalVar, countCom, countSem, total: filtered.length };
  }, [filtered]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Importações</h1>
          <p className="text-sm text-muted-foreground">
            Controle de proformas/invoices, despesas (frete, seguro, DI, etc.), câmbio e integração
            com Contas a Pagar e Budget (mock).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => window.location.reload()}>
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => alert('Exportar CSV (mock)')}>
            <Upload className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button className="gap-2" onClick={() => alert('Relatório (mock)')}>
            <FileText className="h-4 w-4" />
            Relatório
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KpiCard title="Total Previsto" value={brl(kpis.totalPrev)} />
        <KpiCard title="Total Realizado" value={brl(kpis.totalReal)} />
        <KpiCard
          title="Variação Cambial (Mercadoria)"
          value={brl(kpis.totalVar)}
          help="Soma das variações entre previsto e realizado apenas sobre mercadoria."
        />
        <KpiCard title="Com câmbio" value={String(kpis.countCom)} />
        <KpiCard title="Sem câmbio" value={String(kpis.countSem)} />
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Fornecedor, Import Code, Processo, DI..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Moeda</Label>
            <Select value={moeda} onValueChange={(v: any) => setMoeda(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Câmbio</Label>
            <Select value={cambio} onValueChange={(v: any) => setCambio(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="COM">Com câmbio</SelectItem>
                <SelectItem value="SEM">Sem câmbio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Visualização</Label>
            <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="lista">Lista</TabsTrigger>
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo */}
      {tab === 'lista' ? (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableCaption>{filtered.length} processo(s) de importação</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Import Code</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Moeda</TableHead>
                  <TableHead className="text-right">Cot. prevista</TableHead>
                  <TableHead className="text-right">Cot. realizada</TableHead>
                  <TableHead className="text-right">Mercadoria (prev)</TableHead>
                  <TableHead className="text-right">Despesas</TableHead>
                  <TableHead className="text-right">Total (prev)</TableHead>
                  <TableHead className="text-right">Total (real)</TableHead>
                  <TableHead className="text-right">Var. cambial</TableHead>
                  <TableHead>AP</TableHead>
                  <TableHead>Pagto prev.</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{r.import_code}</Badge>
                        <CambioBadge cotRealizada={r.cotacao_realizada} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.numero_processo ?? '-'}{r.numero_di ? ` • ${r.numero_di}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.fornecedor}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.invoices_count} invoice(s) • {r.docs_count} documento(s)
                      </div>
                    </TableCell>
                    <TableCell>
                      <MoedaBadge m={r.moeda_base} />
                    </TableCell>
                    <TableCell className="text-right">
                      {r.cotacao_prevista?.toFixed(4) ?? '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.cotacao_realizada?.toFixed(4) ?? '-'}
                    </TableCell>
                    <TableCell className="text-right">{brl(r.mercadoria_prev_brl)}</TableCell>
                    <TableCell className="text-right">{brl(r.despesas_brl)}</TableCell>
                    <TableCell className="text-right">{brl(r.total_previsto_brl)}</TableCell>
                    <TableCell className="text-right">{brl(r.total_realizado_brl)}</TableCell>
                    <TableCell className="text-right">
                      {brl(r.variacao_cambial_mercadoria_brl)}
                    </TableCell>
                    <TableCell>
                      <StatusBadgeAP status={r.ap_status} />
                    </TableCell>
                    <TableCell>{fmtDate(r.data_prev_pagamento)}</TableCell>
                    <TableCell className="text-right">
                      <DetailsDrawer row={r} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo consolidado (filtro atual)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="col-span-1 md:col-span-3">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <KpiMini title="Processos" value={String(kpis.total)} />
                  <KpiMini title="Com câmbio" value={String(kpis.countCom)} />
                  <KpiMini title="Sem câmbio" value={String(kpis.countSem)} />
                  <KpiMini title="Total Previsto" value={brl(kpis.totalPrev)} />
                  <KpiMini title="Total Realizado" value={brl(kpis.totalReal)} />
                  <KpiMini title="Variação (Mercadoria)" value={brl(kpis.totalVar)} />
                </div>
              </CardContent>
            </Card>
            {/* Dica: aqui depois você pluga gráficos (recharts) */}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =========================
// Subcomponentes
// =========================

function KpiCard({ title, value, help }: { title: string; value: string; help?: string }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-xl font-semibold">
        {value}
        {help ? <div className="text-xs text-muted-foreground mt-1">{help}</div> : null}
      </CardContent>
    </Card>
  );
}

function KpiMini({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function DetailsDrawer({ row }: { row: ImportProcess }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          Ver detalhes
          <ChevronRight className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Importação {row.import_code}</SheetTitle>
          <SheetDescription>
            {row.fornecedor} • {row.moeda_base} • {statusFromCotacao(row.cotacao_realizada) === 'COM_CAMBIO' ? 'Câmbio realizado' : 'Câmbio pendente'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <Info label="Empresa (ERP)" value={String(row.empresa_codigo_erp)} />
            <Info label="Fornecedor" value={row.fornecedor} />
            <Info label="Moeda base" value={row.moeda_base} />
            <Info label="Cot. prevista" value={row.cotacao_prevista?.toFixed(4) ?? '-'} />
            <Info label="Cot. realizada" value={row.cotacao_realizada?.toFixed(4) ?? '-'} />
            <Info label="Pagamento previsto" value={fmtDate(row.data_prev_pagamento)} />
            <Info label="Nº processo" value={row.numero_processo ?? '-'} />
            <Info label="Nº DI" value={row.numero_di ?? '-'} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resumo financeiro</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Mercadoria (prev)" value={brl(row.mercadoria_prev_brl)} />
              <Info label="Mercadoria (real)" value={brl(row.mercadoria_real_brl)} />
              <Info label="Despesas (BRL)" value={brl(row.despesas_brl)} />
              <Info label="Total (prev)" value={brl(row.total_previsto_brl)} />
              <Info label="Total (real)" value={brl(row.total_realizado_brl)} />
              <Info label="Variação cambial (mercadoria)" value={brl(row.variacao_cambial_mercadoria_brl)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Contas a pagar</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">Status</div>
                <StatusBadgeAP status={row.ap_status} />
              </div>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => alert('Ir para Contas a Pagar (mock)')}>
                  Abrir lançamentos
                </Button>
                <Button size="sm" onClick={() => alert('Aplicar câmbio realizado (mock)')}>
                  Aplicar câmbio
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Documentos</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {row.docs_count > 0 ? (
                <div className="text-muted-foreground">{row.docs_count} documento(s) anexado(s)</div>
              ) : (
                <div className="text-muted-foreground">Nenhum documento anexado</div>
              )}
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => alert('Upload (mock)')}>
                  Enviar arquivo
                </Button>
                <Button variant="ghost" size="sm" onClick={() => alert('Ver todos (mock)')}>
                  Ver todos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <SheetFooter className="mt-6">
          <Button className="w-full" onClick={() => alert('Editar processo (mock)')}>Editar processo</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
