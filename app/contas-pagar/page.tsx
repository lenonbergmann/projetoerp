"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  FileText,
  Download,
  ClipboardList,
  CheckSquare,
  Paperclip,
  Copy as CopyIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

/* ============================ TIPOS ============================ */

type Status = "PREVISAO" | "PENDENTE" | "AGENDADO" | "EFETIVADO" | "CONCILIADO";
type MeioPagamento = "PIX" | "BOLETO" | "TRIBUTO" | "TED" | "OUTROS";

type Anexo = {
  id: string;
  nome: string;
  tipo: "boleto" | "nota_fiscal" | "fatura" | "proforma" | "orcamento" | "outro";
  url?: string;
};

export type ContaPagar = {
  id: string;
  empresaCodigoERP: number;
  fornecedor: string;
  valorLiquido: number;
  tipoDoc: string | null;
  numeroDoc: string | null;
  categoria: string | null;
  competencia: string; // YYYY-MM
  vencimento: string; // ISO
  pagamento?: string | null; // ISO
  parcela: string | null;
  descricao: string | null;
  observacao: string | null;
  meioPagamento: MeioPagamento;
  pixChave?: string | null;
  codigoBarras?: string | null;
  status: Status;
  banco: string | null;
  anexos?: Anexo[];
};

/* ============================ HELPERS ============================ */

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (isoOrDate: string | Date) => {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const startOfMonth = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date = new Date()) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const toYYYYMM = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const fmtCompetencia = (ym: string) => {
  const [y, m] = ym.split("-");
  return `${m}/${y}`;
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/* logos (ajuste os caminhos reais do seu projeto) */
const SYSTEM_LOGO_URL = "/logos/system.png";
function empresaLogoUrl(empresaCodigoERP: number) {
  return `/logos/${empresaCodigoERP}.png`;
}

function classMeioPagamento(m: MeioPagamento) {
  switch (m) {
    case "PIX":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "BOLETO":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "TRIBUTO":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "TED":
      return "bg-purple-100 text-purple-700 border border-purple-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

/* ========= Calendário ========= */

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

type MonthGridProps = {
  year: number;
  month: number; // 0-11
  valueStart: Date;
  valueEnd: Date;
  onPick: (d: Date) => void;
};

function MonthGrid({ year, month, valueStart, valueEnd, onPick }: MonthGridProps) {
  const first = new Date(year, month, 1);
  const startWeekDay = (first.getDay() + 6) % 7; // seg=0
  const total = daysInMonth(year, month);

  const leading: (Date | null)[] = Array(startWeekDay).fill(null);
  const monthDays: (Date | null)[] = Array.from({ length: total }).map((_, i) => new Date(year, month, i + 1));
  const cells: (Date | null)[] = leading.concat(monthDays);

  const s = new Date(valueStart.toDateString());
  const e = new Date(valueEnd.toDateString());
  function inRange(d: Date) {
    const dd = new Date(d.toDateString());
    return dd >= s && dd <= e;
  }

  return (
    <div className="text-xs">
      <div className="mb-1 text-center font-medium">
        {first.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) =>
          d ? (
            <button
              key={i}
              type="button"
              onClick={() => onPick(d)}
              className={(inRange(d) ? "bg-primary/10 font-medium " : "hover:bg-accent ") + "h-7 rounded-sm text-[12px]"}
            >
              {d.getDate()}
            </button>
          ) : (
            <div key={i} />
          )
        )}
      </div>
    </div>
  );
}

type CalendarDoubleProps = {
  start: Date;
  end: Date;
  onChange: (start: Date, end: Date) => void;
};

function CalendarDouble({ start, end, onChange }: CalendarDoubleProps) {
  const [view, setView] = useState<Date>(new Date(start.getFullYear(), start.getMonth(), 1));

  function pick(d: Date) {
    const a = new Date(start.toDateString());
    const b = new Date(end.toDateString());
    const click = new Date(d.toDateString());

    if (click < a || click > b) {
      onChange(click, click);
      return;
    }
    const distStart = Math.abs(+click - +a);
    const distEnd = Math.abs(+click - +b);
    if (distStart < distEnd) onChange(click, b);
    else onChange(a, click);
  }

  const monthsLabels = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
  ];

  return (
    <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
      {/* mês esq */}
      <div className="rounded-md border p-2">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            className="h-7 w-7 rounded-md hover:bg-accent"
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        <div className="text-sm font-medium">
            {view.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </div>
          <div className="opacity-0 h-7 w-7" />
        </div>
        <MonthGrid year={view.getFullYear()} month={view.getMonth()} valueStart={start} valueEnd={end} onPick={pick} />
      </div>

      {/* mês dir */}
      <div className="rounded-md border p-2">
        <div className="mb-2 flex items-center justify-between">
          <div className="opacity-0 h-7 w-7" />
          <div className="text-sm font-medium">
            {new Date(view.getFullYear(), view.getMonth() + 1, 1).toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </div>
          <button
            type="button"
            className="h-7 w-7 rounded-md hover:bg-accent"
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <MonthGrid year={view.getFullYear()} month={view.getMonth() + 1} valueStart={start} valueEnd={end} onPick={pick} />
      </div>

      {/* grade meses + ano (clicável para o ano inteiro) */}
      <div className="w-[180px] rounded-md border p-2">
        <div className="mb-1 text-center font-medium">
          <button
            type="button"
            className="rounded px-2 py-0.5 hover:bg-accent"
            title="Selecionar ano inteiro"
            onClick={() => {
              const y = view.getFullYear();
              onChange(new Date(y, 0, 1), new Date(y, 11, 31));
            }}
          >
            {view.getFullYear()}
          </button>
        </div>
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            className="h-7 w-7 rounded-md hover:bg-accent"
            onClick={() => setView(new Date(view.getFullYear() - 1, view.getMonth(), 1))}
            aria-label="Ano anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="h-7 w-7 rounded-md hover:bg-accent"
            onClick={() => setView(new Date(view.getFullYear() + 1, view.getMonth(), 1))}
            aria-label="Próximo ano"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1 text-sm">
          {monthsLabels.map((m, idx) => (
            <button
              key={m}
              type="button"
              className="rounded-md px-2 py-1 text-left hover:bg-accent"
              onClick={() => {
                const a = new Date(view.getFullYear(), idx, 1);
                onChange(new Date(a.getFullYear(), a.getMonth(), 1), new Date(a.getFullYear(), a.getMonth() + 1, 0));
                setView(a);
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================ TOOLTIPS/TOAST ============================ */

function ToastCopied({ text }: { text: string }) {
  return (
    <div className="fixed bottom-4 right-4 z-[1000] animate-in fade-in zoom-in rounded-md border bg-background px-3 py-2 text-sm shadow">
      {text}
    </div>
  );
}

/** Hover que permite mover o mouse até o painel e copiar */
function CopyHover({ label, value }: { label: string; value?: string | null }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const leaveTimer = React.useRef<number | null>(null);

  function safeClose() {
    setOpen(false);
    if (leaveTimer.current) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }

  function onEnter() {
    const r = ref.current?.getBoundingClientRect() || null;
    setRect(r);
    setOpen(true);
    if (leaveTimer.current) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }
  function onLeave() {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => {
      setOpen(false);
      leaveTimer.current = null;
    }, 200) as unknown as number;
  }

  async function onCopy(e: React.MouseEvent) {
    e.stopPropagation();
    if (!value) return;
    await navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const top = Math.max(8, (rect?.bottom ?? 0) + 6);
  const left = Math.min(window.innerWidth - 320, Math.max(8, rect ? rect.left : 8));

  return (
    <>
      <span ref={ref} onMouseEnter={onEnter} onMouseLeave={onLeave} className="relative inline-flex items-center">
        <span className="truncate">{label}</span>
      </span>

      {open && value && (
        <div
          className="fixed z-[999] w-[300px] rounded-md border bg-popover p-2 text-xs shadow"
          style={{ top, left }}
          onMouseEnter={() => {
            if (leaveTimer.current) {
              window.clearTimeout(leaveTimer.current);
              leaveTimer.current = null;
            }
            setOpen(true);
          }}
          onMouseLeave={() => {
            safeClose();
          }}
        >
          <div className="mb-1 font-medium">{label}</div>
          <div className="font-mono break-all">{value}</div>
          <Button size="sm" className="mt-2 gap-1" onClick={onCopy}>
            <CopyIcon className="h-3 w-3" /> Copiar
          </Button>
        </div>
      )}

      {copied && <ToastCopied text="Copiado!" />}
    </>
  );
}

/* ============================ MOCK/LOAD ============================ */

function mockBase(empresa: number): ContaPagar[] {
  const today = new Date();
  const base: ContaPagar[] = [
    {
      id: "P-1001",
      empresaCodigoERP: empresa,
      fornecedor: "Energisa",
      valorLiquido: 1180.55,
      tipoDoc: "BOL",
      numeroDoc: "98765",
      categoria: "Despesas > Energia",
      competencia: toYYYYMM(today),
      vencimento: today.toISOString(),
      parcela: null,
      descricao: "Conta de energia Loja 01",
      observacao: null,
      meioPagamento: "BOLETO",
      codigoBarras: "84670000001880551240200240600987650000123456",
      status: "PENDENTE",
      banco: "Itaú",
      anexos: [{ id: "a1", nome: "Boleto-out-2025.pdf", tipo: "boleto", url: "/anexos/boleto-exemplo.pdf" }],
    },
    {
      id: "P-1002",
      empresaCodigoERP: empresa,
      fornecedor: "Copel Telecom",
      valorLiquido: 299.9,
      tipoDoc: "BOL",
      numeroDoc: "223311",
      categoria: "Despesas > Internet",
      competencia: toYYYYMM(today),
      vencimento: addDays(today, 1).toISOString(),
      parcela: null,
      descricao: "Link dedicado matriz",
      observacao: null,
      meioPagamento: "BOLETO",
      codigoBarras: "83690000002029990002323311000012345670000000",
      status: "PENDENTE",
      banco: "Itaú",
      anexos: [{ id: "a5", nome: "Boleto-223311.pdf", tipo: "boleto", url: "/anexos/boleto-exemplo.pdf" }],
    },
    {
      id: "P-1003",
      empresaCodigoERP: empresa,
      fornecedor: "Vivo",
      valorLiquido: 420,
      tipoDoc: "NF",
      numeroDoc: "A-3344",
      categoria: "Despesas > Telefonia",
      competencia: toYYYYMM(today),
      vencimento: addDays(today, 2).toISOString(),
      parcela: "1/6",
      descricao: "Planos móveis",
      observacao: "Renegociar em nov/25",
      meioPagamento: "PIX",
      pixChave: "chavepix-vivo-3344@bank.com",
      status: "AGENDADO",
      banco: "Sicoob",
      anexos: [{ id: "a2", nome: "Fatura-10-2025.pdf", tipo: "fatura", url: "/anexos/fatura-exemplo.pdf" }],
    },
    {
      id: "P-1004",
      empresaCodigoERP: empresa,
      fornecedor: "Impostos Federais",
      valorLiquido: 15750.32,
      tipoDoc: "DUP",
      numeroDoc: "DARF-8743",
      categoria: "Tributos > Federais",
      competencia: toYYYYMM(today),
      vencimento: addDays(today, 8).toISOString(),
      parcela: null,
      descricao: "IRPJ trimestral",
      observacao: null,
      meioPagamento: "TRIBUTO",
      codigoBarras: "8362000000157500320000000874300",
      status: "PENDENTE",
      banco: "Sicoob",
      anexos: [{ id: "a3", nome: "DARF-8743.jpg", tipo: "outro", url: "/anexos/darf-exemplo.jpg" }],
    },
  ];
  return base;
}

function expandMock(empresa: number): ContaPagar[] {
  const cats = [
    "Compras > Insumos","Pessoal > Benefícios","Serviços > Honorários","Administrativo > Aluguel",
    "Despesas > Manutenção","Despesas > Marketing","Fretes > Transporte","TI > Assinaturas","Despesas > Segurança",
  ];
  const fornecs = [
    "Fornecedor XYZ","Fornecedor Têxtil","Vale Transporte","Aluguel Loja 02","AWS",
    "Google","Agência ABC","Correios","Oficina Delta","Contabilidade XP",
  ];
  const bancos = ["Itaú", "Sicoob", "BB"];
  const docs = ["NF", "BOL", "DUP", "REC"];
  const meios: MeioPagamento[] = ["PIX", "BOLETO", "TRIBUTO", "TED", "OUTROS"];
  const arr: ContaPagar[] = [];
  const start = new Date(new Date().getFullYear(), new Date().getMonth() - 8, 1);

  let id = 1100;
  for (let i = 0; i < 36; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1 + (i % 27));
    const comp = toYYYYMM(d);
    const venc = addDays(d, i % 20).toISOString();
    const meio = meios[i % meios.length];
    const tipo = docs[i % docs.length];
    const fornecedor = fornecs[i % fornecs.length];
    const cat = cats[i % cats.length];
    const banco = bancos[i % bancos.length];
    const valor = Math.round(((i % 9) + 1) * (300 + i * 13.37) * 100) / 100;

    arr.push({
      id: `P-${id++}`,
      empresaCodigoERP: empresa,
      fornecedor,
      valorLiquido: valor,
      tipoDoc: tipo,
      numeroDoc: `${tipo}-${i + 2000}`,
      categoria: cat,
      competencia: comp,
      vencimento: venc,
      pagamento: i % 7 === 0 ? addDays(new Date(venc), 2).toISOString() : null,
      parcela: i % 5 === 0 ? `${(i % 3) + 1}/3` : null,
      descricao: `${cat} – ref. ${comp}`,
      observacao: i % 4 === 0 ? "Observação importante de teste" : null,
      meioPagamento: meio,
      pixChave: meio === "PIX" ? `${fornecedor.toLowerCase().replace(/\s+/g, ".")}@pix.com` : null,
      codigoBarras:
        meio === "BOLETO" || meio === "TRIBUTO"
          ? `836${i}000000${valor.toFixed(2).replace(/\D/g, "")}00${i}`
          : null,
      status:
        i % 6 === 0 ? "CONCILIADO" : i % 6 === 1 ? "EFETIVADO" : i % 6 === 2 ? "AGENDADO" : i % 6 === 3 ? "PREVISAO" : "PENDENTE",
      banco,
      anexos: i % 3 === 0 ? [{ id: `ax-${i}`, nome: `Doc-${i}.pdf`, tipo: "outro", url: "/anexos/boleto-exemplo.pdf" }] : [],
    });
  }
  return arr;
}

async function fetchContasPagar(params: {
  empresaCodigoERP: number;
  inicio: string;
  fim: string;
  search?: string;
  status?: Status | "";
  banco?: string | "";
  categoria?: string | "";
  fornecedor?: string | "";
  tipoDoc?: string | "";
  meioPgto?: MeioPagamento | "";
  dateMode: "VENCIMENTO" | "COMPETENCIA" | "PAGAMENTO";
}): Promise<ContaPagar[]> {
  await new Promise((r) => setTimeout(r, 80));
  const base = [...mockBase(params.empresaCodigoERP), ...expandMock(params.empresaCodigoERP)];

  const from = new Date(params.inicio).getTime();
  const to = new Date(params.fim).getTime();

  let data = base.filter((c) => {
    if (params.dateMode === "VENCIMENTO") {
      const t = +new Date(c.vencimento);
      return t >= from && t <= to;
    }
    if (params.dateMode === "PAGAMENTO") {
      if (!c.pagamento) return false;
      const t = +new Date(c.pagamento);
      return t >= from && t <= to;
    }
    const [yy, mm] = c.competencia.split("-");
    const compDate = new Date(Number(yy), Number(mm) - 1, 15).getTime();
    return compDate >= from && compDate <= to;
  });

  const q = (params.search || "").toLowerCase().trim();
  if (q)
    data = data.filter((c) =>
      [
        c.fornecedor, c.tipoDoc ?? "", c.numeroDoc ?? "", c.categoria ?? "",
        c.competencia, c.descricao ?? "", c.observacao ?? "", c.banco ?? "",
        c.status, c.meioPagamento, c.pixChave ?? "", c.codigoBarras ?? "", BRL.format(c.valorLiquido),
      ].join(" ").toLowerCase().includes(q)
    );

  if (params.status) data = data.filter((c) => c.status === params.status);
  if (params.banco) data = data.filter((c) => (c.banco || "") === params.banco);
  if (params.categoria) data = data.filter((c) => (c.categoria || "").includes(params.categoria!));
  if (params.fornecedor) data = data.filter((c) => c.fornecedor.includes(params.fornecedor!));
  if (params.tipoDoc) data = data.filter((c) => (c.tipoDoc || "") === params.tipoDoc);
  if (params.meioPgto) data = data.filter((c) => c.meioPagamento === params.meioPgto);

  data.sort((a, b) => {
    const ad = +new Date(a.vencimento);
    const bd = +new Date(b.vencimento);
    if (ad !== bd) return ad - bd;
    return b.valorLiquido - a.valorLiquido;
  });

  return data;
}

/* ============================ EXPORTS / RELATÓRIO / REMESSA ============================ */

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportCSV(rows: any[], filename = "contas.csv") {
  if (!rows.length) return;
  const headers = Object.keys(rows[0] ?? {});
  const csv = [
    headers.join(";"),
    ...rows.map((r) => headers.map((h) => String(r[h] ?? "").replace(/;/g, ",")).join(";")),
  ].join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

async function exportXLSX(rows: any[], filename = "contas.xlsx") {
  try {
    const XLSX = await import("xlsx"); // requer dep "xlsx"
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contas");
    const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    downloadBlob(new Blob([out], { type: "application/octet-stream" }), filename);
  } catch {
    alert("Dependência 'xlsx' não encontrada. Instale-a com: npm i xlsx");
  }
}

type BankConfig = { hasCnab: boolean; convenio?: string; layout?: string };
const bankConfigs: Record<string, BankConfig> = {
  "Itaú": { hasCnab: true, convenio: "1234567", layout: "CNAB240" },
  "Sicoob": { hasCnab: true, convenio: "7654321", layout: "CNAB240" },
  "BB": { hasCnab: false },
};

function gerarRemessaCnab240(titulos: ContaPagar[], banco: string, empresaCodigoERP: number) {
  const header = `03300000REMESSA-PAGTOSEMPRESA${String(empresaCodigoERP).padStart(10, "0")} ${new Date()
    .toISOString()
    .slice(0, 10)}\r\n`;
  const body = titulos
    .map((t, i) =>
      `03300013SEGJ${String(i + 1).padStart(5, "0")}${(t.codigoBarras ?? "").padEnd(44, " ")}${String(
        Math.round(t.valorLiquido * 100)
      ).padStart(15, "0")}${(t.fornecedor ?? "").slice(0, 30).padEnd(30, " ")}\r\n`
    )
    .join("");
  const trailer = `03399999${String(titulos.length).padStart(6, "0")}\r\n`;
  return header + body + trailer;
}

function openPrintReport({
  empresaCodigoERP,
  empresaLogo,
  systemLogo,
  itensSelecionados,
}: {
  empresaCodigoERP: number;
  empresaLogo: string;
  systemLogo: string;
  itensSelecionados: ContaPagar[];
}) {
  const porBanco = itensSelecionados.reduce<Record<string, number>>((acc, it) => {
    const b = it.banco || "—";
    acc[b] = (acc[b] ?? 0) + it.valorLiquido;
    return acc;
  }, {});
  const bancosCards = Object.entries(porBanco)
    .map(
      ([b, v]) =>
        `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:10px;">
           <div style="font-size:12px;color:#6b7280">Agendado no banco</div>
           <div style="font-weight:600">${b}</div>
           <div style="font-size:18px;font-weight:700;color:#2563eb">${BRL.format(v)}</div>
         </div>`
    )
    .join("");

  // ❗️ REMOVIDAS as colunas: Tipo, Nº Doc, Competência, Status
  const rows = itensSelecionados
    .map(
      (i) => `<tr>
        <td>${i.fornecedor}</td>
        <td style="text-align:right">${BRL.format(i.valorLiquido)}</td>
        <td>${i.categoria ?? ""}</td>
        <td>${fmtDate(i.vencimento)}</td>
        <td>${i.banco ?? ""}</td>
      </tr>`
    )
    .join("");

  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <title>Relatório de Pagamentos</title>
        <meta charset="utf-8" />
        <style>
          *{box-sizing:border-box}
          body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:24px;color:#111827}
          .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
          .header img{height:42px}
          h1{font-size:18px;margin:6px 0 16px 0}
          .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:16px}
          table{width:100%;border-collapse:collapse;font-size:12px}
          thead th{position:sticky;top:0;background:#fff;border-bottom:1px solid #e5e7eb;padding:8px;text-align:left}
          tbody td{border-bottom:1px solid #f1f5f9;padding:6px}
          .muted{color:#6b7280;font-size:12px}
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${empresaLogo}" onerror="this.style.visibility='hidden'"/>
          <div class="muted">RELATÓRIO DE PAGAMENTOS</div>
          <img src="${systemLogo}" onerror="this.style.visibility='hidden'"/>
        </div>
        <h1>RELATÓRIO DE PAGAMENTOS</h1>

        <div class="cards">${bancosCards}</div>

        <table>
          <thead>
            <tr>
              <th>Fornecedor</th>
              <th style="text-align:right">Valor</th>
              <th>Categoria</th>
              <th>Vencimento</th>
              <th>Banco</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <script>window.onload = () => { window.print(); }</script>
      </body>
    </html>
  `);
  win.document.close();
}

/* ============================ PÁGINA ============================ */

export default function ContasAPagarPage() {
  const router = useRouter();
  const [empresaCodigoERP] = useState<number>(1581);

  const [dateMode, setDateMode] = useState<"VENCIMENTO" | "COMPETENCIA" | "PAGAMENTO">("VENCIMENTO");
  const [rangeStart, setRangeStart] = useState<Date>(startOfMonth(new Date()));
  const [rangeEnd, setRangeEnd] = useState<Date>(endOfMonth(new Date()));
  const [rangeOpen, setRangeOpen] = useState<boolean>(false);
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  // filtros
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [banco, setBanco] = useState<string | "">("");
  const [categoria, setCategoria] = useState<string | "">("");
  const [fornecedor, setFornecedor] = useState<string | "">("");
  const [tipoDoc, setTipoDoc] = useState<string | "">("");
  const [meioPgto, setMeioPgto] = useState<MeioPagamento | "">("");

  // dados/UI
  const [itens, setItens] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const queryParams = useMemo(
    () => ({
      empresaCodigoERP,
      inicio: rangeStart.toISOString().slice(0, 10),
      fim: rangeEnd.toISOString().slice(0, 10),
      search,
      status,
      banco,
      categoria,
      fornecedor,
      tipoDoc,
      meioPgto,
      dateMode,
    }),
    [empresaCodigoERP, rangeStart, rangeEnd, search, status, banco, categoria, fornecedor, tipoDoc, meioPgto, dateMode]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchContasPagar(queryParams)
      .then((data) => {
        if (!active) return;
        setItens(data);
        setSelected({});
      })
      .catch((e) => setError(e?.message || "Falha ao carregar"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [queryParams]);

  const itensSelecionados = useMemo(() => itens.filter((c) => selected[c.id]), [itens, selected]);
  const totalSelecionado = useMemo(() => itensSelecionados.reduce((s, c) => s + c.valorLiquido, 0), [itensSelecionados]);
  const allSelected = useMemo(() => itens.length > 0 && itens.every((c) => selected[c.id]), [itens, selected]);
  const anySelected = itensSelecionados.length > 0;

  function toggleSelectAll(checked: boolean) {
    if (!checked) return setSelected({});
    const next: Record<string, boolean> = {};
    itens.forEach((c) => (next[c.id] = true));
    setSelected(next);
  }
  function clearFilters() {
    setSearch("");
    setStatus("");
    setBanco("");
    setCategoria("");
    setFornecedor("");
    setTipoDoc("");
    setMeioPgto("");
  }

  const statusColor: Record<Status, string> = {
    PREVISAO: "bg-amber-100 text-amber-700 border border-amber-200",
    PENDENTE: "bg-red-100 text-red-700 border border-red-200",
    AGENDADO: "bg-blue-100 text-blue-700 border border-blue-200",
    EFETIVADO: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    CONCILIADO: "bg-purple-100 text-purple-700 border border-purple-200",
  };

  type SortKey =
    | "fornecedor"
    | "valorLiquido"
    | "tipoDoc"
    | "numeroDoc"
    | "categoria"
    | "competencia"
    | "vencimento"
    | "parcela"
    | "descricao"
    | "observacao"
    | "banco"
    | "status";
  const [sortBy, setSortBy] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  function toggleSort(k: SortKey) {
    setSortBy(() => k);
    setSortDir((prev) => (sortBy === k ? (prev === "asc" ? "desc" : "asc") : "asc"));
  }
  const itensSorted = useMemo(() => {
    if (!sortBy) return itens;
    const key = sortBy;
    const copy = [...itens];
    copy.sort((a, b) => {
      const av = (a as any)[key];
      const bv = (b as any)[key];

      if (key === "valorLiquido") {
        const aNum = Number(av ?? 0);
        const bNum = Number(bv ?? 0);
        return sortDir === "asc" ? aNum - bNum : bNum - aNum;
      }
      if (key === "vencimento") {
        const aDate = av ? +new Date(av as string) : 0;
        const bDate = bv ? +new Date(bv as string) : 0;
        return sortDir === "asc" ? aDate - bDate : bDate - aDate;
      }

      if (av == null && bv != null) return 1;
      if (av != null && bv == null) return -1;
      if (av == null && bv == null) return 0;

      const result = String(av).localeCompare(String(bv), "pt-BR", { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? result : -result;
    });
    return copy;
  }, [itens, sortBy, sortDir]);

  /* ===== KPIs ===== */
  const kpis = useMemo(() => {
    const count = itens.length;
    const total = itens.reduce((s, c) => s + c.valorLiquido, 0);
    const pendArr = itens.filter((i) => i.status === "PENDENTE" || i.status === "PREVISAO");
    const agArr = itens.filter((i) => i.status === "AGENDADO");
    const quitArr = itens.filter((i) => i.status === "EFETIVADO");
    const concArr = itens.filter((i) => i.status === "CONCILIADO");
    const sum = (arr: ContaPagar[]) => arr.reduce((s, c) => s + c.valorLiquido, 0);
    return {
      total: { v: total, c: count },
      pend: { v: sum(pendArr), c: pendArr.length },
      ag: { v: sum(agArr), c: agArr.length },
      quit: { v: sum(quitArr), c: quitArr.length },
      conc: { v: sum(concArr), c: concArr.length },
    };
  }, [itens]);

  return (
    <div className="flex flex-col gap-3 p-2 md:p-3">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Contas a Pagar</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Empresa selecionada: <span className="font-medium">{empresaCodigoERP}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2" variant="default">
                <Plus className="h-4 w-4" /> Nova despesa
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Criar despesa</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/contas-pagar/nova")}>Com fornecedor</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/contas-pagar/nova?tipo=funcionario")}>Com funcionário</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/contas-pagar/nova?tipo=imposto")}>Imposto</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/contas-pagar/nova?tipo=dl")}>Distribuição de lucros</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="secondary" className="gap-2" onClick={() => console.log("nova transferência")}>
            <Plus className="h-4 w-4" /> Nova transferência
          </Button>
        </div>
      </div>

      {/* CARDS KPI */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Valor total (filtrado)</div>
            <div className="mt-1 text-xl font-semibold">{BRL.format(kpis.total.v)}</div>
            <div className="text-xs text-muted-foreground">{kpis.total.c} título(s)</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Total pendente</div>
            <div className="mt-1 text-xl font-semibold text-red-600">{BRL.format(kpis.pend.v)}</div>
            <div className="text-xs text-muted-foreground">{kpis.pend.c} título(s)</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Total agendado</div>
            <div className="mt-1 text-xl font-semibold text-blue-600">{BRL.format(kpis.ag.v)}</div>
            <div className="text-xs text-muted-foreground">{kpis.ag.c} título(s)</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Total quitado</div>
            <div className="mt-1 text-xl font-semibold text-emerald-600">{BRL.format(kpis.quit.v)}</div>
            <div className="text-xs text-muted-foreground">{kpis.quit.c} título(s)</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Total conciliado</div>
            <div className="mt-1 text-xl font-semibold text-purple-600">{BRL.format(kpis.conc.v)}</div>
            <div className="text-xs text-muted-foreground">{kpis.conc.c} título(s)</div>
          </CardContent>
        </Card>
      </div>

      {/* ====== Filtros ====== */}
      <div className="text-xs font-medium px-1">Filtros</div>
      <div className="rounded-xl border bg-card/50 px-3 py-2 shadow-sm">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          {/* Busca */}
          <div className="flex flex-col">
            <Label className="mb-1 text-[11px] text-muted-foreground">Busca rápida</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Digite qualquer coisa…"
                className="pl-8 h-8 w-[220px]"
              />
            </div>
          </div>

          {/* Tipo de data */}
          <div className="flex flex-col">
            <Label className="mb-1 text-[11px] text-muted-foreground">Tipo de data</Label>
            <Select value={dateMode} onValueChange={(v) => setDateMode(v as any)}>
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VENCIMENTO">Vencimento</SelectItem>
                <SelectItem value="COMPETENCIA">Competência</SelectItem>
                <SelectItem value="PAGAMENTO">Pagamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Período */}
          <div className="flex flex-col">
            <Label className="mb-1 text-[11px] text-muted-foreground">Período</Label>
            <Popover
              open={rangeOpen}
              onOpenChange={(v) => {
                setRangeOpen(v);
                if (v) {
                  setCustomStart(rangeStart.toISOString().slice(0, 10));
                  setCustomEnd(rangeEnd.toISOString().slice(0, 10));
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 gap-2 w-[260px]">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="truncate">
                    {fmtDate(rangeStart)} — {fmtDate(rangeEnd)}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                {/* Últimos */}
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Últimos</span>
                  {[7, 15, 30].map((n) => (
                    <Button
                      key={n}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const end = new Date();
                        const start = addDays(end, -n + 1);
                        setRangeStart(new Date(start.getFullYear(), start.getMonth(), start.getDate()));
                        setRangeEnd(new Date(end.getFullYear(), end.getMonth(), end.getDate()));
                      }}
                    >
                      {n}
                    </Button>
                  ))}
                  <span className="ml-1 text-muted-foreground">Dias</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="ml-auto"
                    onClick={() => {
                      const d = new Date();
                      const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                      setRangeStart(local);
                      setRangeEnd(local);
                    }}
                  >
                    Apenas Hoje
                  </Button>
                </div>

                {/* PERSONALIZADO */}
                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr_auto_auto] sm:items-end">
                  <div>
                    <Label className="mb-1 block text-xs">Início</Label>
                    <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-8" />
                  </div>
                  <div className="hidden sm:flex items-center justify-center text-sm text-muted-foreground">—</div>
                  <div>
                    <Label className="mb-1 block text-xs">Fim</Label>
                    <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-8" />
                  </div>
                  <div className="hidden sm:block" />
                  <Button
                    variant="outline"
                    className="h-8"
                    onClick={() => {
                      if (customStart && customEnd) {
                        const ms = /^(\d{4})-(\d{2})-(\d{2})$/.exec(customStart);
                        const me = /^(\d{4})-(\d{2})-(\d{2})$/.exec(customEnd);
                        if (ms && me) {
                          const a = new Date(Number(ms[1]), Number(ms[2]) - 1, Number(ms[3]));
                          const b = new Date(Number(me[1]), Number(me[2]) - 1, Number(me[3]));
                          if (!Number.isNaN(+a) && !Number.isNaN(+b) && a <= b) {
                            setRangeStart(a);
                            setRangeEnd(b);
                          }
                        }
                      }
                    }}
                  >
                    Aplicar personalizado
                  </Button>
                </div>

                <CalendarDouble
                  start={rangeStart}
                  end={rangeEnd}
                  onChange={(a: Date, b: Date) => {
                    setRangeStart(a);
                    setRangeEnd(b);
                  }}
                />

                <div className="mt-3 flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRangeStart(startOfMonth(new Date()));
                      setRangeEnd(endOfMonth(new Date()));
                      setRangeOpen(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={() => setRangeOpen(false)}>Aplicar período</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Status */}
          <div className="flex flex-col">
            <Label className="mb-1 text-[11px] text-muted-foreground">Status</Label>
            <Select value={status || "__all__"} onValueChange={(v) => setStatus(v === "__all__" ? "" : (v as any))}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="PREVISAO">Previsão</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="AGENDADO">Agendado</SelectItem>
                <SelectItem value="EFETIVADO">Efetivado</SelectItem>
                <SelectItem value="CONCILIADO">Conciliado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Banco */}
          <div className="flex flex-col">
            <Label className="mb-1 text-[11px] text-muted-foreground">Banco</Label>
            <Select value={banco || "__all__"} onValueChange={(v) => setBanco(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-8 w-[140px]"><SelectValue placeholder="Banco" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="Itaú">Itaú</SelectItem>
                <SelectItem value="Sicoob">Sicoob</SelectItem>
                <SelectItem value="BB">Banco do Brasil</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo doc */}
          <div className="flex flex-col">
            <Label className="mb-1 text-[11px] text-muted-foreground">Tipo doc</Label>
            <Select value={tipoDoc || "__all__"} onValueChange={(v) => setTipoDoc(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-8 w-[140px]"><SelectValue placeholder="Tipo doc" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="BOL">Boleto</SelectItem>
                <SelectItem value="NF">Nota Fiscal</SelectItem>
                <SelectItem value="DUP">Duplicata</SelectItem>
                <SelectItem value="REC">Recibo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Meio pgto */}
          <div className="flex flex-col">
            <Label className="mb-1 text-[11px] text-muted-foreground">Meio pgto</Label>
            <Select value={meioPgto || "__all__"} onValueChange={(v) => setMeioPgto(v === "__all__" ? "" : (v as any))}>
              <SelectTrigger className="h-8 w-[140px]"><SelectValue placeholder="Meio pgto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="BOLETO">Boleto</SelectItem>
                <SelectItem value="TRIBUTO">Tributo</SelectItem>
                <SelectItem value="TED">TED</SelectItem>
                <SelectItem value="OUTROS">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Categoria / Fornecedor (popover + inputs) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-8">+ Filtros</Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[520px]">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <Label className="mb-1 block text-xs">Categoria</Label>
                  <Input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex: Energia" className="h-8" />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">Fornecedor</Label>
                  <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex: Energisa" className="h-8" />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="mx-1 hidden md:block" />

          {/* Ações rápidas */}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" className="h-8" onClick={clearFilters}>
              <Filter className="mr-1 h-4 w-4" /> Limpar
            </Button>
            <div className="hidden text-xs text-muted-foreground sm:block">
              {loading ? "Carregando…" : `${itens.length} item(ns)`}
            </div>
          </div>
        </div>
      </div>

      {/* Barra seleção */}
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm md:px-4 md:py-2.5">
          <div className="flex items-center gap-2">
            <Checkbox id="select-all" checked={allSelected} onCheckedChange={(c) => toggleSelectAll(Boolean(c))} />
            <Label htmlFor="select-all" className="text-sm">Selecionar todos (com base nos filtros)</Label>
          </div>
          <Separator className="mx-2 hidden md:block" orientation="vertical" />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline" size="sm" className="gap-2"
              onClick={() => {
                const ids = Object.keys(selected).filter((k) => selected[k]);
                if (!ids.length) return;
                const todosAg = itens.filter((i) => ids.includes(i.id)).every((i) => i.status === "AGENDADO");
                setItens((prev) =>
                  prev.map((i) => {
                    if (!ids.includes(i.id)) return i;
                    if (todosAg) return { ...i, status: "PENDENTE" };
                    if (i.status === "EFETIVADO" || i.status === "CONCILIADO") return i;
                    return { ...i, status: "AGENDADO" };
                  })
                );
              }}
              disabled={!anySelected}
            >
              <ClipboardList className="h-4 w-4" /> Agendar / Desagendar
            </Button>

            <Button
              variant="outline" size="sm" className="gap-2"
              onClick={() => {
                const ids = Object.keys(selected).filter((k) => selected[k]);
                if (!ids.length) return;
                const todosQuit = itens.filter((i) => ids.includes(i.id)).every((i) => i.status === "EFETIVADO" || i.status === "CONCILIADO");
                setItens((prev) =>
                  prev.map((i) => {
                    if (!ids.includes(i.id)) return i;
                    if (todosQuit) return { ...i, status: "PENDENTE" };
                    return { ...i, status: "EFETIVADO" };
                  })
                );
              }}
              disabled={!anySelected}
            >
              <CheckSquare className="h-4 w-4" /> Quitar / Reabrir
            </Button>

            {/* RELATÓRIO */}
            <Button
              variant="outline" size="sm" className="gap-2"
              onClick={() => {
                if (!anySelected) return;
                openPrintReport({
                  empresaCodigoERP,
                  empresaLogo: empresaLogoUrl(empresaCodigoERP),
                  systemLogo: SYSTEM_LOGO_URL,
                  itensSelecionados,
                });
              }}
              disabled={!anySelected}
            >
              <FileText className="h-4 w-4" /> Relatório
            </Button>

            {/* EXPORTAR */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" disabled={!anySelected}>
                  <Download className="h-4 w-4" /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => {
                    const rows = itensSelecionados.map((i) => ({
                      fornecedor: i.fornecedor,
                      valor: i.valorLiquido,
                      categoria: i.categoria,
                      vencimento: i.vencimento,
                      banco: i.banco,
                    }));
                    exportCSV(rows, "contas.csv");
                  }}
                >
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const rows = itensSelecionados.map((i) => ({
                      Fornecedor: i.fornecedor,
                      Valor: i.valorLiquido,
                      Categoria: i.categoria,
                      Vencimento: i.vencimento,
                      Banco: i.banco,
                    }));
                    exportXLSX(rows, "contas.xlsx");
                  }}
                >
                  XLSX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* REMESSA */}
            <Button
              variant="outline" size="sm" className="gap-2"
              onClick={() => {
                if (!anySelected) return;
                const bancosSel = Array.from(new Set(itensSelecionados.map((i) => i.banco || ""))).filter(Boolean);
                if (bancosSel.length !== 1) {
                  alert("Para gerar remessa, selecione títulos de um único banco.");
                  return;
                }
                const bancoSel = bancosSel[0]!;
                const cfg = bankConfigs[bancoSel];
                if (!cfg || !cfg.hasCnab || !cfg.convenio) {
                  alert(`O banco "${bancoSel}" não possui convênio/arquivo remessa configurado no cadastro.`);
                  return;
                }
                const conteudo = gerarRemessaCnab240(itensSelecionados, bancoSel, empresaCodigoERP);
                downloadBlob(new Blob([conteudo], { type: "text/plain;charset=utf-8" }), `REM_${bancoSel}_${Date.now()}.rem`);
              }}
              disabled={!anySelected}
            >
              <Download className="h-4 w-4" /> Remessa
            </Button>
          </div>

          <div className="ml-auto text-[13px]">
            Sel.: <span className="font-semibold">{itensSelecionados.length}</span> | Total:{" "}
            <span className="font-semibold">{BRL.format(totalSelecionado)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
        <div className="relative max-h-[60vh] overflow-auto">
          <Table className="text-[13px]">
            <colgroup>
              <col style={{ width: "20%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: 64 }} />
              <col style={{ width: 64 }} />
            </colgroup>

            <TableHeader className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 border-b shadow-sm">
              <TableRow>
                <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort("fornecedor")}>
                  Fornecedor
                </TableHead>
                <TableHead className="font-semibold cursor-pointer select-none text-right" onClick={() => toggleSort("valorLiquido")}>
                  Valor líquido
                </TableHead>
                <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort("tipoDoc")}>
                  Tipo doc
                </TableHead>
                <TableHead className="font-semibold">Meio pgto</TableHead>
                <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort("numeroDoc")}>
                  Nº doc
                </TableHead>
                <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort("categoria")}>
                  Categoria
                </TableHead>
                <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort("competencia")}>
                  Competência
                </TableHead>
                <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort("vencimento")}>
                  Vencimento
                </TableHead>
                <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort("banco")}>
                  Banco
                </TableHead>
                <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort("status")}>
                  Status
                </TableHead>
                <TableHead className="font-semibold">Anexos</TableHead>
                <TableHead className="font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-muted-foreground/10">
              {error && (
                <TableRow>
                  <TableCell colSpan={12} className="px-3 py-3 text-red-600">
                    {error}
                  </TableCell>
                </TableRow>
              )}
              {!error && !loading && itensSorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="px-3 py-4 text-muted-foreground">
                    Nenhuma conta a pagar encontrada.
                  </TableCell>
                </TableRow>
              )}

              {itensSorted.map((item) => {
                const isSel = !!selected[item.id];
                return (
                  <TableRow
                    key={item.id}
                    onClick={() => setSelected((s) => ({ ...s, [item.id]: !s[item.id] }))}
                    onDoubleClick={() => router.push(`/contas-pagar/${item.id}`)}
                    className={cn(
                      "h-10 transition-colors",
                      !isSel && "hover:bg-muted/30",
                      isSel && "bg-yellow-100 hover:bg-yellow-200"
                    )}
                    title="Clique para selecionar; duplo clique para editar"
                  >
                    <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis" title={item.fornecedor}>
                      {item.fornecedor}
                    </TableCell>

                    <TableCell
                      className="whitespace-nowrap text-right font-medium tabular-nums"
                      title={BRL.format(item.valorLiquido)}
                    >
                      {BRL.format(item.valorLiquido)}
                    </TableCell>

                    <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis" title={item.tipoDoc || ""}>
                      {item.tipoDoc}
                    </TableCell>

                    <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis">
                      <span
                        className={cn(
                          "inline-flex h-6 items-center rounded-full px-2 text-[11px] whitespace-nowrap",
                          classMeioPagamento(item.meioPagamento)
                        )}
                      >
                        {item.meioPagamento === "PIX" && <CopyHover label="PIX" value={item.pixChave} />}
                        {(item.meioPagamento === "BOLETO" || item.meioPagamento === "TRIBUTO") && (
                          <CopyHover label={item.meioPagamento === "BOLETO" ? "Boleto" : "Tributo"} value={item.codigoBarras} />
                        )}
                        {item.meioPagamento === "TED" && <span className="truncate">TED</span>}
                        {item.meioPagamento === "OUTROS" && <span className="truncate">Outros</span>}
                      </span>
                    </TableCell>

                    <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis" title={item.numeroDoc || ""}>
                      {item.numeroDoc}
                    </TableCell>

                    <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis" title={item.categoria || ""}>
                      {item.categoria}
                    </TableCell>

                    <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis" title={fmtCompetencia(item.competencia)}>
                      {fmtCompetencia(item.competencia)}
                    </TableCell>

                    <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis" title={fmtDate(item.vencimento)}>
                      {fmtDate(item.vencimento)}
                    </TableCell>

                    <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis" title={item.banco || ""}>
                      {item.banco}
                    </TableCell>

                    <TableCell>
                      <span className={cn("inline-flex h-6 items-center rounded-full px-2 text-[11px]", statusColor[item.status])}>
                        {item.status === "PREVISAO"
                          ? "Previsão"
                          : item.status === "PENDENTE"
                          ? "Pendente"
                          : item.status === "AGENDADO"
                          ? "Agendado"
                          : item.status === "EFETIVADO"
                          ? "Efetivado"
                          : "Conciliado"}
                      </span>
                    </TableCell>

                    {/* anexos */}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Ver anexos"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log("anexos", item.id);
                        }}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </TableCell>

                    {/* ações */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Mais ações" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => router.push(`/contas-pagar/${item.id}`)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setItens((prev) =>
                                prev.map((i) =>
                                  i.id === item.id
                                    ? i.status === "AGENDADO"
                                      ? { ...i, status: "PENDENTE" }
                                      : i.status === "EFETIVADO" || i.status === "CONCILIADO"
                                      ? i
                                      : { ...i, status: "AGENDADO" }
                                    : i
                                )
                              );
                            }}
                          >
                            {item.status === "AGENDADO" ? "Desagendar" : "Agendar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setItens((prev) =>
                                prev.map((i) =>
                                  i.id === item.id
                                    ? i.status === "EFETIVADO" || i.status === "CONCILIADO"
                                      ? { ...i, status: "PENDENTE" }
                                      : { ...i, status: "EFETIVADO" }
                                    : i
                                )
                              );
                            }}
                          >
                            {item.status === "EFETIVADO" || item.status === "CONCILIADO" ? "Reabrir" : "Quitar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log("Desativar", item.id)}>Desativar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log("Duplicar", item.id)}>Duplicar</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => console.log("Anexos", item.id)}>Ver anexos</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
