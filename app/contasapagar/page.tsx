"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Calendar as CalendarIcon,
  ChevronDown,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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
  pagamento?: string | null; // ISO (para modo "Pagamento")
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

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const startOfMonth = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date = new Date()) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const toYYYYMM = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const fmtCompetencia = (ym: string) => {
  const [y, m] = ym.split("-");
  return `${m}/${y}`;
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

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

/* ========= Helpers do calendário (range com 2 meses + grade de meses) ========= */

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

  const leading: (Date | null)[] = Array.from({ length: startWeekDay }).map(() => null);
  const monthDays: Date[] = Array.from({ length: total }).map((_, i) => new Date(year, month, i + 1));
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
              className={
                (inRange(d) ? "bg-primary/10 font-medium " : "hover:bg-accent ") +
                "h-7 rounded-sm text-[12px]"
              }
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

    // clique fora do range => reinicia
    if (click < a || click > b) {
      onChange(click, click);
      return;
    }
    // clique dentro => expande para a borda mais próxima
    const distStart = Math.abs(+click - +a);
    const distEnd = Math.abs(+click - +b);
    if (distStart < distEnd) onChange(click, b);
    else onChange(a, click);
  }

  const monthsLabels = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  return (
    <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
      {/* mês da esquerda */}
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

      {/* mês da direita */}
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

      {/* grade mensal + troca de ano */}
      <div className="w-[180px] rounded-md border p-2">
        <div className="mb-1 text-center font-medium">{view.getFullYear()}</div>
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
                onChange(
                  new Date(a.getFullYear(), a.getMonth(), 1),
                  new Date(a.getFullYear(), a.getMonth() + 1, 0)
                );
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

/** Toast simples de feedback (canto inferior direito) */
function ToastCopied({ text }: { text: string }) {
  return (
    <div className="fixed bottom-4 right-4 z-[1000] animate-in fade-in zoom-in rounded-md border bg-background px-3 py-2 text-sm shadow">
      {text}
    </div>
  );
}

/** Tooltip fixo (fora do fluxo/scroll) para não ser cortado */
function FixedHover({
  anchorRect,
  children,
}: {
  anchorRect: DOMRect | null;
  children: React.ReactNode;
}) {
  if (!anchorRect) return null;
  const top = Math.max(8, anchorRect.bottom + 6);
  const left = Math.min(window.innerWidth - 320, Math.max(8, anchorRect.left));
  return (
    <div
      className="fixed z-[999] w-[300px] rounded-md border bg-popover p-2 text-xs shadow"
      style={{ top, left }}
    >
      {children}
    </div>
  );
}

/** Hover de copiar para PIX/BOLETO/TRIBUTO com portal fixo + toast “copiado!” */
function CopyHover({ label, value }: { label: string; value?: string | null }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function onEnter() {
    const r = ref.current?.getBoundingClientRect() || null;
    setRect(r);
    setOpen(true);
  }
  function onLeave() {
    setOpen(false);
  }

  async function onCopy(e: React.MouseEvent) {
    e.stopPropagation();
    if (!value) return;
    await navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className="relative inline-flex items-center"
      >
        <span className="truncate">{label}</span>
      </span>

      {open && value && (
        <FixedHover anchorRect={rect}>
          <div className="mb-1 font-medium">{label}</div>
          <div className="font-mono break-all">{value}</div>
          <Button size="sm" className="mt-2 gap-1" onClick={onCopy}>
            <CopyIcon className="h-3 w-3" /> Copiar
          </Button>
        </FixedHover>
      )}

      {copied && <ToastCopied text="Copiado!" />}
    </>
  );
}

/* ============================ MOCK (40+ itens) ============================ */

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
      anexos: [
        { id: "a1", nome: "Boleto-out-2025.pdf", tipo: "boleto", url: "/anexos/boleto-exemplo.pdf" },
      ],
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

/** Gera +36 itens variados (competências diferentes) */
function expandMock(empresa: number): ContaPagar[] {
  const cats = [
    "Compras > Insumos",
    "Pessoal > Benefícios",
    "Serviços > Honorários",
    "Administrativo > Aluguel",
    "Despesas > Manutenção",
    "Despesas > Marketing",
    "Fretes > Transporte",
    "TI > Assinaturas",
    "Despesas > Segurança",
  ];
  const fornecs = [
    "Fornecedor XYZ",
    "Fornecedor Têxtil",
    "Vale Transporte",
    "Aluguel Loja 02",
    "AWS",
    "Google",
    "Agência ABC",
    "Correios",
    "Oficina Delta",
    "Contabilidade XP",
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
      anexos:
        i % 3 === 0
          ? [{ id: `ax-${i}`, nome: `Doc-${i}.pdf`, tipo: "outro", url: "/anexos/boleto-exemplo.pdf" }]
          : [],
    });
  }
  return arr;
}

async function fetchContasPagar(params: {
  empresaCodigoERP: number;
  inicio: string; // YYYY-MM-DD
  fim: string; // YYYY-MM-DD
  search?: string;
  status?: Status | "";
  banco?: string | "";
  categoria?: string | "";
  fornecedor?: string | "";
  tipoDoc?: string | "";
  meioPgto?: MeioPagamento | "";
  dateMode: "VENCIMENTO" | "COMPETENCIA" | "PAGAMENTO";
}): Promise<ContaPagar[]> {
  await new Promise((r) => setTimeout(r, 100));
  const base = [...mockBase(params.empresaCodigoERP), ...expandMock(params.empresaCodigoERP)];

  // Filtra por modo de data
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
    // COMPETENCIA
    const ym = c.competencia.split("-");
    const compDate = new Date(Number(ym[0]), Number(ym[1]) - 1, 15).getTime();
    return compDate >= from && compDate <= to;
  });

  const q = (params.search || "").toLowerCase().trim();
  if (q)
    data = data.filter((c) =>
      [
        c.fornecedor,
        c.tipoDoc ?? "",
        c.numeroDoc ?? "",
        c.categoria ?? "",
        c.competencia,
        c.descricao ?? "",
        c.observacao ?? "",
        c.banco ?? "",
        c.status,
        c.meioPagamento,
        c.pixChave ?? "",
        c.codigoBarras ?? "",
        BRL.format(c.valorLiquido),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  if (params.status) data = data.filter((c) => c.status === params.status);
  if (params.banco) data = data.filter((c) => (c.banco || "") === params.banco);
  if (params.categoria) data = data.filter((c) => (c.categoria || "").includes(params.categoria!));
  if (params.fornecedor) data = data.filter((c) => c.fornecedor.includes(params.fornecedor!));
  if (params.tipoDoc) data = data.filter((c) => (c.tipoDoc || "") === params.tipoDoc);
  if (params.meioPgto) data = data.filter((c) => c.meioPagamento === params.meioPgto);

  // padrão: vencimento ASC, valor DESC
  data.sort((a, b) => {
    const ad = +new Date(a.vencimento);
    const bd = +new Date(b.vencimento);
    if (ad !== bd) return ad - bd;
    return b.valorLiquido - a.valorLiquido;
  });

  return data;
}

/* ============================ COMPONENTE ============================ */

export default function ContasAPagarPage() {
  const [empresaCodigoERP] = useState<number>(1581);

  // período inicial = mês atual
  const [dateMode, setDateMode] = useState<"VENCIMENTO" | "COMPETENCIA" | "PAGAMENTO">("VENCIMENTO");
  const [rangeStart, setRangeStart] = useState<Date>(startOfMonth(new Date()));
  const [rangeEnd, setRangeEnd] = useState<Date>(endOfMonth(new Date()));
  const [rangeOpen, setRangeOpen] = useState<boolean>(false);

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

  // dialogs
  const [openDetail, setOpenDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<ContaPagar | null>(null);
  const [openAnexos, setOpenAnexos] = useState(false);
  const [anexosItem, setAnexosItem] = useState<ContaPagar | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const totalSelecionado = useMemo(
    () => itens.reduce((s, c) => (selected[c.id] ? s + c.valorLiquido : s), 0),
    [itens, selected]
  );
  const allSelected = useMemo(() => itens.length > 0 && itens.every((c) => selected[c.id]), [itens, selected]);
  const anySelected = useMemo(() => Object.values(selected).some(Boolean), [selected]);

  function toggleSelect(id: string, checked: boolean) {
    setSelected((s) => ({ ...s, [id]: checked }));
  }
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

  // ordenação
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
    const copy = [...itens];
    copy.sort((a, b) => {
      let av: any = (a as any)[sortBy];
      let bv: any = (b as any)[sortBy];
      if (sortBy === "valorLiquido") {
        av = +av;
        bv = +bv;
      }
      if (sortBy === "vencimento") {
        av = +new Date(av);
        bv = +new Date(bv);
      }
      if (av == null && bv != null) return 1;
      if (av != null && bv == null) return -1;
      if (av == null && bv == null) return 0;
      const r = String(av).localeCompare(String(bv), "pt-BR", { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? r : -r;
    });
    return copy;
  }, [itens, sortBy, sortDir]);

  /* ============================ RENDER ============================ */

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
                <Plus className="h-4 w-4" /> Nova despesa <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Criar despesa</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => console.log("Com fornecedor")}>Com fornecedor</DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log("Com funcionário")}>Com funcionário</DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log("Imposto")}>Imposto</DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log("Distribuição de lucros")}>Distribuição de lucros</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="secondary" className="gap-2" onClick={() => console.log("nova transferência")}>
            <Plus className="h-4 w-4" /> Nova transferência
          </Button>
        </div>
      </div>

      {/* Filtros compactos (wrap) */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-wrap items-end gap-2">
            {/* Busca (cresce) */}
            <div className="min-w-[230px] flex-1">
              <Label className="mb-1 block">Busca rápida</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Digite qualquer coisa…" className="pl-8" />
              </div>
            </div>

            {/* Base de data + Range estilo anexo */}
            <div className="min-w-[260px]">
              <Label className="mb-1 block">Período</Label>
              <div className="flex gap-2">
                <Select value={dateMode} onValueChange={(v) => setDateMode(v as any)}>
                  <SelectTrigger className="w-[152px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VENCIMENTO">Vencimento</SelectItem>
                    <SelectItem value="COMPETENCIA">Competência</SelectItem>
                    <SelectItem value="PAGAMENTO">Pagamento</SelectItem>
                  </SelectContent>
                </Select>

                <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {fmtDate(rangeStart.toISOString())} — {fmtDate(rangeEnd.toISOString())}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    {/* “Últimos” */}
                    <div className="mb-2 flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Últimos</span>
                      {[7, 15, 30].map((n) => (
                        <Button
                          key={n}
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const end = new Date();
                            const start = addDays(end, -n + 1);
                            setRangeStart(start);
                            setRangeEnd(end);
                          }}
                        >
                          {n}
                        </Button>
                      ))}
                      <span className="ml-2 text-muted-foreground">Dias</span>
                      <Button
                        variant="link"
                        size="sm"
                        className="ml-4"
                        onClick={() => {
                          const d = new Date();
                          setRangeStart(d);
                          setRangeEnd(d);
                        }}
                      >
                        Apenas Hoje
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

                      <Button
                        onClick={() => {
                          setRangeOpen(false);
                        }}
                      >
                        Aplicar período
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Status */}
            <div className="min-w-[150px]">
              <Label className="mb-1 block">Status</Label>
              <Select value={status || "__all__"} onValueChange={(v) => setStatus(v === "__all__" ? "" : (v as Status))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
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
            <div className="min-w-[140px]">
              <Label className="mb-1 block">Banco</Label>
              <Select value={banco || "__all__"} onValueChange={(v) => setBanco(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="Itaú">Itaú</SelectItem>
                  <SelectItem value="Sicoob">Sicoob</SelectItem>
                  <SelectItem value="BB">Banco do Brasil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo doc */}
            <div className="min-w-[130px]">
              <Label className="mb-1 block">Tipo doc</Label>
              <Select value={tipoDoc || "__all__"} onValueChange={(v) => setTipoDoc(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
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
            <div className="min-w-[130px]">
              <Label className="mb-1 block">Meio pgto</Label>
              <Select value={meioPgto || "__all__"} onValueChange={(v) => setMeioPgto(v === "__all__" ? "" : (v as MeioPagamento))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
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

            {/* Categoria / Fornecedor */}
            <div className="min-w-[160px]">
              <Label className="mb-1 block">Categoria</Label>
              <Input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex: Energia" />
            </div>
            <div className="min-w-[160px]">
              <Label className="mb-1 block">Fornecedor</Label>
              <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex: Energisa" />
            </div>

            {/* Limpar + contador */}
            <div className="ml-auto flex items-end gap-2">
              <Button variant="outline" className="gap-2" onClick={clearFilters}>
                <Filter className="h-4 w-4" /> Limpar
              </Button>
              <div className="text-xs md:text-sm text-muted-foreground">
                {loading ? "Carregando…" : `${itens.length} item(ns)`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Barra seleção (compacta) */}
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm md:px-4 md:py-2.5">
          <div className="flex items-center gap-2">
            <Checkbox id="select-all" checked={allSelected} onCheckedChange={(c) => toggleSelectAll(Boolean(c))} />
            <Label htmlFor="select-all" className="text-sm">
              Selecionar todos (com base nos filtros)
            </Label>
          </div>
          <Separator className="mx-2 hidden md:block" orientation="vertical" />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
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
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                const ids = Object.keys(selected).filter((k) => selected[k]);
                if (!ids.length) return;
                const todosQuit = itens
                  .filter((i) => ids.includes(i.id))
                  .every((i) => i.status === "EFETIVADO" || i.status === "CONCILIADO");
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

            <Button variant="outline" size="sm" className="gap-2" disabled={!anySelected}>
              <FileText className="h-4 w-4" /> Relatório
            </Button>
            <Button variant="outline" size="sm" className="gap-2" disabled={!anySelected}>
              <Download className="h-4 w-4" /> Remessa
            </Button>
            <Button variant="outline" size="sm" className="gap-2" disabled={!anySelected}>
              <Download className="h-4 w-4" /> Exportar
            </Button>
          </div>
          <div className="ml-auto text-[13px]">
            Sel.: <span className="font-semibold">{Object.values(selected).filter(Boolean).length}</span> | Total:{" "}
            <span className="font-semibold">{BRL.format(totalSelecionado)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col style={{ width: 48 }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "6.5%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "7.5%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "7.5%" }} />
              <col style={{ width: "7.5%" }} />
              <col style={{ width: 64 }} />
              <col style={{ width: 64 }} />
            </colgroup>

            <thead className="sticky top-0 z-10 bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="h-10">
                <th className="px-3 text-left">Sel.</th>
                <th onClick={() => toggleSort("fornecedor")} className="cursor-pointer select-none px-3 text-left">
                  Fornecedor
                </th>
                <th onClick={() => toggleSort("valorLiquido")} className="cursor-pointer select-none px-3 text-right">
                  Valor líquido
                </th>
                <th onClick={() => toggleSort("tipoDoc")} className="cursor-pointer select-none px-3 text-left">
                  Tipo doc
                </th>
                <th className="px-3 text-left">Meio pgto</th>
                <th onClick={() => toggleSort("numeroDoc")} className="cursor-pointer select-none px-3 text-left">
                  Nº doc
                </th>
                <th onClick={() => toggleSort("categoria")} className="cursor-pointer select-none px-3 text-left">
                  Categoria
                </th>
                <th onClick={() => toggleSort("competencia")} className="cursor-pointer select-none px-3 text-left">
                  Competência
                </th>
                <th onClick={() => toggleSort("vencimento")} className="cursor-pointer select-none px-3 text-left">
                  Vencimento
                </th>
                <th onClick={() => toggleSort("parcela")} className="cursor-pointer select-none px-3 text-left">
                  Parcela
                </th>
                <th onClick={() => toggleSort("descricao")} className="cursor-pointer select-none px-3 text-left">
                  Descrição
                </th>
                <th onClick={() => toggleSort("observacao")} className="cursor-pointer select-none px-3 text-left">
                  Observação
                </th>
                <th onClick={() => toggleSort("banco")} className="cursor-pointer select-none px-3 text-left">
                  Banco
                </th>
                <th onClick={() => toggleSort("status")} className="cursor-pointer select-none px-3 text-left">
                  Status
                </th>
                <th className="px-3 text-left">Anexos</th>
                <th className="px-3 text-left">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {error && (
                <tr>
                  <td colSpan={16} className="px-3 py-3 text-red-600">
                    {error}
                  </td>
                </tr>
              )}
              {!error && !loading && itensSorted.length === 0 && (
                <tr>
                  <td colSpan={16} className="px-3 py-4 text-muted-foreground">
                    Nenhuma conta a pagar encontrada.
                  </td>
                </tr>
              )}

              {itensSorted.map((item) => (
                <tr
                  key={item.id}
                  className="h-11 hover:bg-muted/40"
                  onDoubleClick={() => {
                    setDetailItem(item);
                    setOpenDetail(true);
                  }}
                >
                  <td className="px-3 align-middle">
                    <Checkbox checked={!!selected[item.id]} onCheckedChange={(c) => setSelected((s) => ({ ...s, [item.id]: Boolean(c) }))} />
                  </td>

                  <td className="whitespace-nowrap overflow-hidden text-ellipsis px-3 align-middle" title={item.fornecedor}>
                    {item.fornecedor}
                  </td>
                  <td
                    className="whitespace-nowrap px-3 align-middle text-right font-medium tabular-nums"
                    title={BRL.format(item.valorLiquido)}
                  >
                    {BRL.format(item.valorLiquido)}
                  </td>
                  <td className="whitespace-nowrap overflow-hidden text-ellipsis px-3 align-middle" title={item.tipoDoc || ""}>
                    {item.tipoDoc}
                  </td>

                  {/* meio pgto */}
                  <td className="px-3 align-middle whitespace-nowrap overflow-hidden text-ellipsis">
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
                  </td>

                  <td className="whitespace-nowrap overflow-hidden text-ellipsis px-3 align-middle" title={item.numeroDoc || ""}>
                    {item.numeroDoc}
                  </td>
                  <td className="whitespace-nowrap overflow-hidden text-ellipsis px-3 align-middle" title={item.categoria || ""}>
                    {item.categoria}
                  </td>
                  <td
                    className="whitespace-nowrap overflow-hidden text-ellipsis px-3 align-middle"
                    title={fmtCompetencia(item.competencia)}
                  >
                    {fmtCompetencia(item.competencia)}
                  </td>
                  <td className="whitespace-nowrap overflow-hidden text-ellipsis px-3 align-middle" title={fmtDate(item.vencimento)}>
                    {fmtDate(item.vencimento)}
                  </td>
                  <td className="whitespace-nowrap overflow-hidden text-ellipsis px-3 align-middle" title={item.parcela || ""}>
                    {item.parcela}
                  </td>
                  <td className="whitespace-nowrap overflow-hidden text-ellipsis px-3 align-middle" title={item.descricao || ""}>
                    {item.descricao}
                  </td>
                  <td className="whitespace-nowrap overflow-hidden text-ellipsis px-3 align-middle" title={item.observacao || ""}>
                    {item.observacao}
                  </td>
                  <td className="whitespace-nowrap overflow-hidden text-ellipsis px-3 align-middle" title={item.banco || ""}>
                    {item.banco}
                  </td>
                  <td className="px-3 align-middle">
                    <span
                      className={cn(
                        "inline-flex h-6 items-center rounded-full px-2 text-[11px]",
                        statusColor[item.status]
                      )}
                    >
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
                  </td>

                  {/* anexos */}
                  <td className="px-3 align-middle">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Ver anexos"
                      onClick={() => {
                        setAnexosItem(item);
                        setOpenAnexos(true);
                        setPreviewUrl(null);
                      }}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </td>

                  {/* ações */}
                  <td className="px-3 align-middle">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Mais ações">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
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
                        <DropdownMenuItem
                          onClick={() => {
                            setAnexosItem(item);
                            setOpenAnexos(true);
                            setPreviewUrl(null);
                          }}
                        >
                          Ver anexos
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalhes */}
      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes da conta</DialogTitle>
            <DialogDescription>Informações completas e histórico.</DialogDescription>
          </DialogHeader>

          {detailItem && (
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div className="space-y-2">
                <div>
                  <Label className="text-muted-foreground">Fornecedor</Label>
                  <div className="font-medium">{detailItem.fornecedor}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Valor líquido</Label>
                  <div className="font-medium">{BRL.format(detailItem.valorLiquido)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo/Nº doc</Label>
                  <div>
                    {detailItem.tipoDoc} {detailItem.numeroDoc}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Categoria</Label>
                  <div>{detailItem.categoria}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Competência</Label>
                  <div>{fmtCompetencia(detailItem.competencia)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Vencimento</Label>
                  <div>{fmtDate(detailItem.vencimento)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Parcela</Label>
                  <div>{detailItem.parcela || "-"}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <Label className="text-muted-foreground">Descrição</Label>
                  <div className="whitespace-pre-wrap">{detailItem.descricao}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Observação</Label>
                  <div className="whitespace-pre-wrap">{detailItem.observacao}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Meio de pagamento</Label>
                  <div>
                    <Badge className={cn("mt-1", classMeioPagamento(detailItem.meioPagamento))}>
                      {detailItem.meioPagamento}
                    </Badge>
                    <div className="mt-1 text-xs">
                      {detailItem.meioPagamento === "PIX" && (
                        <CopyHover label="Chave PIX" value={detailItem.pixChave} />
                      )}
                      {(detailItem.meioPagamento === "BOLETO" || detailItem.meioPagamento === "TRIBUTO") && (
                        <CopyHover label="Código de barras" value={detailItem.codigoBarras} />
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Banco</Label>
                  <div>{detailItem.banco}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div>
                    <Badge className="mt-1">{detailItem.status.toLowerCase()}</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Anexos com preview */}
      <Dialog
        open={openAnexos}
        onOpenChange={(v) => {
          setOpenAnexos(v);
          if (!v) setPreviewUrl(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Anexos</DialogTitle>
            <DialogDescription>Visualize PDFs/imagens sem sair da tela.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            {!anexosItem?.anexos?.length && (
              <div className="text-muted-foreground">Nenhum anexo para este lançamento.</div>
            )}
            {anexosItem?.anexos?.map((ax) => (
              <div key={ax.id} className="flex items-center justify-between rounded-md border p-2">
                <div className="flex flex-col">
                  <span className="font-medium">{ax.nome}</span>
                  <span className="text-xs text-muted-foreground">{ax.tipo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPreviewUrl(ax.url || null)} disabled={!ax.url}>
                    Visualizar
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => (ax.url ? window.open(ax.url, "_blank") : null)}
                    disabled={!ax.url}
                  >
                    Baixar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {previewUrl && (
            <div className="mt-3 rounded-md border">
              {/\.pdf($|\?)/i.test(previewUrl) ? (
                <iframe src={previewUrl} className="h-[60vh] w-full rounded-md" title="Preview PDF" />
              ) : /\.(png|jpe?g|gif|webp|bmp|svg)($|\?)/i.test(previewUrl) ? (
                <img src={previewUrl} alt="Preview" className="max-h-[60vh] w-full rounded-md object-contain" />
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  Formato não visualizável.{" "}
                  <a className="underline" href={previewUrl} target="_blank">
                    Abrir em nova aba
                  </a>
                  .
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
