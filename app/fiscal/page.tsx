"use client";

import * as React from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BadgePercent,
  BookOpen,
  CloudUpload,
  Database,
  FileJson,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";

// ============ shadcn/ui (ajuste se necessário) ============
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

// ============================================================
// =============== Tipos / utilitários compartilhados =========
// ============================================================
type FiscalDirection = "EMITIDA" | "RECEBIDA";
type FiscalKind = "NFE" | "NFSE" | "CTE";
type FiscalStatus = "AUTORIZADA" | "CANCELADA" | "DENEGADA" | "EM_PROCESSAMENTO" | "OUTRO";

type Retencoes = {
  pis?: number | null;
  cofins?: number | null;
  csll?: number | null;
  irrf?: number | null;
  inss?: number | null;
  iss?: number | null;
  icms_st?: number | null;
};

type Invoice = {
  id?: string; // gerado localmente
  direction: FiscalDirection;
  kind: FiscalKind;
  numero?: string | null;
  serie?: string | null;
  chave?: string | null;
  cfop?: string | null;
  natureza_operacao?: string | null;
  data_emissao: string; // ISO
  data_entrada?: string | null;
  cnpj_emitente?: string | null;
  nome_emitente?: string | null;
  cnpj_destinatario?: string | null;
  nome_destinatario?: string | null;
  valor_produtos?: number | null;
  valor_servicos?: number | null;
  valor_frete?: number | null;
  valor_seguro?: number | null;
  valor_outros?: number | null;
  valor_desconto?: number | null;
  valor_total: number;
  status: FiscalStatus;
  retencoes?: Retencoes;
  xml_raw?: string | null;
  empresa_codigo_erp?: string | null;
};

const currency = (n?: number | null) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const onlyDigits = (s?: string | null) => (s || "").replace(/\D+/g, "");

const uid = () =>
  "id_" +
  (Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8)).toUpperCase();

function parseXMLtoDoc(xml: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(xml, "application/xml");
}

function textContent(doc: Document, selector: string): string | null {
  return doc.querySelector(selector)?.textContent ?? null;
}
function toNumberOrNull(v?: string | null): number | null {
  if (!v) return null;
  const num = Number((v || "").replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

// ============================================================
// =================== PARSERS (NFe / NFSe / CTe) =============
// ============================================================
function parseNFeXML(
  xml: string,
  direction: FiscalDirection,
  empresa_codigo_erp?: string | null
): Invoice {
  const doc = parseXMLtoDoc(xml);
  const get = (xs: string[]) => xs.map((s) => textContent(doc, s)).find(Boolean) ?? null;

  const chave =
    get(["infNFe", "NFe > infNFe"])?.toString() ||
    textContent(doc, "protNFe > infProt > chNFe");
  const nNF = get(["ide > nNF", "NFe > infNFe > ide > nNF"]);
  const serie = get(["ide > serie", "NFe > infNFe > ide > serie"]);
  const dhEmi =
    get(["ide > dhEmi", "NFe > infNFe > ide > dhEmi"]) ||
    get(["ide > dEmi", "NFe > infNFe > ide > dEmi"]);

  const emitCNPJ = get(["emit > CNPJ", "NFe > infNFe > emit > CNPJ"]);
  const emitXNome = get(["emit > xNome", "NFe > infNFe > emit > xNome"]);
  const destCNPJ = get(["dest > CNPJ", "NFe > infNFe > dest > CNPJ"]);
  const destXNome = get(["dest > xNome", "NFe > infNFe > dest > xNome"]);

  const vProd = get(["total > ICMSTot > vProd", "NFe > infNFe > total > ICMSTot > vProd"]);
  const vFrete = get(["total > ICMSTot > vFrete", "NFe > infNFe > total > ICMSTot > vFrete"]);
  const vSeg = get(["total > ICMSTot > vSeg", "NFe > infNFe > total > ICMSTot > vSeg"]);
  const vOutro = get(["total > ICMSTot > vOutro", "NFe > infNFe > total > ICMSTot > vOutro"]);
  const vDesc = get(["total > ICMSTot > vDesc", "NFe > infNFe > total > ICMSTot > vDesc"]);
  const vNF = get(["total > ICMSTot > vNF", "NFe > infNFe > total > ICMSTot > vNF"]);
  const natOp = get(["ide > natOp", "NFe > infNFe > ide > natOp"]);
  const cfop = doc.querySelector("NFe infNFe det CFOP")?.textContent ?? null;

  const ret: Retencoes = {
    pis: toNumberOrNull(
      doc.querySelector("imposto > PIS > PISOutr > vPIS, imposto > PIS > PISAliq > vPIS")
        ?.textContent ?? null
    ),
    cofins: toNumberOrNull(
      doc.querySelector(
        "imposto > COFINS > COFINSOutr > vCOFINS, imposto > COFINS > COFINSAliq > vCOFINS"
      )?.textContent ?? null
    ),
    icms_st: toNumberOrNull(doc.querySelector("imposto > ICMS > * > vICMSST")?.textContent ?? null),
  };

  return {
    id: uid(),
    direction,
    kind: "NFE",
    numero: nNF,
    serie,
    chave,
    cfop,
    natureza_operacao: natOp,
    data_emissao: dhEmi ? new Date(dhEmi).toISOString() : new Date().toISOString(),
    cnpj_emitente: onlyDigits(emitCNPJ),
    nome_emitente: emitXNome,
    cnpj_destinatario: onlyDigits(destCNPJ),
    nome_destinatario: destXNome,
    valor_produtos: toNumberOrNull(vProd),
    valor_frete: toNumberOrNull(vFrete),
    valor_seguro: toNumberOrNull(vSeg),
    valor_outros: toNumberOrNull(vOutro),
    valor_desconto: toNumberOrNull(vDesc),
    valor_total: toNumberOrNull(vNF) ?? 0,
    status: "AUTORIZADA",
    retencoes: ret,
    xml_raw: xml,
    empresa_codigo_erp: empresa_codigo_erp ?? null,
  };
}

function parseNFSeXML(
  xml: string,
  direction: FiscalDirection,
  empresa_codigo_erp?: string | null
): Invoice {
  const doc = parseXMLtoDoc(xml);
  const get = (xs: string[]) => xs.map((s) => textContent(doc, s)).find(Boolean) ?? null;
  const numero = get(["Numero", "InfNfse > Numero", "CompNfse > Nfse > InfNfse > Numero"]);
  const serie = get(["Serie", "InfNfse > Serie"]);
  const competencia =
    get(["DataEmissao", "InfNfse > DataEmissao"]) || get(["InfNfse > Competencia"]);

  const cnpjPrest = get([
    "PrestadorServico > IdentificacaoPrestador > Cnpj",
    "InfNfse > PrestadorServico > IdentificacaoPrestador > Cnpj",
  ]);
  const nomePrest = get(["PrestadorServico > RazaoSocial", "InfNfse > PrestadorServico > RazaoSocial"]);
  const cnpjTom = get([
    "TomadorServico > IdentificacaoTomador > CpfCnpj > Cnpj",
    "InfNfse > TomadorServico > IdentificacaoTomador > CpfCnpj > Cnpj",
  ]);
  const nomeTom = get(["TomadorServico > RazaoSocial", "InfNfse > TomadorServico > RazaoSocial"]);

  const vServ = get(["Servico > Valores > ValorServicos", "InfNfse > Servico > Valores > ValorServicos"]);
  const vDedu = get(["Servico > Valores > ValorDeducoes", "InfNfse > Servico > Valores > ValorDeducoes"]);
  const vIss = get(["Servico > Valores > ValorIss", "InfNfse > Servico > Valores > ValorIss"]);
  const vPis = get(["Servico > Valores > ValorPis", "InfNfse > Servico > Valores > ValorPis"]);
  const vCofins = get(["Servico > Valores > ValorCofins", "InfNfse > Servico > Valores > ValorCofins"]);
  const vCsll = get(["Servico > Valores > ValorCsll", "InfNfse > Servico > Valores > ValorCsll"]);
  const vIr = get(["Servico > Valores > ValorIr", "InfNfse > Servico > Valores > ValorIr"]);
  const vInss = get(["Servico > Valores > ValorInss", "InfNfse > Servico > Valores > ValorInss"]);
  const vTotal = get(["ValorCredito", "InfNfse > ValorCredito"]) || vServ;

  return {
    id: uid(),
    direction,
    kind: "NFSE",
    numero,
    serie,
    data_emissao: competencia ? new Date(competencia).toISOString() : new Date().toISOString(),
    cnpj_emitente: direction === "EMITIDA" ? onlyDigits(cnpjPrest) : onlyDigits(cnpjTom),
    nome_emitente: direction === "EMITIDA" ? nomePrest : nomeTom,
    cnpj_destinatario: direction === "EMITIDA" ? onlyDigits(cnpjTom) : onlyDigits(cnpjPrest),
    nome_destinatario: direction === "EMITIDA" ? nomeTom : nomePrest,
    valor_servicos: toNumberOrNull(vServ),
    valor_total: toNumberOrNull(vTotal) ?? 0,
    status: "AUTORIZADA",
    retencoes: {
      iss: toNumberOrNull(vIss),
      pis: toNumberOrNull(vPis),
      cofins: toNumberOrNull(vCofins),
      csll: toNumberOrNull(vCsll),
      irrf: toNumberOrNull(vIr),
      inss: toNumberOrNull(vInss),
    },
    xml_raw: xml,
    empresa_codigo_erp,
  };
}

function parseCTeXML(
  xml: string,
  direction: FiscalDirection,
  empresa_codigo_erp?: string | null
): Invoice {
  const doc = parseXMLtoDoc(xml);
  const get = (xs: string[]) => xs.map((s) => textContent(doc, s)).find(Boolean) ?? null;

  const chave =
    get(["infCte", "CTe > infCte"])?.toString() ||
    textContent(doc, "protCTe > infProt > chCTe");
  const nCT = get(["ide > nCT", "CTe > infCte > ide > nCT"]);
  const serie = get(["ide > serie", "CTe > infCte > ide > serie"]);
  const dhEmi =
    get(["ide > dhEmi", "CTe > infCte > ide > dhEmi"]) ||
    get(["ide > dEmi", "CTe > infCte > ide > dEmi"]);

  const emitCNPJ = get(["emit > CNPJ", "CTe > infCte > emit > CNPJ"]);
  const emitXNome = get(["emit > xNome", "CTe > infCte > emit > xNome"]);
  const tomCNPJ =
    get(["tomador > CNPJ", "CTe > infCte > tomador > CNPJ"]) || get(["toma3 > toma > CNPJ"]);
  const tomXNome =
    get(["tomador > xNome", "CTe > infCte > tomador > xNome"]) || get(["toma3 > toma > xNome"]);
  const vTPrest = get(["vPrest > vTPrest", "CTe > infCte > vPrest > vTPrest"]);

  return {
    id: uid(),
    direction,
    kind: "CTE",
    numero: nCT,
    serie,
    chave,
    data_emissao: dhEmi ? new Date(dhEmi).toISOString() : new Date().toISOString(),
    cnpj_emitente: onlyDigits(emitCNPJ),
    nome_emitente: emitXNome,
    cnpj_destinatario: onlyDigits(tomCNPJ),
    nome_destinatario: tomXNome,
    valor_total: toNumberOrNull(vTPrest) ?? 0,
    status: "AUTORIZADA",
    xml_raw: xml,
    empresa_codigo_erp,
  };
}

// ============================================================
// =================== STORAGE (sem backend) ==================
// ============================================================
// Troque esta camada por Supabase quando quiser.
// Por enquanto, salvamos tudo em LocalStorage (chave fiscal_notas).
const LS_KEY = "fiscal_notas";

const storage = {
  async getAll(): Promise<Invoice[]> {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(LS_KEY);
    try {
      return raw ? (JSON.parse(raw) as Invoice[]) : [];
    } catch {
      return [];
    }
  },
  async upsertBulk(rows: Invoice[]): Promise<void> {
    const current = await storage.getAll();
    // evita duplicar chave (chave NFe/CTe ou NFSe num/serie)
    const idx = new Map<string, number>();
    current.forEach((r, i) => {
      const k = r.chave || `${r.kind}:${r.numero}/${r.serie}:${r.data_emissao}`;
      idx.set(k, i);
    });
    rows.forEach((r) => {
      const k = r.chave || `${r.kind}:${r.numero}/${r.serie}:${r.data_emissao}`;
      if (idx.has(k)) {
        current[idx.get(k)!] = r; // substitui
      } else {
        current.push(r);
      }
    });
    localStorage.setItem(LS_KEY, JSON.stringify(current));
  },
  async clearAll(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(LS_KEY);
  },
};

// ============================================================
// =================== API (mock) + filtros ===================
// ============================================================
type Filters = {
  direction: "ALL" | FiscalDirection;
  kind: "ALL" | FiscalKind;
  status: "ALL" | FiscalStatus;
  cnpj: string;
  numero: string;
  serie: string;
  chave: string;
  cfop: string;
  date_from: string;
  date_to: string;
  empresa_codigo_erp: string;
};

async function fetchNotasLocal(filters: Filters & { directionTab: FiscalDirection }) {
  const all = await storage.getAll();

  const inRange = (iso: string, from?: string, to?: string) => {
    const t = new Date(iso).getTime();
    if (from) {
      const f = new Date(from).getTime();
      if (t < f) return false;
    }
    if (to) {
      const tt = new Date(to).getTime();
      if (t > tt) return false;
    }
    return true;
  };

  const cnpjDigits = onlyDigits(filters.cnpj);
  const text = (s?: string | null) => (s || "").toLowerCase();

  let rows = all
    .filter((r) => r.direction === filters.directionTab)
    .filter((r) => (filters.kind === "ALL" ? true : r.kind === filters.kind))
    .filter((r) => (filters.status === "ALL" ? true : r.status === filters.status))
    .filter((r) =>
      cnpjDigits
        ? (onlyDigits(r.cnpj_emitente)?.includes(cnpjDigits) ||
            onlyDigits(r.cnpj_destinatario)?.includes(cnpjDigits)) ?? false
        : true
    )
    .filter((r) => (filters.chave ? text(r.chave).includes(text(filters.chave)) : true))
    .filter((r) => (filters.cfop ? text(r.cfop).includes(text(filters.cfop)) : true))
    .filter((r) => (filters.serie ? text(r.serie).includes(text(filters.serie)) : true))
    .filter((r) => (filters.numero ? text(r.numero).includes(text(filters.numero)) : true))
    .filter((r) =>
      filters.empresa_codigo_erp
        ? text(r.empresa_codigo_erp).includes(text(filters.empresa_codigo_erp))
        : true
    )
    .filter((r) => inRange(r.data_emissao, filters.date_from || undefined, filters.date_to || undefined))
    .sort((a, b) => +new Date(b.data_emissao) - +new Date(a.data_emissao));

  return rows;
}

// ============================================================
// ========================= COMPONENTE =======================
// ============================================================
export default function FiscalPage() {
  const [directionTab, setDirectionTab] = React.useState<FiscalDirection>("RECEBIDA");
  const [filters, setFilters] = React.useState<Filters>({
    direction: "ALL",
    kind: "ALL",
    status: "ALL",
    cnpj: "",
    numero: "",
    serie: "",
    chave: "",
    cfop: "",
    date_from: "",
    date_to: "",
    empresa_codigo_erp: "",
  });
  const [rows, setRows] = React.useState<Invoice[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [autoGerarTitulos, setAutoGerarTitulos] = React.useState(true);
  const [parsing, setParsing] = React.useState(false);
  const [xmlPreview, setXmlPreview] = React.useState<Invoice[]>([]);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const totalSelecionado = React.useMemo(() => {
    const sel = new Set(selectedIds);
    return rows
      .filter((r) => (r.id ? sel.has(r.id) : false))
      .reduce((acc, r) => acc + (r.valor_total ?? 0), 0);
  }, [selectedIds, rows]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotasLocal({ ...filters, directionTab });
      setRows(data);
      setSelectedIds([]);
    } catch (e: any) {
      console.error("[FiscalPage.load]", e);
      alert(`Falha ao buscar notas.\n\n${e?.message ?? ""}`);
    } finally {
      setLoading(false);
    }
  }, [filters, directionTab]);

  React.useEffect(() => {
    load();
  }, [load]);

  function toggleSelect(id?: string) {
    if (!id) return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // =================== Importação XML ===================
  async function handleFiles(files: FileList, assumedKind?: FiscalKind) {
    setParsing(true);
    try {
      const previews: Invoice[] = [];
      for (const f of Array.from(files)) {
        const txt = await f.text();
        const isNFe = /<(NFe|procNFe)[\s>]/.test(txt);
        const isCTe = /<(CTe|procCTe)[\s>]/.test(txt);
        const isNFSe = /<(CompNfse|Nfse|InfNfse)[\s>]/.test(txt);

        const kind: FiscalKind = assumedKind || (isNFe ? "NFE" : isCTe ? "CTE" : isNFSe ? "NFSE" : "NFE");
        const direction: FiscalDirection = directionTab;

        let inv: Invoice;
        if (kind === "NFE") inv = parseNFeXML(txt, direction, filters.empresa_codigo_erp);
        else if (kind === "CTE") inv = parseCTeXML(txt, direction, filters.empresa_codigo_erp);
        else inv = parseNFSeXML(txt, direction, filters.empresa_codigo_erp);

        previews.push(inv);
      }
      setXmlPreview(previews);
    } catch (e) {
      console.error(e);
      alert("Falha ao ler/parsing XML. Verifique os arquivos.");
    } finally {
      setParsing(false);
    }
  }

  async function confirmarImportacao() {
    if (!xmlPreview.length) return;
    setLoading(true);
    try {
      await storage.upsertBulk(xmlPreview);
      // mock: geração de títulos (aqui só ilustrativo)
      if (autoGerarTitulos) {
        /* no-op por enquanto */
      }
      setXmlPreview([]);
      await load();
      alert(`Importação concluída: ${xmlPreview.length} registro(s).`);
    } catch (e) {
      console.error(e);
      alert("Erro ao importar/inserir notas.");
    } finally {
      setLoading(false);
    }
  }

  // =================== Certificado (stub) ===================
  async function onBuscarPorCertificado() {
    if (!filters.empresa_codigo_erp) {
      alert("Informe a empresa (código ERP) para buscar DF-e.");
      return;
    }
    setLoading(true);
    try {
      // mock para demonstrar loading
      await new Promise((r) => setTimeout(r, 1200));
      alert("Stub: integração DF-e via certificado pendente.");
    } finally {
      setLoading(false);
    }
  }

  // =================== Export CSV ===================
  function exportCSV() {
    const cols = [
      "id",
      "direction",
      "kind",
      "numero",
      "serie",
      "chave",
      "cfop",
      "natureza_operacao",
      "data_emissao",
      "cnpj_emitente",
      "nome_emitente",
      "cnpj_destinatario",
      "nome_destinatario",
      "valor_total",
      "status",
      "empresa_codigo_erp",
    ];
    const csv = [
      cols.join(";"),
      ...rows.map((r) =>
        cols
          .map((c) => {
            const v = (r as any)[c];
            return typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : v ?? "";
          })
          .join(";")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fiscal_notas.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* =================== HEADER =================== */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6" />
            <div>
              <h1 className="text-2xl font-semibold leading-tight">Gestão Fiscal 360º</h1>
              <p className="text-sm text-muted-foreground">
                Notas fiscais emitidas e recebidas (NFe, NFSe, CTe) — importação XML, filtros e exportação.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Atualizar
            </Button>

            {/* Import dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  <CloudUpload className="w-4 h-4 mr-2" />
                  Importar XML
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Importar XML de Notas</DialogTitle>
                </DialogHeader>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        <FileJson className="w-3 h-3 mr-1" />
                        Arraste e solte ou selecione
                      </Badge>
                      <Badge variant="outline">
                        Aba atual: {directionTab === "EMITIDA" ? "Emitidas" : "Recebidas"}
                      </Badge>
                    </div>

                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
                      }}
                      className="border-2 border-dashed rounded-2xl p-6 text-center"
                    >
                      <p className="text-sm mb-4">Solte aqui vários arquivos .xml</p>
                      <Input
                        ref={inputRef}
                        type="file"
                        accept=".xml"
                        multiple
                        onChange={(e) => e.currentTarget.files && handleFiles(e.currentTarget.files)}
                      />
                      <div className="text-xs text-muted-foreground mt-2">
                        Detectamos automaticamente NFe, NFSe e CTe
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="auto-titulos"
                          checked={autoGerarTitulos}
                          onCheckedChange={setAutoGerarTitulos}
                        />
                        <Label htmlFor="auto-titulos" className="cursor-pointer">
                          Gerar títulos financeiro automaticamente
                        </Label>
                      </div>
                      {parsing && (
                        <div className="text-sm flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Lendo arquivos…
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <h3 className="font-medium">Pré-visualização ({xmlPreview.length})</h3>
                    </div>
                    <div className="max-h-64 overflow-auto border rounded-xl">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 text-left">
                            <th className="p-2">Tipo</th>
                            <th className="p-2">Número/Série</th>
                            <th className="p-2">Emissão</th>
                            <th className="p-2">Emitente → Dest.</th>
                            <th className="p-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {xmlPreview.map((r, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">
                                <Badge variant="outline">{r.kind}</Badge>
                              </td>
                              <td className="p-2">
                                {r.numero}/{r.serie}
                              </td>
                              <td className="p-2">
                                {new Date(r.data_emissao).toLocaleDateString()}
                              </td>
                              <td className="p-2">
                                <div
                                  className="max-w-[300px] truncate"
                                  title={`${r.nome_emitente} → ${r.nome_destinatario}`}
                                >
                                  {r.nome_emitente} → {r.nome_destinatario}
                                </div>
                              </td>
                              <td className="p-2 text-right">{currency(r.valor_total)}</td>
                            </tr>
                          ))}
                          {!xmlPreview.length && (
                            <tr>
                              <td
                                colSpan={5}
                                className="p-4 text-center text-muted-foreground"
                              >
                                Nenhum arquivo carregado.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setXmlPreview([])}>
                        Limpar
                      </Button>
                      <Button onClick={confirmarImportacao} disabled={!xmlPreview.length || loading}>
                        {loading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        Importar agora
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary" size="sm" onClick={onBuscarPorCertificado}>
                  <ShieldCheck className="w-4 h-4 mr-2" /> Buscar por Certificado
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Requer middleware DF-e (A1). Quando integrar ao backend, chame uma rota server-side.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* =================== FILTROS =================== */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filtros
            </CardTitle>
            <CardDescription>
              Refine por empresa, tipo, período, CNPJ/Chave e mais.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            <div>
              <Label>Empresa (cód. ERP)</Label>
              <Input
                placeholder="ex.: CELL-DUTY"
                value={filters.empresa_codigo_erp}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, empresa_codigo_erp: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={filters.kind}
                onValueChange={(v) => setFilters((f) => ({ ...f, kind: v as any }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="NFE">NFe</SelectItem>
                  <SelectItem value="NFSE">NFSe</SelectItem>
                  <SelectItem value="CTE">CTe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(v) => setFilters((f) => ({ ...f, status: v as any }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="AUTORIZADA">Autorizada</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                  <SelectItem value="DENEGADA">Denegada</SelectItem>
                  <SelectItem value="EM_PROCESSAMENTO">Em processamento</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>CNPJ (emit./dest.)</Label>
              <Input
                placeholder="somente números"
                value={filters.cnpj}
                onChange={(e) => setFilters((f) => ({ ...f, cnpj: e.target.value }))}
              />
            </div>
            <div>
              <Label>Chave</Label>
              <Input
                value={filters.chave}
                onChange={(e) => setFilters((f) => ({ ...f, chave: e.target.value }))}
              />
            </div>
            <div>
              <Label>CFOP</Label>
              <Input
                value={filters.cfop}
                onChange={(e) => setFilters((f) => ({ ...f, cfop: e.target.value }))}
              />
            </div>
            <div>
              <Label>Número</Label>
              <Input
                value={filters.numero}
                onChange={(e) => setFilters((f) => ({ ...f, numero: e.target.value }))}
              />
            </div>
            <div>
              <Label>Série</Label>
              <Input
                value={filters.serie}
                onChange={(e) => setFilters((f) => ({ ...f, serie: e.target.value }))}
              />
            </div>
            <div>
              <Label>Emissão (de)</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
              />
            </div>
            <div>
              <Label>Emissão (até)</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" variant="secondary" onClick={load}>
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                variant="outline"
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    kind: "ALL",
                    status: "ALL",
                    cnpj: "",
                    numero: "",
                    serie: "",
                    chave: "",
                    cfop: "",
                    date_from: "",
                    date_to: "",
                  }))
                }
              >
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* =================== KPIs =================== */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4" />
                Total de notas
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {rows.length.toLocaleString("pt-BR")}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Somatório selecionado
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {currency(totalSelecionado)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BadgePercent className="w-4 h-4" />
                Retenções (preview)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Veja por nota na tabela
            </CardContent>
          </Card>
        </div>

        {/* =================== ABAS + TABELA =================== */}
        <Tabs value={directionTab} onValueChange={(v) => setDirectionTab(v as FiscalDirection)}>
          <TabsList>
            <TabsTrigger value="RECEBIDA">
              <ArrowDownCircle className="w-4 h-4 mr-2" />
              Recebidas
            </TabsTrigger>
            <TabsTrigger value="EMITIDA">
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              Emitidas
            </TabsTrigger>
          </TabsList>
          <TabsContent value="RECEBIDA">
            <NotasTable rows={rows} selectedIds={selectedIds} toggleSelect={toggleSelect} />
          </TabsContent>
          <TabsContent value="EMITIDA">
            <NotasTable rows={rows} selectedIds={selectedIds} toggleSelect={toggleSelect} />
          </TabsContent>
        </Tabs>

        {/* =================== AÇÕES EM LOTE =================== */}
        <Card>
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-3 py-4">
            <div className="text-sm text-muted-foreground">
              {selectedIds.length > 0 ? (
                <>
                  <b>{selectedIds.length}</b> selecionada(s) — Total {currency(totalSelecionado)}
                </>
              ) : (
                <>Nenhuma nota selecionada.</>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!selectedIds.length}
                    onClick={() =>
                      alert("Gerar DANFE/DACTE em lote — integrar com serviço externo.")
                    }
                  >
                    Gerar PDF(s)
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Gera DANFE/DACTE via provedor externo.</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    disabled={!selectedIds.length}
                    onClick={() => alert("Manifesto do destinatário — integrar DF-e.")}
                  >
                    Manifestar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Confirmação de operação e ciência (MD-e).</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" disabled={!rows.length} onClick={exportCSV}>
                    Exportar CSV
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exporta a listagem atual com filtros.</TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

// =================== TABELA ===================
function NotasTable({
  rows,
  selectedIds,
  toggleSelect,
}: {
  rows: Invoice[];
  selectedIds: string[];
  toggleSelect: (id?: string) => void;
}) {
  return (
    <div className="border rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-left">
            <th className="p-2 w-10"></th>
            <th className="p-2">Tipo</th>
            <th className="p-2">Número/Série</th>
            <th className="p-2">Emissão</th>
            <th className="p-2">Emitente</th>
            <th className="p-2">Destinatário</th>
            <th className="p-2">CFOP</th>
            <th className="p-2">Chave</th>
            <th className="p-2 text-right">Total</th>
            <th className="p-2">Retenções</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id ?? `${r.kind}-${r.numero}-${r.serie}-${r.chave}-${r.data_emissao}`}
              className="border-t hover:bg-muted/30"
            >
              <td className="p-2 align-top">
                <Checkbox
                  checked={selectedIds.includes(r.id ?? "")}
                  onCheckedChange={() => toggleSelect(r.id)}
                />
              </td>
              <td className="p-2 align-top">
                <Badge variant="outline">{r.kind}</Badge>
              </td>
              <td className="p-2 align-top">
                {r.numero}/{r.serie}
              </td>
              <td className="p-2 align-top">
                {new Date(r.data_emissao).toLocaleDateString()}
              </td>
              <td className="p-2 align-top">
                <div
                  className="max-w-[220px] truncate"
                  title={`${r.nome_emitente} (${r.cnpj_emitente})`}
                >
                  {r.nome_emitente}
                </div>
                <div className="text-xs text-muted-foreground">{r.cnpj_emitente}</div>
              </td>
              <td className="p-2 align-top">
                <div
                  className="max-w-[220px] truncate"
                  title={`${r.nome_destinatario} (${r.cnpj_destinatario})`}
                >
                  {r.nome_destinatario}
                </div>
                <div className="text-xs text-muted-foreground">{r.cnpj_destinatario}</div>
              </td>
              <td className="p-2 align-top">{r.cfop}</td>
              <td className="p-2 align-top">
                <div className="max-w-[280px] truncate" title={r.chave ?? ""}>
                  {r.chave}
                </div>
              </td>
              <td className="p-2 align-top text-right font-medium">
                {currency(r.valor_total)}
              </td>
              <td className="p-2 align-top">
                <div className="flex flex-wrap gap-1 text-xs">
                  {r.retencoes?.iss ? (
                    <Badge variant="secondary">ISS {currency(r.retencoes.iss)}</Badge>
                  ) : null}
                  {r.retencoes?.icms_st ? (
                    <Badge variant="secondary">ICMS ST {currency(r.retencoes.icms_st)}</Badge>
                  ) : null}
                  {r.retencoes?.pis ? (
                    <Badge variant="secondary">PIS {currency(r.retencoes.pis)}</Badge>
                  ) : null}
                  {r.retencoes?.cofins ? (
                    <Badge variant="secondary">COFINS {currency(r.retencoes.cofins)}</Badge>
                  ) : null}
                  {r.retencoes?.csll ? (
                    <Badge variant="secondary">CSLL {currency(r.retencoes.csll)}</Badge>
                  ) : null}
                  {r.retencoes?.irrf ? (
                    <Badge variant="secondary">IRRF {currency(r.retencoes.irrf)}</Badge>
                  ) : null}
                  {r.retencoes?.inss ? (
                    <Badge variant="secondary">INSS {currency(r.retencoes.inss)}</Badge>
                  ) : null}
                  {!r.retencoes || Object.values(r.retencoes).every((v) => !v) ? (
                    <span className="text-muted-foreground">—</span>
                  ) : null}
                </div>
              </td>
              <td className="p-2 align-top">
                <Badge
                  className="uppercase"
                  variant={
                    r.status === "AUTORIZADA"
                      ? "default"
                      : r.status === "CANCELADA" || r.status === "DENEGADA"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {r.status}
                </Badge>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={11} className="p-8 text-center text-muted-foreground">
                Nenhuma nota encontrada para os filtros informados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
