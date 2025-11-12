"use client";

import * as React from "react";
import { useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash,
  Info,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  BadgePercent,
  Banknote,
  Undo2,
} from "lucide-react";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  FormLabel,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import { cn } from "@/lib/utils";

type Status = "PREVISAO" | "PENDENTE" | "AGENDADO" | "EFETIVADO" | "CONCILIADO";
type MeioPagamento = "PIX" | "BOLETO" | "TRIBUTO" | "TED" | "OUTROS";

type Rateio = {
  id?: string;
  centroCusto: string;
  percentual?: number | null;
  valor?: number | null;
  observacao?: string | null;
};

type Retencao = {
  id?: string;
  tipo: "IRRF" | "INSS" | "ISS" | "PIS" | "COFINS" | "CSLL" | "IOF" | "OUTRO";
  base?: number | null;
  aliquota?: number | null;
  valor?: number | null;
  observacao?: string | null;
};

type Pagamento = {
  id: string;
  parcela: string;
  valor: number;
  valorOriginal?: number;
  vencimento: string;
  pago?: boolean;
  dataPagamento?: string | null;
  banco?: string | null;
  remanescenteDe?: string | null;
};

type Historico = {
  id: string;
  usuario: string;
  acao:
    | "CRIACAO"
    | "EDICAO"
    | "QUITACAO"
    | "ESTORNO"
    | "AGENDAMENTO"
    | "REABERTURA"
    | "RATEIO"
    | "RETENCAO";
  campo?: string | null;
  de?: string | null;
  para?: string | null;
  dataHora: string;
};

const schema = z
  .object({
    id: z.string().min(1),
    empresaCodigoERP: z.number().int().positive(),
    fornecedor: z.string().min(1, "Informe o fornecedor"),
    status: z.enum(["PREVISAO", "PENDENTE", "AGENDADO", "EFETIVADO", "CONCILIADO"]),
    tipoDoc: z.string().nullable().default(null),
    numeroDoc: z.string().nullable().default(null),
    categoria: z.string().nullable().default(null),
    competencia: z.string().regex(/^\d{4}-\d{2}$/, "Competência deve ser YYYY-MM"),
    vencimento: z.string().min(1, "Vencimento é obrigatório"),
    pagamento: z.string().nullable().default(null),
    parcela: z.string().nullable().default(null),
    descricao: z.string().nullable().default(null),
    observacao: z.string().nullable().default(null),
    meioPagamento: z.enum(["PIX", "BOLETO", "TRIBUTO", "TED", "OUTROS"]),
    pixChave: z.string().nullable().default(null),
    codigoBarras: z.string().nullable().default(null),
    banco: z.string().nullable().default(null),
    valorBruto: z.number().nonnegative().default(0),
    valorLiquido: z.number().nonnegative(),
    desconto: z.number().nonnegative().default(0),

    categorias: z
      .array(
        z.object({
          id: z.string().optional(),
          nome: z.string().min(1, "Nome da categoria é obrigatório"),
          percentual: z.number().nullable().optional(),
          valor: z.number().nullable().optional(),
          observacao: z.string().nullable().optional(),
        })
      )
      .default([]),

    rateios: z
      .array(
        z.object({
          id: z.string().optional(),
          centroCusto: z.string().min(1, "Centro de custo é obrigatório"),
          percentual: z.number().nullable().optional(),
          valor: z.number().nullable().optional(),
          observacao: z.string().nullable().optional(),
        })
      )
      .default([]),

    retencoes: z
      .array(
        z.object({
          id: z.string().optional(),
          tipo: z.enum(["IRRF", "INSS", "ISS", "PIS", "COFINS", "CSLL", "IOF", "OUTRO"]),
          base: z.number().nullable().optional(),
          aliquota: z.number().nullable().optional(),
          valor: z.number().nullable().optional(),
          observacao: z.string().nullable().optional(),
        })
      )
      .default([]),
  })
  .refine((d) => d.valorLiquido >= 0, {
    message: "Valor líquido não pode ser negativo",
    path: ["valorLiquido"],
  });

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const toISODate = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);

const EPS = 0.01;
const EPS_PCT = 0.001;
const round2 = (n: number) => Number(n.toFixed(2));
const s = (v: string | null | undefined) => v ?? "";
const uid = () => Math.random().toString(36).slice(2, 10);

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    PREVISAO: "bg-amber-100 text-amber-700 border border-amber-200",
    PENDENTE: "bg-red-100 text-red-700 border-red-200",
    AGENDADO: "bg-blue-100 text-blue-700 border-blue-200",
    EFETIVADO: "bg-emerald-100 text-emerald-700 border-emerald-200",
    CONCILIADO: "bg-purple-100 text-purple-700 border-purple-200",
  };
  return <Badge className={cn("capitalize", map[status])}>{status.toLowerCase()}</Badge>;
}

async function loadContaById(id: string) {
  await new Promise((r) => setTimeout(r, 80));
  return {
    id,
    empresaCodigoERP: 1581,
    fornecedor: "Energisa",
    status: "PENDENTE" as Status,
    tipoDoc: "BOL",
    numeroDoc: "98765",
    categoria: "Despesas > Energia",
    competencia: "2025-11",
    vencimento: toISODate(new Date()),
    pagamento: null,
    parcela: null,
    descricao: "Conta de energia Loja 01",
    observacao: "Verificar consumo acima da média",
    meioPagamento: "BOLETO" as MeioPagamento,
    pixChave: null,
    codigoBarras: "84670000001880551240200240600987650000123456",
    banco: "Itaú",
    valorBruto: 1500.0,
    desconto: 0,
    valorLiquido: 1500.0,
    categorias: [],
    rateios: [
      { id: "r1", centroCusto: "Loja 01", percentual: 60, valor: null },
      { id: "r2", centroCusto: "Matriz", percentual: 40, valor: null },
    ],
    retencoes: [{ id: "t1", tipo: "ISS", base: 1500, aliquota: 5, valor: 75, observacao: "Retido na fonte" }],
  };
}

async function loadPagamentos(id: string): Promise<Pagamento[]> {
  await new Promise((r) => setTimeout(r, 50));
  return [
    {
      id: uid(),
      parcela: "1/2",
      valor: 700.0,
      valorOriginal: 700.0,
      vencimento: toISODate(new Date()),
      pago: false,
      dataPagamento: null,
      banco: null,
    },
    {
      id: uid(),
      parcela: "2/2",
      valor: 800.0,
      valorOriginal: 800.0,
      vencimento: toISODate(new Date()),
      pago: false,
      dataPagamento: null,
      banco: null,
    },
  ];
}

async function loadHistorico(id: string): Promise<Historico[]> {
  await new Promise((r) => setTimeout(r, 30));
  const now = new Date();
  return [{ id: uid(), usuario: "lenon", acao: "CRIACAO", campo: null, de: null, para: null, dataHora: now.toISOString() }];
}

export default function EditContaPagarPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      id: id || "",
      empresaCodigoERP: 0,
      fornecedor: "",
      status: "PENDENTE",
      tipoDoc: null,
      numeroDoc: null,
      categoria: null,
      competencia: "2025-11",
      vencimento: toISODate(new Date()),
      pagamento: null,
      parcela: null,
      descricao: null,
      observacao: null,
      meioPagamento: "BOLETO",
      pixChave: null,
      codigoBarras: null,
      banco: null,
      valorBruto: 0,
      desconto: 0,
      valorLiquido: 0,
      categorias: [],
      rateios: [],
      retencoes: [],
    },
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { isSubmitting, isValid, errors },
  } = form;

  const wValorBruto = watch("valorBruto");
  const wDesconto = watch("desconto");
  const wRetencoes = watch("retencoes");
  const wCategorias = watch("categorias");
  const wRateios = watch("rateios");

  const {
    fields: categoriaFields,
    append: categoriaAppend,
    remove: categoriaRemove,
    update: categoriaUpdate,
  } = useFieldArray({ control, name: "categorias", keyName: "k" });

  const {
    fields: rateioFields,
    append: rateioAppend,
    remove: rateioRemove,
    update: rateioUpdate,
  } = useFieldArray({ control, name: "rateios", keyName: "k" });

  const {
    fields: retencaoFields,
    append: retencaoAppend,
    remove: retencaoRemove,
    update: retencaoUpdate,
  } = useFieldArray({ control, name: "retencoes", keyName: "k" });

  const [hist, setHist] = React.useState<Historico[]>([]);
  const [pags, setPags] = React.useState<Pagamento[]>([]);
  const [tab, setTab] = React.useState<string>("info");

  const [openQuitar, setOpenQuitar] = React.useState(false);
  const [qIndex, setQIndex] = React.useState<number | null>(null);
  const [qData, setQData] = React.useState<string>(toISODate(new Date()));
  const [qValor, setQValor] = React.useState<number>(0);
  const [qDesc, setQDesc] = React.useState<number>(0);
  const [qJuros, setQJuros] = React.useState<number>(0);
  const [qBanco, setQBanco] = React.useState<string>("");

  function addHist(acao: Historico["acao"], campo: string | null, de: string | null, para: string | null) {
    setHist((h) => [
      ...h,
      {
        id: uid(),
        usuario: "lenon",
        acao,
        campo,
        de,
        para,
        dataHora: new Date().toISOString(),
      },
    ]);
  }

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [c, h, p] = await Promise.all([loadContaById(id), loadHistorico(id), loadPagamentos(id)]);
      ([
        ["id", c.id],
        ["empresaCodigoERP", c.empresaCodigoERP],
        ["fornecedor", c.fornecedor],
        ["status", c.status],
        ["tipoDoc", c.tipoDoc ?? null],
        ["numeroDoc", c.numeroDoc ?? null],
        ["categoria", c.categoria ?? null],
        ["competencia", c.competencia],
        ["vencimento", c.vencimento],
        ["pagamento", c.pagamento ?? null],
        ["parcela", c.parcela ?? null],
        ["descricao", c.descricao ?? null],
        ["observacao", c.observacao ?? null],
        ["meioPagamento", c.meioPagamento],
        ["pixChave", c.pixChave ?? null],
        ["codigoBarras", c.codigoBarras ?? null],
        ["banco", c.banco ?? null],
        ["valorBruto", c.valorBruto ?? c.valorLiquido],
        ["desconto", c.desconto ?? 0],
        ["categorias", c.categorias ?? []],
        ["rateios", c.rateios ?? []],
        ["retencoes", c.retencoes ?? []],
      ] as const).forEach(([k, v]) => setValue(k as any, v as any));

      setHist(h);
      setPags(p);
      recalcLiquido();
      renumerarParcelas(p);
    })();
  }, [id, setValue]);

  const totalRetencoes = useMemo(
    () => (getValues("retencoes") || []).reduce((s, r: any) => s + Number(r?.valor || 0), 0),
    [wRetencoes, wValorBruto, wDesconto, getValues]
  );
  const liquidoEsperado = useMemo(
    () =>
      round2(
        (getValues("valorBruto") || 0) -
          (getValues("desconto") || 0) -
          (getValues("retencoes") || []).reduce((s: number, r: any) => s + Number(r?.valor || 0), 0)
      ),
    [wRetencoes, wValorBruto, wDesconto, getValues]
  );

  function recalcLiquido() {
    const novo = round2(
      (getValues("valorBruto") || 0) -
        (getValues("desconto") || 0) -
        (getValues("retencoes") || []).reduce((s: number, r: any) => s + Number(r?.valor || 0), 0)
    );
    setValue("valorLiquido", novo, { shouldValidate: true, shouldDirty: true });
  }

  useEffect(() => {
    recalcLiquido();
  }, [wValorBruto, wDesconto, wRetencoes]);

  function autoFillLastValueByTotal(
    items: { valor?: number | null }[],
    total: number,
    setAt: (idx: number, patch: any) => void
  ) {
    const nums = items.map((v) => Number(v.valor ?? NaN));
    const empties = nums
      .map((n, i) => ({ i, empty: Number.isNaN(n) }))
      .filter((x) => x.empty)
      .map((x) => x.i);
    if (empties.length === 1) {
      const filledSum = nums.filter((n) => !Number.isNaN(n)).reduce((s, n) => s + n, 0);
      const rest = round2(total - filledSum);
      setAt(empties[0], (prev: any) => ({ ...prev, valor: rest < 0 ? 0 : rest }));
    }
  }
  function autoFillLastPercentBy100(
    items: { percentual?: number | null }[],
    setAt: (idx: number, patch: any) => void
  ) {
    const nums = items.map((v) => Number(v.percentual ?? NaN));
    const empties = nums
      .map((n, i) => ({ i, empty: Number.isNaN(n) }))
      .filter((x) => x.empty)
      .map((x) => x.i);
    if (empties.length === 1) {
      const filledSum = nums.filter((n) => !Number.isNaN(n)).reduce((s, n) => s + n, 0);
      const rest = round2(100 - filledSum);
      setAt(empties[0], (prev: any) => ({ ...prev, percentual: rest < 0 ? 0 : rest }));
    }
  }

  const totalCategoriasValor = useMemo(
    () => (wCategorias || []).reduce((s, c) => s + Number(c.valor || 0), 0),
    [wCategorias]
  );
  const totalCategoriasPercent = useMemo(
    () => (wCategorias || []).reduce((s, c) => s + Number(c.percentual || 0), 0),
    [wCategorias]
  );
  const categoriasOkByValor = Math.abs((getValues("valorBruto") || 0) - (totalCategoriasValor || 0)) < EPS;
  const categoriasOkByPercent = Math.abs(100 - (totalCategoriasPercent || 0)) < EPS_PCT;
  const categoriasOk = (wCategorias?.length ?? 0) > 0 && (categoriasOkByValor || categoriasOkByPercent);
  const faltanteCategoriasValor = round2((getValues("valorBruto") || 0) - (totalCategoriasValor || 0));
  const faltanteCategoriasPercent = round2(100 - (totalCategoriasPercent || 0));

  const totalRateioPercent = useMemo(
    () => (wRateios || []).reduce((s, r) => s + Number(r.percentual || 0), 0),
    [wRateios]
  );
  const totalRateioValor = useMemo(
    () => (wRateios || []).reduce((s, r) => s + Number(r.valor || 0), 0),
    [wRateios]
  );
  const rateioOk =
    (totalRateioPercent > 0 && Math.abs(totalRateioPercent - 100) < EPS_PCT) ||
    (getValues("valorLiquido") > 0 && Math.abs(totalRateioValor - getValues("valorLiquido")) < EPS);
  const faltanteRateioValor = round2((getValues("valorLiquido") || 0) - (totalRateioValor || 0));
  const faltanteRateioPercent = round2(100 - (totalRateioPercent || 0));

  const canSave =
    isValid &&
    categoriasOk &&
    rateioOk &&
    Math.abs((getValues("valorLiquido") || 0) - liquidoEsperado) < EPS;

  const tabsDisabled = {
    categorias: false,
    rateios: !categoriasOk,
    retencoes: !categoriasOk,
    pagamentos: !categoriasOk,
    historico: !categoriasOk,
  };
  function trySwitchTab(value: string) {
    if (value !== "categorias" && !categoriasOk) {
      setTab("categorias");
      return;
    }
    setTab(value);
  }

  async function onSubmit(values: z.infer<typeof schema>) {
    if (!categoriasOk) {
      alert("Categorias não fecham com o valor bruto (ou 100%). Ajuste antes de salvar.");
      setTab("categorias");
      return;
    }
    if (!rateioOk) {
      alert("Rateios não fecham 100% ou o valor líquido. Ajuste antes de salvar.");
      setTab("rateios");
      return;
    }
    if (Math.abs(values.valorLiquido - liquidoEsperado) >= EPS) {
      alert("Valor líquido é calculado automaticamente (Bruto - Desconto - Retenções).");
      setTab("retencoes");
      return;
    }
    console.log("Salvar:", values, pags, hist);
    router.push("/contas-pagar");
  }

  function renumerarParcelas(list: Pagamento[]) {
    const total = list.length;
    const novo = list.map((p, i) => ({ ...p, parcela: `${i + 1}/${total}` }));
    setPags(novo);
  }

  function openQuitarFor(index: number) {
    const p = pags[index];
    setQIndex(index);
    setQData(toISODate(new Date()));
    setQBanco(p.banco || getValues("banco") || "");
    setQDesc(0);
    setQJuros(0);
    setQValor(round2(p.pago ? 0 : p.valor));
    setOpenQuitar(true);
  }

  const quitandoAgora = round2(qValor - qDesc + qJuros);
  const parcelaSaldo = qIndex == null ? 0 : (pags[qIndex].pago ? 0 : round2(pags[qIndex].valor));
  const pendenteAposQuitar = round2(parcelaSaldo - quitandoAgora);
  const quitarOk = qIndex != null && quitandoAgora > 0 && quitandoAgora <= parcelaSaldo + EPS;

  function handleQuitarConfirm() {
    if (!quitarOk || qIndex == null) return;

    const idx = qIndex;
    const atual = pags[idx];
    const pagoTotal = Math.abs(quitandoAgora - parcelaSaldo) < EPS;

    const updated = [...pags];
    const valorOriginal = atual.valorOriginal ?? atual.valor;

    updated[idx] = {
      ...atual,
      valor: round2(quitandoAgora),
      valorOriginal,
      pago: true,
      dataPagamento: qData,
      banco: qBanco || atual.banco || null,
      remanescenteDe: atual.remanescenteDe ?? null,
    };

    addHist(
      "QUITACAO",
      "parcela",
      JSON.stringify({ id: atual.id, parcela: atual.parcela, valor: atual.valor }),
      JSON.stringify({
        id: updated[idx].id,
        parcela: updated[idx].parcela,
        valorPago: updated[idx].valor,
        dataPagamento: qData,
        banco: qBanco || null,
      })
    );

    if (!pagoTotal) {
      const rem = round2(parcelaSaldo - quitandoAgora);
      const nova: Pagamento = {
        id: uid(),
        parcela: "?",
        valor: rem,
        valorOriginal: rem,
        vencimento: atual.vencimento,
        pago: false,
        dataPagamento: null,
        banco: null,
        remanescenteDe: atual.id,
      };
      updated.splice(idx + 1, 0, nova);
    }

    const totalDepois = updated.length;
    const re = updated.map((p, i) => ({ ...p, parcela: `${i + 1}/${totalDepois}` }));
    setPags(re);

    const allPaid = re.every((x) => x.pago);
    if (allPaid) {
      setValue("status", "EFETIVADO");
      setValue("pagamento", qData);
    }

    setOpenQuitar(false);
  }

  function estornarParcela(index: number) {
    const p = pags[index];
    const snapshotAntes = JSON.stringify({ id: p.id, parcela: p.parcela, valor: p.valor, pago: p.pago });

    let updated = [...pags];

    const remIdx = updated.findIndex((x) => x.remanescenteDe === p.id);
    if (remIdx >= 0) {
      updated.splice(remIdx, 1);
    }

    updated[index] = {
      ...p,
      valor: p.valorOriginal ?? p.valor,
      pago: false,
      dataPagamento: null,
      banco: null,
    };

    const totalDepois = updated.length;
    updated = updated.map((x, i) => ({ ...x, parcela: `${i + 1}/${totalDepois}` }));
    setPags(updated);

    const allPaid = updated.every((x) => x.pago);
    if (!allPaid && getValues("status") === "EFETIVADO") {
      setValue("status", "PENDENTE");
      setValue("pagamento", null);
    }

    addHist("ESTORNO", "parcela", snapshotAntes, JSON.stringify(updated[index]));
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <div className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex w-full max-w-[1200px] items-center gap-2 px-3 py-2">
          <Button type="button" variant="ghost" className="gap-2" onClick={() => router.push("/contas-pagar")}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Separator orientation="vertical" className="mx-1 hidden sm:block" />
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Desfazer alterações
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/contas-pagar")}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="gap-2"
              disabled={isSubmitting || !canSave}
              onClick={handleSubmit(onSubmit)}
              title={
                !categoriasOk
                  ? "Aba Categorias não fecha com o valor bruto/100%"
                  : !rateioOk
                  ? "Rateios não fecham 100% ou o valor líquido"
                  : Math.abs((getValues("valorLiquido") || 0) - liquidoEsperado) >= EPS
                  ? "Líquido é calculado automaticamente"
                  : ""
              }
            >
              <Save className="h-4 w-4" />
              Salvar
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1200px] flex-1 p-3">
        <Form {...form}>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                  <Building2 className="h-4 w-4" />
                  Empresa <span className="font-semibold">#{watch("empresaCodigoERP")}</span>
                  <Separator orientation="vertical" className="mx-2 hidden sm:block" />
                  <StatusBadge status={watch("status")} />
                  <Separator orientation="vertical" className="mx-2 hidden sm:block" />
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Venc. <b className="ml-1 text-foreground">{fmtDate(watch("vencimento"))}</b>
                  </span>
                  <Separator orientation="vertical" className="mx-2 hidden sm:block" />
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Banknote className="h-4 w-4" />
                    Líquido <b className="ml-1 text-foreground">{BRL.format(watch("valorLiquido") || 0)}</b>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                <FormField
                  control={control}
                  name="fornecedor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fornecedor</FormLabel>
                      <FormControl>
                        <Input placeholder="Razão social / Nome" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select value={field.value} onValueChange={(v: Status) => field.onChange(v)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PREVISAO">Previsão</SelectItem>
                            <SelectItem value="PENDENTE">Pendente</SelectItem>
                            <SelectItem value="AGENDADO">Agendado</SelectItem>
                            <SelectItem value="EFETIVADO">Efetivado</SelectItem>
                            <SelectItem value="CONCILIADO">Conciliado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="banco"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banco</FormLabel>
                        <Input placeholder="Ex: Itaú / Sicoob" value={s(field.value)} onChange={field.onChange} onBlur={field.onBlur} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Tabs value={tab} onValueChange={trySwitchTab} className="w-full">
              <TabsList className="w-full flex flex-wrap justify-start">
                <TabsTrigger value="info">Informações da despesa</TabsTrigger>
                <TabsTrigger value="categorias">Categorias</TabsTrigger>
                <TabsTrigger value="rateios" disabled={tabsDisabled.rateios}>Rateios</TabsTrigger>
                <TabsTrigger value="retencoes" disabled={tabsDisabled.retencoes}>Retenções</TabsTrigger>
                <TabsTrigger value="pagamentos" disabled={tabsDisabled.pagamentos}>Informações de pagamentos</TabsTrigger>
                <TabsTrigger value="historico" disabled={tabsDisabled.historico}>Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-3">
                <Card className="shadow-sm">
                  <CardContent className="grid gap-3 pt-4 md:grid-cols-2">
                    <div className="grid gap-3">
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={control}
                          name="tipoDoc"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo doc</FormLabel>
                              <Input placeholder="BOL, NF, DUP, REC..." value={s(field.value)} onChange={field.onChange} onBlur={field.onBlur} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name="numeroDoc"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nº doc</FormLabel>
                              <Input placeholder="Número" value={s(field.value)} onChange={field.onChange} onBlur={field.onBlur} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={control}
                        name="categoria"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoria (principal)</FormLabel>
                            <Input placeholder="Ex: Despesas > Energia" value={s(field.value)} onChange={field.onChange} onBlur={field.onBlur} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-3 gap-2">
                        <FormField
                          control={control}
                          name="competencia"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Competência (YYYY-MM)</FormLabel>
                              <Input placeholder="2025-11" {...field} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name="vencimento"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vencimento</FormLabel>
                              <Input type="date" {...field} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name="pagamento"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pagamento (data)</FormLabel>
                              <Input type="date" value={s(field.value)} onChange={(e) => field.onChange(e.target.value || null)} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="grid grid-cols-3 gap-2">
                        <FormField
                          control={control}
                          name="valorBruto"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor bruto (R$)</FormLabel>
                              <Input
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value || 0))}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name="desconto"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Desconto (R$)</FormLabel>
                              <Input
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value || 0))}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormItem>
                          <FormLabel>Valor líquido (R$)</FormLabel>
                          <Input type="number" step="0.01" inputMode="decimal" value={liquidoEsperado} readOnly disabled />
                          <div className="text-xs text-muted-foreground mt-1">Calculado: Bruto − Desconto − Retenções</div>
                        </FormItem>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <FormField
                          control={control}
                          name="meioPagamento"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Meio de pagamento</FormLabel>
                              <Select value={field.value} onValueChange={(v: MeioPagamento) => field.onChange(v)}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="PIX">PIX</SelectItem>
                                  <SelectItem value="BOLETO">Boleto</SelectItem>
                                  <SelectItem value="TRIBUTO">Tributo</SelectItem>
                                  <SelectItem value="TED">TED</SelectItem>
                                  <SelectItem value="OUTROS">Outros</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name="pixChave"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Chave PIX</FormLabel>
                              <Input value={s(field.value)} onChange={field.onChange} onBlur={field.onBlur} placeholder="(se aplicável)" />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name="codigoBarras"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Código de barras</FormLabel>
                              <Input value={s(field.value)} onChange={field.onChange} onBlur={field.onBlur} placeholder="(se aplicável)" />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={control}
                        name="parcela"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parcela</FormLabel>
                            <Input placeholder="Ex: 1/3" value={s(field.value)} onChange={field.onChange} onBlur={field.onBlur} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="md:col-span-2 grid gap-3">
                      <FormField
                        control={control}
                        name="descricao"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <Textarea rows={3} placeholder="Descreva a despesa…" value={s(field.value)} onChange={field.onChange} onBlur={field.onBlur} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name="observacao"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observação</FormLabel>
                            <Textarea rows={3} placeholder="Observações internas…" value={s(field.value)} onChange={field.onChange} onBlur={field.onBlur} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="categorias" className="mt-3">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">Categorias (decomposição do Valor Bruto)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <div className="flex items-center gap-2 rounded-md border px-2 py-1">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        Distribua por percentual (100%) ou por valor.
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1 text-sm",
                          categoriasOk ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                        )}
                      >
                        {categoriasOk ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" /> Categorias válidas
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4" /> Falta/sobra: {BRL.format(faltanteCategoriasValor)} | % faltante: {faltanteCategoriasPercent.toFixed(2)}%
                          </>
                        )}
                      </div>
                    </div>

                    <div className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Categoria</TableHead>
                            <TableHead className="w-[120px]">Percentual (%)</TableHead>
                            <TableHead className="w-[140px]">Valor (R$)</TableHead>
                            <TableHead>Observação</TableHead>
                            <TableHead className="w-[40px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categoriaFields.map((f, idx) => (
                            <TableRow key={f.k}>
                              <TableCell className="min-w-[220px]">
                                <Controller
                                  control={control}
                                  name={`categorias.${idx}.nome`}
                                  render={({ field }) => <Input placeholder="Ex: Energia / Água / Internet" {...field} />}
                                />
                                <FormMessage>{errors?.categorias?.[idx]?.nome?.message as any}</FormMessage>
                              </TableCell>
                              <TableCell>
                                <Controller
                                  control={control}
                                  name={`categorias.${idx}.percentual`}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      inputMode="decimal"
                                      value={field.value ?? ""}
                                      onChange={(e) => {
                                        const v = e.target.value === "" ? null : Number(e.target.value);
                                        field.onChange(v);
                                        const total = getValues("valorBruto") || 0;
                                        if (total > 0 && v != null) {
                                          const calc = round2((total * v) / 100);
                                          const prev = getValues(`categorias.${idx}`);
                                          categoriaUpdate(idx, { ...prev, percentual: v, valor: calc });
                                        }
                                        const items = getValues("categorias");
                                        autoFillLastPercentBy100(items, (i, patch) => {
                                          const prev = getValues(`categorias.${i}`);
                                          categoriaUpdate(i, typeof patch === "function" ? patch(prev) : patch);
                                        });
                                      }}
                                      placeholder="0"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Controller
                                  control={control}
                                  name={`categorias.${idx}.valor`}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      inputMode="decimal"
                                      value={field.value ?? ""}
                                      onChange={(e) => {
                                        const v = e.target.value === "" ? null : Number(e.target.value);
                                        field.onChange(v);
                                        const total = getValues("valorBruto") || 0;
                                        if (total > 0 && v != null) {
                                          const pct = round2((v * 100) / total);
                                          const prev = getValues(`categorias.${idx}`);
                                          categoriaUpdate(idx, { ...prev, valor: v, percentual: pct });
                                        }
                                        const items = getValues("categorias");
                                        autoFillLastValueByTotal(items, total, (i, patch) => {
                                          const prev = getValues(`categorias.${i}`);
                                          categoriaUpdate(i, typeof patch === "function" ? patch(prev) : patch);
                                        });
                                      }}
                                      placeholder="0,00"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Controller
                                  control={control}
                                  name={`categorias.${idx}.observacao`}
                                  render={({ field }) => (
                                    <Input
                                      value={field.value ?? ""}
                                      onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                                      placeholder="Observações (opcional)"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => categoriaRemove(idx)}>
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {categoriaFields.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-muted-foreground">
                                Nenhuma categoria adicionada.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={() => categoriaAppend({ nome: "Outra", percentual: null, valor: null, observacao: null })}
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar categoria
                      </Button>

                      <div className="ml-auto text-sm">
                        <span className="mr-4">Soma %: <b>{(totalCategoriasPercent || 0).toFixed(2)}%</b></span>
                        <span>Soma R$: <b>{BRL.format(totalCategoriasValor || 0)}</b> / Bruto: <b>{BRL.format(getValues("valorBruto") || 0)}</b></span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rateios" className="mt-3">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BadgePercent className="h-4 w-4" />
                      Rateios por centro de custo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <div className="flex items-center gap-2 rounded-md border px-2 py-1">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        Rateie por percentual (100%) ou por valor.
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1 text-sm",
                          rateioOk ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                        )}
                      >
                        {rateioOk ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" /> Rateio válido
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4" /> Falta/sobra: {BRL.format(faltanteRateioValor)} | % faltante: {faltanteRateioPercent.toFixed(2)}%
                          </>
                        )}
                      </div>
                    </div>

                    <div className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Centro de Custo</TableHead>
                            <TableHead className="w-[120px]">Percentual (%)</TableHead>
                            <TableHead className="w-[140px]">Valor (R$)</TableHead>
                            <TableHead>Observação</TableHead>
                            <TableHead className="w-[40px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rateioFields.map((f, idx) => (
                            <TableRow key={f.k}>
                              <TableCell>
                                <Controller
                                  control={control}
                                  name={`rateios.${idx}.centroCusto`}
                                  render={({ field }) => <Input placeholder="Ex: Loja 01 / Matriz" {...field} />}
                                />
                                <FormMessage>{errors?.rateios?.[idx]?.centroCusto?.message as any}</FormMessage>
                              </TableCell>
                              <TableCell>
                                <Controller
                                  control={control}
                                  name={`rateios.${idx}.percentual`}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      inputMode="decimal"
                                      value={field.value ?? ""}
                                      onChange={(e) => {
                                        const v = e.target.value === "" ? null : Number(e.target.value);
                                        field.onChange(v);
                                        const total = getValues("valorLiquido") || 0;
                                        if (total > 0 && v != null) {
                                          const calc = round2((total * v) / 100);
                                          const prev = getValues(`rateios.${idx}`);
                                          rateioUpdate(idx, { ...prev, percentual: v, valor: calc });
                                        }
                                        const items = getValues("rateios");
                                        autoFillLastPercentBy100(items, (i, patch) => {
                                          const prev = getValues(`rateios.${i}`);
                                          rateioUpdate(i, typeof patch === "function" ? patch(prev) : patch);
                                        });
                                      }}
                                      placeholder="0"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Controller
                                  control={control}
                                  name={`rateios.${idx}.valor`}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      inputMode="decimal"
                                      value={field.value ?? ""}
                                      onChange={(e) => {
                                        const v = e.target.value === "" ? null : Number(e.target.value);
                                        field.onChange(v);
                                        const total = getValues("valorLiquido") || 0;
                                        if (total > 0 && v != null) {
                                          const pct = round2((v * 100) / total);
                                          const prev = getValues(`rateios.${idx}`);
                                          rateioUpdate(idx, { ...prev, valor: v, percentual: pct });
                                        }
                                        const items = getValues("rateios");
                                        autoFillLastValueByTotal(items, total, (i, patch) => {
                                          const prev = getValues(`rateios.${i}`);
                                          rateioUpdate(i, typeof patch === "function" ? patch(prev) : patch);
                                        });
                                      }}
                                      placeholder="0,00"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Controller
                                  control={control}
                                  name={`rateios.${idx}.observacao`}
                                  render={({ field }) => (
                                    <Input
                                      value={field.value ?? ""}
                                      onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                                      placeholder="Observações do rateio (opcional)"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => rateioRemove(idx)}>
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {rateioFields.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-muted-foreground">
                                Nenhum rateio adicionado.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={() => rateioAppend({ centroCusto: "", percentual: null, valor: null, observacao: null })}
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar rateio
                      </Button>

                      <div className="ml-auto text-sm">
                        <span className="mr-4">Soma %: <b>{(totalRateioPercent || 0).toFixed(2)}%</b></span>
                        <span>Soma R$: <b>{BRL.format(totalRateioValor || 0)}</b> / Líquido: <b>{BRL.format(getValues("valorLiquido") || 0)}</b></span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="retencoes" className="mt-3">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">Retenções</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-4 rounded-md border px-3 py-2 text-sm bg-muted/30">
                      <span><b>Bruto:</b> {BRL.format(getValues("valorBruto") || 0)}</span>
                      <span><b>Desconto:</b> {BRL.format(getValues("desconto") || 0)}</span>
                      <span><b>Retenções:</b> {BRL.format(totalRetencoes || 0)}</span>
                      <span><b>Líquido (auto):</b> {BRL.format(liquidoEsperado)}</span>
                    </div>

                    <div className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="w-[140px]">Base (R$)</TableHead>
                            <TableHead className="w-[120px]">Alíquota (%)</TableHead>
                            <TableHead className="w-[140px]">Valor (R$)</TableHead>
                            <TableHead>Observação</TableHead>
                            <TableHead className="w-[40px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {retencaoFields.map((f, idx) => (
                            <TableRow key={f.k}>
                              <TableCell className="min-w-[140px]">
                                <Controller
                                  control={control}
                                  name={`retencoes.${idx}.tipo`}
                                  render={({ field }) => (
                                    <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Tipo" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="IRRF">IRRF</SelectItem>
                                        <SelectItem value="INSS">INSS</SelectItem>
                                        <SelectItem value="ISS">ISS</SelectItem>
                                        <SelectItem value="PIS">PIS</SelectItem>
                                        <SelectItem value="COFINS">COFINS</SelectItem>
                                        <SelectItem value="CSLL">CSLL</SelectItem>
                                        <SelectItem value="IOF">IOF</SelectItem>
                                        <SelectItem value="OUTRO">OUTRO</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Controller
                                  control={control}
                                  name={`retencoes.${idx}.base`}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      inputMode="decimal"
                                      value={field.value ?? ""}
                                      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                      placeholder="0,00"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Controller
                                  control={control}
                                  name={`retencoes.${idx}.aliquota`}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      inputMode="decimal"
                                      value={field.value ?? ""}
                                      onChange={(e) => {
                                        const v = e.target.value === "" ? null : Number(e.target.value);
                                        field.onChange(v);
                                        const base = form.getValues(`retencoes.${idx}.base`) || 0;
                                        if (v != null && base != null) {
                                          const calc = round2((Number(base) * Number(v)) / 100);
                                          retencaoUpdate(idx, { ...form.getValues(`retencoes.${idx}`), valor: calc });
                                        }
                                      }}
                                      placeholder="0,00"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Controller
                                  control={control}
                                  name={`retencoes.${idx}.valor`}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      inputMode="decimal"
                                      value={field.value ?? ""}
                                      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                      placeholder="0,00"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Controller
                                  control={control}
                                  name={`retencoes.${idx}.observacao`}
                                  render={({ field }) => (
                                    <Input
                                      value={field.value ?? ""}
                                      onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                                      placeholder="Observações (opcional)"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => retencaoRemove(idx)}>
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {retencaoFields.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-muted-foreground">
                                Nenhuma retenção adicionada.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={() => retencaoAppend({ tipo: "ISS", base: null, aliquota: null, valor: null, observacao: null })}
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar retenção
                      </Button>

                      <div className="ml-auto text-sm">
                        Total retenções: <b>{BRL.format(totalRetencoes || 0)}</b>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pagamentos" className="mt-3">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Informações de pagamentos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parcela</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Pago?</TableHead>
                            <TableHead>Data Pagamento</TableHead>
                            <TableHead>Banco</TableHead>
                            <TableHead className="w-[180px]">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pags.map((p, i) => (
                            <TableRow key={p.id}>
                              <TableCell>{p.parcela}</TableCell>
                              <TableCell>{BRL.format(p.valor)}</TableCell>
                              <TableCell>{fmtDate(p.vencimento)}</TableCell>
                              <TableCell>
                                {p.pago ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Sim</Badge>
                                ) : (
                                  <Badge variant="secondary">Não</Badge>
                                )}
                              </TableCell>
                              <TableCell>{fmtDate(p.dataPagamento)}</TableCell>
                              <TableCell>{p.banco || "-"}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {!p.pago ? (
                                    <Button type="button" variant="outline" size="sm" onClick={() => openQuitarFor(i)}>
                                      Quitar
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => estornarParcela(i)}
                                      className="gap-1"
                                    >
                                      <Undo2 className="h-4 w-4" />
                                      Estornar
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {pags.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={7} className="text-muted-foreground">
                                Sem parcelas cadastradas.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="historico" className="mt-3">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Histórico de alterações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Ação</TableHead>
                            <TableHead>Campo</TableHead>
                            <TableHead>De</TableHead>
                            <TableHead>Para</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {hist.map((h) => (
                            <TableRow key={h.id}>
                              <TableCell>
                                {fmtDate(h.dataHora)} {new Date(h.dataHora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </TableCell>
                              <TableCell className="capitalize">{h.usuario}</TableCell>
                              <TableCell className="capitalize">{h.acao.toLowerCase()}</TableCell>
                              <TableCell>{h.campo || "-"}</TableCell>
                              <TableCell className="text-muted-foreground">{h.de ? h.de : "-"}</TableCell>
                              <TableCell>{h.para ? h.para : "-"}</TableCell>
                            </TableRow>
                          ))}
                          {hist.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-muted-foreground">
                                Sem histórico para exibir.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="hidden justify-end gap-2 md:flex">
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                Desfazer alterações
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.push("/contas-pagar")}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={isSubmitting || !canSave}
                title={
                  !categoriasOk
                    ? "Aba Categorias não fecha com o valor bruto/100%"
                    : !rateioOk
                    ? "Rateios não fecham 100% ou o valor líquido"
                    : Math.abs((getValues("valorLiquido") || 0) - liquidoEsperado) >= EPS
                    ? "Líquido é calculado automaticamente"
                    : ""
                }
              >
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <Dialog open={openQuitar} onOpenChange={setOpenQuitar}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Quitar parcela</DialogTitle>
            <DialogDescription>
              Você pode quitar totalmente ou parcialmente. Se parcial, criaremos uma parcela remanescente com o saldo e mesmo vencimento, e renumeraremos todas (ex.: 1/3 → 1/4 e 2/4).
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Data do pagamento</Label>
                <Input type="date" value={qData} onChange={(e) => setQData(e.target.value)} />
              </div>
              <div>
                <Label>Banco</Label>
                <Input placeholder="Ex: Itaú" value={qBanco} onChange={(e) => setQBanco(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Valor</Label>
                <Input type="number" step="0.01" inputMode="decimal" value={qValor} onChange={(e) => setQValor(Number(e.target.value || 0))} />
              </div>
              <div>
                <Label>Desconto</Label>
                <Input type="number" step="0.01" inputMode="decimal" value={qDesc} onChange={(e) => setQDesc(Number(e.target.value || 0))} />
              </div>
              <div>
                <Label>Juros</Label>
                <Input type="number" step="0.01" inputMode="decimal" value={qJuros} onChange={(e) => setQJuros(Number(e.target.value || 0))} />
              </div>
            </div>

            <div
              className={cn(
                "mt-2 flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm",
                quitarOk ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
              )}
            >
              <span><b>Saldo atual da parcela:</b> {BRL.format(parcelaSaldo)}</span>
              <span><b>Quitando agora:</b> {BRL.format(quitandoAgora)}</span>
              <span><b>Saldo remanescente:</b> {BRL.format(pendenteAposQuitar)}</span>
              {quitarOk ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleQuitarConfirm} disabled={!quitarOk}>
              Confirmar quitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
