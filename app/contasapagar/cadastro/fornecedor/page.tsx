"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import { z } from "zod";
import { useForm, type SubmitHandler, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Search,
  X,
  Paperclip,
  ChevronDown,
  Loader2,
  Calendar,
  DollarSign,
  FileText,
  Layers,
  Tags,
  Building,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

/* ------------------------------- Schema ----------------------------------- */
const TIPO_MOV = ["definitivo", "previsto"] as const;
const FDS_OPCOES = ["manter", "antecipar", "postergar"] as const;
const PERIODO_OPCOES = ["mensal", "especifico"] as const;

const RetencoesSchema = z.object({
  pis: z.coerce.number().min(0).optional().default(0),
  cofins: z.coerce.number().min(0).optional().default(0),
  csll: z.coerce.number().min(0).optional().default(0),
  ir: z.coerce.number().min(0).optional().default(0),
  iss: z.coerce.number().min(0).optional().default(0),
  inss: z.coerce.number().min(0).optional().default(0),
});

const RateioItemSchema = z.object({
  categoria_id: z.string(),
  categoria_nome: z.string(),
  valor: z.coerce.number().min(0),
});
type RateioItem = z.infer<typeof RateioItemSchema>;

const ReplicacaoSchema = z.object({
  ativo: z.boolean().default(false),
  fimDeSemana: z.enum(FDS_OPCOES).default("manter"),
  periodo: z.enum(PERIODO_OPCOES).default("mensal"),
  repetirTodoDia: z.boolean().default(false),
  parcelas: z.coerce.number().int().min(1).max(240).default(1),
});

const DEFAULT_REP: z.infer<typeof ReplicacaoSchema> = {
  ativo: false,
  fimDeSemana: "manter",
  periodo: "mensal",
  repetirTodoDia: false,
  parcelas: 1,
};

const formSchema = z.object({
  tipoMov: z.enum(TIPO_MOV).default("definitivo"),
  lojaId: z.string().nullable().optional(),
  descricao: z.string().min(3, "Descreva a despesa"),
  fornecedorId: z.string().optional(),
  fornecedorNome: z.string().optional(),
  competencia: z.string(),
  vencimento: z.string(),
  valor: z.coerce.number().min(0.01, "Informe um valor"),
  tipoDocumentoId: z.string().optional(),
  numeroDocumento: z.string().optional(),
  categoriaId: z.string().optional(),
  departamentoId: z.string().optional(),
  observacao: z.string().optional(),
  pixChave: z.string().optional(),
  usarRetencoes: z.boolean().default(false),
  retencoes: RetencoesSchema.partial().optional(),
  replicacao: ReplicacaoSchema.default(DEFAULT_REP),
  anexos: z.array(z.instanceof(File)).optional(),
  rateios: z.array(RateioItemSchema).optional(),
});
export type FormValues = z.infer<typeof formSchema>;

const formDefaults: FormValues = {
  tipoMov: "definitivo",
  lojaId: undefined,
  descricao: "",
  fornecedorId: undefined,
  fornecedorNome: "",
  competencia: new Date().toISOString().slice(0, 10),
  vencimento: new Date().toISOString().slice(0, 10),
  valor: 0,
  tipoDocumentoId: undefined,
  numeroDocumento: "",
  categoriaId: undefined,
  departamentoId: undefined,
  observacao: "",
  pixChave: "",
  usarRetencoes: false,
  retencoes: {},
  replicacao: DEFAULT_REP,
  anexos: [],
  rateios: [],
};

/* ----------------------------- Helpers & hooks ----------------------------- */
function formatCurrencyBRL(n: number | string) {
  const x = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(x)) return "";
  return x.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
function mergeRep(current: FormValues["replicacao"], patch: Partial<FormValues["replicacao"]>) {
  return { ...DEFAULT_REP, ...current, ...patch } as FormValues["replicacao"];
}

/* ----------------------------- Supabase helpers ---------------------------- */
type SelectItem = { id: string; label: string };
type Fornecedor = {
  id: string;
  CLIENTE_FORNECEDOR: string;
  CPF_CNPJ: string | null;
  RAZAO_SOCIAL: string | null;
};

/** Logger robusto: só loga quando for realmente erro */
function logPgRes(label: string, res: any) {
  const hasHttpError = typeof res?.status === "number" && res.status >= 400;
  const err = res?.error;
  const hasErrInfo =
    !!err && (typeof err.message === "string" || typeof err.code === "string" || typeof err.hint === "string");
  if (hasHttpError || hasErrInfo) {
    console.error(`Erro ${label}:`, {
      message: err?.message,
      details: err?.details,
      hint: err?.hint,
      code: err?.code,
      status: res?.status,
      statusText: res?.statusText,
    });
  }
}

/** Carrega combos e devolve erros por tabela */
async function carregarSelects(supabase: ReturnType<typeof createClientComponentClient>) {
  const [lojasRes, tiposRes, catsRes, depsRes] = await Promise.all([
    supabase.from("lojas").select("id, nome_fantasia").order("nome_fantasia", { ascending: true }),
    supabase.from("tipos_documento").select("id, codigo").order("codigo", { ascending: true }),
    supabase.from("plano_contas").select("id, nome").order("nome", { ascending: true }),
    supabase.from("centros_custo").select("id, nome").order("nome", { ascending: true }),
  ]);

  // Logs somente quando for erro real
  logPgRes("lojas", lojasRes);
  logPgRes("tipos_documento", tiposRes);
  logPgRes("plano_contas", catsRes);
  logPgRes("centros_custo", depsRes);

  // Permissão negada? (RLS ainda sem policy)
  const permDeny = [lojasRes, tiposRes, catsRes, depsRes].some(
    (r) => typeof r?.status === "number" && (r.status === 401 || r.status === 403)
  );
  if (permDeny) {
    toast.error("Sem permissão para ler algumas listas (RLS). Ative as policies básicas.");
  }

  return {
    lojas: (lojasRes.data || []).map((l: any) => ({ id: String(l.id), label: l.nome_fantasia })) as SelectItem[],
    tiposDocumento: (tiposRes.data || []).map((t: any) => ({ id: String(t.id), label: t.codigo })) as SelectItem[],
    categorias: (catsRes.data || []).map((c: any) => ({ id: String(c.id), label: c.nome })) as SelectItem[],
    departamentos: (depsRes.data || []).map((d: any) => ({ id: String(d.id), label: d.nome })) as SelectItem[],
    errors: {
      lojas: lojasRes.error || null,
      tipos: tiposRes.error || null,
      categorias: catsRes.error || null,
      departamentos: depsRes.error || null,
    },
  };
}

/** Busca fornecedores por nome, CNPJ ou razão */
async function buscarFornecedores(
  supabase: ReturnType<typeof createClientComponentClient>,
  termo: string,
  limit = 15
) {
  return supabase
    .from("clientes_fornecedores")
    .select("id, CLIENTE_FORNECEDOR, CPF_CNPJ, RAZAO_SOCIAL")
    .or(`CLIENTE_FORNECEDOR.ilike.%${termo}%,CPF_CNPJ.ilike.%${termo}%,RAZAO_SOCIAL.ilike.%${termo}%`)
    .limit(limit);
}

/** Uploads */
async function uploadAnexos(
  supabase: ReturnType<typeof createClientComponentClient>,
  files: File[] | undefined | null
): Promise<{ nome: string; url: string }[]> {
  const uploaded: { nome: string; url: string }[] = [];
  if (!files || files.length === 0) return uploaded;

  for (const file of files) {
    const key = `contas_pagar/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("documentos").upload(key, file);
    if (error) throw error;
    const { data: pub } = supabase.storage.from("documentos").getPublicUrl(key);
    uploaded.push({ nome: file.name, url: pub.publicUrl });
  }
  return uploaded;
}

/** Insert */
async function inserirContaPagar(
  supabase: ReturnType<typeof createClientComponentClient>,
  values: {
    tipoMov: "definitivo" | "previsto";
    lojaId?: string | null;
    descricao: string;
    fornecedorId?: string;
    competencia: string;
    vencimento: string;
    valor: number;
    tipoDocumentoId?: string;
    numeroDocumento?: string;
    categoriaId?: string;
    departamentoId?: string;
    observacao?: string;
    pixChave?: string;
    usarRetencoes: boolean;
    retencoes?: Record<string, number | undefined>;
    replicacao: {
      ativo: boolean;
      fimDeSemana: "manter" | "antecipar" | "postergar";
      periodo: "mensal" | "especifico";
      repetirTodoDia: boolean;
      parcelas: number;
    };
    rateios?: Array<{ categoria_id: string; categoria_nome: string; valor: number }>;
    anexos?: { nome: string; url: string }[];
  }
) {
  const payload = {
    tipo: values.tipoMov,
    loja_id: values.lojaId ? Number(values.lojaId) : null,
    descricao: values.descricao,
    fornecedor_id: values.fornecedorId ? Number(values.fornecedorId) : null,
    competencia: values.competencia,
    vencimento: values.vencimento,
    valor: values.valor,
    tipo_documento_id: values.tipoDocumentoId ? Number(values.tipoDocumentoId) : null,
    numero_documento: values.numeroDocumento || null,
    categoria_id: values.categoriaId ? Number(values.categoriaId) : null,
    departamento_id: values.departamentoId ? Number(values.departamentoId) : null,
    observacao: values.observacao || null,
    pix_chave: values.pixChave || null,
    usar_retencoes: !!values.usarRetencoes,
    retencoes: values.usarRetencoes ? values.retencoes || {} : {},
    replicacao: values.replicacao,
    rateios: values.rateios || [],
    anexos: values.anexos || [],
    status: "PENDENTE",
    criado_em: new Date().toISOString(),
  };

  return supabase.from("contas_pagar").insert(payload).select().single();
}

/* --------------------------- Main Page Component --------------------------- */
export default function NovaDespesaPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [precisaLogin, setPrecisaLogin] = useState(false);
  const [errosCarga, setErrosCarga] = useState<{ [k: string]: any }>({});

  const [tab, setTab] = useState<"fornecedor" | "impostos" | "funcionario" | "divisao" | "transferencia">(
    "fornecedor"
  );

  const [salvando, setSalvando] = useState(false);
  const [abrirCancelar, setAbrirCancelar] = useState(false);
  const [abrirRateio, setAbrirRateio] = useState(false);

  const [lojas, setLojas] = useState<SelectItem[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<SelectItem[]>([]);
  const [categorias, setCategorias] = useState<SelectItem[]>([]);
  const [departamentos, setDepartamentos] = useState<SelectItem[]>([]);

  const [qFornecedor, setQFornecedor] = useState("");
  const dqFornecedor = useDebouncedValue(qFornecedor, 400);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedorLoading, setFornecedorLoading] = useState(false);
  const [fornecedorNotFound, setFornecedorNotFound] = useState(false);

  const form = useForm<FormValues, any, FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues, any>,
    defaultValues: formDefaults,
    mode: "onChange",
  });

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) {
        setPrecisaLogin(true);
        toast.error("Você precisa estar logado para carregar as listas (RLS ativo).");
        return;
      }

      const { lojas, tiposDocumento, categorias, departamentos, errors } = await carregarSelects(supabase);

      setErrosCarga({
        lojas: errors.lojas?.message,
        tipos: errors.tipos?.message,
        categorias: errors.categorias?.message,
        departamentos: errors.departamentos?.message,
      });

      setLojas(lojas);
      setTiposDocumento(tiposDocumento);
      setCategorias(categorias);
      setDepartamentos(departamentos);

      // Aviso opcional se alguma vier vazia (não é erro fatal)
      const vazias: string[] = [];
      if (!lojas?.length) vazias.push("lojas");
      if (!tiposDocumento?.length) vazias.push("tipos_documento");
      if (!categorias?.length) vazias.push("plano_contas");
      if (!departamentos?.length) vazias.push("centros_custo");
      if (vazias.length) {
        console.info("Listas vazias (sem registros ou sem permissão de leitura):", vazias.join(", "));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!dqFornecedor || dqFornecedor.length < 2) {
        setFornecedores([]);
        setFornecedorNotFound(false);
        return;
      }
      setFornecedorLoading(true);
      const { data, error } = await buscarFornecedores(supabase, dqFornecedor, 15);
      if (!active) return;
      setFornecedorLoading(false);

      if (error) {
        console.error(error);
        setFornecedores([]);
        setFornecedorNotFound(false);
        toast.error("Erro ao buscar fornecedor");
        return;
      }
      setFornecedores((data as Fornecedor[]) || []);
      setFornecedorNotFound((data || []).length === 0);
    })();
    return () => {
      active = false;
    };
  }, [dqFornecedor, supabase]);

  const somaRateio = useMemo<number>(
    () =>
      (form.getValues("rateios") || []).reduce((acc: number, r: RateioItem) => acc + (Number(r.valor) || 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.watch("rateios")]
  );

  const restanteRateio = useMemo<number>(
    () => Number(form.getValues("valor") || 0) - somaRateio,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.watch("valor"), somaRateio]
  );

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      setSalvando(true);
      const anexos = await uploadAnexos(supabase, values.anexos);
      const { data, error } = await inserirContaPagar(supabase, {
        tipoMov: values.tipoMov,
        lojaId: values.lojaId ?? null,
        descricao: values.descricao,
        fornecedorId: values.fornecedorId,
        competencia: values.competencia,
        vencimento: values.vencimento,
        valor: values.valor,
        tipoDocumentoId: values.tipoDocumentoId,
        numeroDocumento: values.numeroDocumento,
        categoriaId: values.categoriaId,
        departamentoId: values.departamentoId,
        observacao: values.observacao,
        pixChave: values.pixChave,
        usarRetencoes: values.usarRetencoes,
        retencoes: values.retencoes as any,
        replicacao: values.replicacao,
        rateios: values.rateios as any,
        anexos,
      });
      if (error) throw error;
      toast.success(`Despesa #${data?.id} criada!`);
      router.push("/financeiro/contas-a-pagar");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Não foi possível salvar a despesa.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {precisaLogin && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 text-sm">
          Você não está autenticado. Entre no sistema para carregar lojas, tipos de documento, categorias e centros de custo.
        </div>
      )}

      {Object.values(errosCarga).some(Boolean) && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-red-900 text-sm">
          Aviso: houve erro ao carregar:{" "}
          {Object.entries(errosCarga)
            .filter(([, v]) => v)
            .map(([k]) => k)
            .join(", ")}
          . Detalhes no console do navegador.
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>
        <Button variant="ghost" onClick={() => setAbrirCancelar(true)} className="text-red-600">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xl">Nova Despesa</CardTitle>
          <div className="flex gap-2">
            {[
              { id: "fornecedor", label: "Despesa c/ Fornecedor" },
              { id: "impostos", label: "Impostos" },
              { id: "funcionario", label: "Funcionário" },
              { id: "divisao", label: "Divisão de Lucro" },
              { id: "transferencia", label: "Transferência" },
            ].map((t) => (
              <Button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as typeof tab)}
                variant={tab === t.id ? "default" : "secondary"}
                className={cn("h-9", tab === t.id ? "" : "bg-muted")}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <Separator />

        <CardContent className="pt-6">
          {tab === "fornecedor" && (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Tipo + Loja */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {TIPO_MOV.map((opt) => (
                      <Button
                        type="button"
                        key={opt}
                        variant={form.watch("tipoMov") === opt ? "default" : "outline"}
                        onClick={() => form.setValue("tipoMov", opt)}
                      >
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label>
                    Selecione a loja{" "}
                    <span className="text-muted-foreground text-xs">(apenas para empresas com + de 1 CNPJ)</span>
                  </Label>
                  <Combobox
                    placeholder="Buscar loja"
                    items={lojas}
                    value={form.watch("lojaId") || ""}
                    onChange={(v: string) => form.setValue("lojaId", v)}
                    emptyLabel="Nenhuma loja encontrada"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <Label>Descrição</Label>
                <Input className="mt-2" placeholder="Breve descrição" {...form.register("descricao")} />
                {form.formState.errors.descricao && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.descricao.message as string}</p>
                )}
              </div>

              {/* Fornecedor */}
              <div>
                <div className="flex items-center justify-between">
                  <Label>Fornecedor</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Cadastrar fornecedor"
                      onClick={() => router.push("/cadastro/clientes-fornecedores/novo")}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Consultar fornecedores"
                      onClick={() => router.push("/cadastro/clientes-fornecedores")}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-2">
                  <Input
                    placeholder="Busque por nome, CNPJ ou razão social"
                    value={qFornecedor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQFornecedor(e.target.value)}
                  />

                  {fornecedorLoading && (
                    <div className="flex items-center text-sm text-muted-foreground mt-2 gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                    </div>
                  )}

                  {!fornecedorLoading && qFornecedor && fornecedores.length > 0 && (
                    <div className="mt-2 border rounded-md max-h-56 overflow-auto">
                      {fornecedores.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          className={cn(
                            "w-full text-left px-3 py-2 hover:bg-muted/60",
                            form.watch("fornecedorId") === String(f.id) && "bg-muted"
                          )}
                          onClick={() => {
                            form.setValue("fornecedorId", String(f.id));
                            form.setValue("fornecedorNome", f.CLIENTE_FORNECEDOR);
                          }}
                        >
                          <div className="font-medium">{f.CLIENTE_FORNECEDOR}</div>
                          <div className="text-xs text-muted-foreground">
                            {f.CPF_CNPJ || "—"} {f.RAZAO_SOCIAL ? ` • ${f.RAZAO_SOCIAL}` : ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {!fornecedorLoading && fornecedorNotFound && (
                    <div className="mt-2 text-sm">
                      <span className="text-amber-600 font-medium">Fornecedor não encontrado.</span>{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => router.push("/cadastro/clientes-fornecedores/novo")}
                      >
                        deseja cadastrar agora?
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Datas + Valor */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Competência
                  </Label>
                  <Input type="date" className="mt-2" {...form.register("competencia")} />
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Vencimento
                  </Label>
                  <Input type="date" className="mt-2" {...form.register("vencimento")} />
                </div>
                <div className="md:col-span-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Valor
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-2"
                    placeholder="0,00"
                    {...form.register("valor", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{formatCurrencyBRL(form.watch("valor") || 0)}</p>
                </div>
              </div>

              {/* Tipo documento + Nº doc */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Tipo de documento
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Cadastrar tipo de documento"
                        onClick={() => router.push("/cadastro/tipos-documento/novo")}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Consultar tipos de documento"
                        onClick={() => router.push("/cadastro/tipos-documento")}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Combobox
                    className="mt-2"
                    placeholder="Selecione o tipo de documento"
                    items={tiposDocumento}
                    value={form.watch("tipoDocumentoId") || ""}
                    onChange={(v: string) => form.setValue("tipoDocumentoId", v)}
                    emptyLabel="Nenhum tipo cadastrado"
                  />
                </div>
                <div>
                  <Label>Nº documento</Label>
                  <Input className="mt-2" placeholder="Número da nota/boletos" {...form.register("numeroDocumento")} />
                </div>
              </div>

              {/* Categoria + Rateio + Departamento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Layers className="h-4 w-4" /> Categoria
                    </Label>
                    <Button type="button" variant="outline" onClick={() => setAbrirRateio(true)}>
                      Abrir rateio
                    </Button>
                  </div>
                  <Combobox
                    className="mt-2"
                    placeholder="Selecione a categoria"
                    items={categorias}
                    value={form.watch("categoriaId") || ""}
                    onChange={(v: string) => form.setValue("categoriaId", v)}
                    emptyLabel="Nenhuma categoria"
                  />
                  {form.watch("rateios") && form.watch("rateios")!.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Rateado: {formatCurrencyBRL(somaRateio)} • Restante: {formatCurrencyBRL(restanteRateio)}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <Building className="h-4 w-4" /> Departamento
                  </Label>
                  <Combobox
                    className="mt-2"
                    placeholder="Selecione o centro de custo"
                    items={departamentos}
                    value={form.watch("departamentoId") || ""}
                    onChange={(v: string) => form.setValue("departamentoId", v)}
                    emptyLabel="Nenhum centro de custo"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <Tags className="h-4 w-4" /> Chave PIX
                  </Label>
                  <Input className="mt-2" placeholder="Chave pix (opcional)" {...form.register("pixChave")} />
                </div>
              </div>

              {/* Observação */}
              <div>
                <Label>Observação</Label>
                <Textarea className="mt-2" rows={3} placeholder="Anotações..." {...form.register("observacao")} />
              </div>

              {/* Impostos retidos */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Impostos retidos</div>
                    <div className="text-sm text-muted-foreground">Clique para alternar</div>
                  </div>
                  <Button
                    type="button"
                    variant={form.watch("usarRetencoes") ? "default" : "outline"}
                    onClick={() => form.setValue("usarRetencoes", !form.watch("usarRetencoes"))}
                  >
                    {form.watch("usarRetencoes") ? "Sim" : "Não"}
                  </Button>
                </div>

                {form.watch("usarRetencoes") && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    {([
                      ["pis", "PIS retido"],
                      ["cofins", "COFINS retido"],
                      ["csll", "CSLL retido"],
                      ["ir", "IR retido"],
                      ["iss", "ISS retido"],
                      ["inss", "INSS retido"],
                    ] as const).map(([key, label]) => (
                      <div key={key}>
                        <Label>{label}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="mt-2"
                          value={(form.watch("retencoes")?.[key] as number | undefined) ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const v = Number(e.target.value || 0);
                            const current = form.getValues("retencoes") || {};
                            form.setValue("retencoes", { ...current, [key]: v } as any);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Replicar despesa */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Replicar despesa</div>
                    <div className="text-sm text-muted-foreground">Crie recorrência, parcelas e regras de feriados</div>
                  </div>
                  <Button
                    type="button"
                    variant={form.watch("replicacao")?.ativo ? "default" : "outline"}
                    onClick={() =>
                      form.setValue(
                        "replicacao",
                        mergeRep(form.getValues("replicacao"), { ativo: !form.getValues("replicacao")?.ativo })
                      )
                    }
                  >
                    {form.watch("replicacao")?.ativo ? "Sim" : "Não"}
                  </Button>
                </div>

                {form.watch("replicacao")?.ativo && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <Label>Se cair em sáb./dom./feriado</Label>
                      <select
                        className="mt-2 w-full border rounded-md h-10 px-3 bg-background"
                        value={form.watch("replicacao")?.fimDeSemana}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          form.setValue(
                            "replicacao",
                            mergeRep(form.getValues("replicacao"), {
                              fimDeSemana: e.target.value as (typeof FDS_OPCOES)[number],
                            })
                          )
                        }
                      >
                        {FDS_OPCOES.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Período</Label>
                      <select
                        className="mt-2 w-full border rounded-md h-10 px-3 bg-background"
                        value={form.watch("replicacao")?.periodo}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          form.setValue(
                            "replicacao",
                            mergeRep(form.getValues("replicacao"), {
                              periodo: e.target.value as (typeof PERIODO_OPCOES)[number],
                            })
                          )
                        }
                      >
                        {PERIODO_OPCOES.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end gap-2">
                      <div className="flex flex-col">
                        <Label>Repetir todo dia?</Label>
                        <div className="mt-2">
                          <Switch
                            checked={!!form.watch("replicacao")?.repetirTodoDia}
                            onCheckedChange={(v: boolean) =>
                              form.setValue("replicacao", mergeRep(form.getValues("replicacao"), { repetirTodoDia: !!v }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Parcelas</Label>
                      <Input
                        type="number"
                        min={1}
                        max={240}
                        className="mt-2"
                        value={form.watch("replicacao")?.parcelas ?? 1}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          form.setValue(
                            "replicacao",
                            mergeRep(form.getValues("replicacao"), { parcelas: Number(e.target.value || 1) })
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Anexar documento */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium flex items-center gap-2">
                    <Paperclip className="h-4 w-4" /> Anexar documento
                  </div>
                </div>
                <Input
                  type="file"
                  className="mt-2"
                  multiple
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const files = Array.from(e.target.files || []);
                    form.setValue("anexos", files as File[]);
                  }}
                />
                {form.watch("anexos") && form.watch("anexos")!.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {form.watch("anexos")!.length} arquivo(s) pronto(s) para upload
                  </p>
                )}
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setAbrirCancelar(true)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={salvando}>
                  {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />} SALVAR
                </Button>
              </div>
            </form>
          )}

          {tab !== "fornecedor" && (
            <div className="text-sm text-muted-foreground">
              As outras opções (Impostos, Funcionário, Divisão de Lucro e Transferência) seguem estrutura semelhante e
              podem reutilizar este formulário base com campos específicos.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={abrirCancelar} onOpenChange={setAbrirCancelar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar cadastro?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja cancelar? Todos os dados serão perdidos.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbrirCancelar(false)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={() => router.back()}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RateioDialog
        open={abrirRateio}
        onOpenChange={setAbrirRateio}
        categorias={categorias}
        valorTotal={Number(form.watch("valor") || 0)}
        items={(form.watch("rateios") as RateioItem[]) || []}
        onChange={(items: RateioItem[]) => form.setValue("rateios", items)}
      />
    </div>
  );
}

/* ------------------------------ Combobox UI -------------------------------- */
type ComboboxProps = {
  items: SelectItem[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
};

function Combobox({
  items,
  value,
  onChange,
  placeholder = "Buscar...",
  emptyLabel = "Sem resultados",
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, search]);

  const selected = items.find((i) => i.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selected ? selected.label : placeholder}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
        <Command>
          <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
          <CommandEmpty>{emptyLabel}</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {filtered.map((i) => (
              <CommandItem
                key={i.id}
                value={i.label}
                onSelect={() => {
                  onChange(i.id);
                  setOpen(false);
                }}
              >
                {i.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------ Rateio Dialog ------------------------------ */
function RateioDialog({
  open,
  onOpenChange,
  categorias,
  valorTotal,
  items,
  onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categorias: SelectItem[];
  valorTotal: number;
  items: RateioItem[];
  onChange: (items: RateioItem[]) => void;
}) {
  const soma = useMemo<number>(() => items.reduce((a: number, b: RateioItem) => a + (Number(b.valor) || 0), 0), [items]);
  const restante = useMemo<number>(() => Number(valorTotal || 0) - soma, [valorTotal, soma]);

  function addItem() {
    onChange([...items, { categoria_id: "", categoria_nome: "", valor: 0 }]);
  }
  function updItem(idx: number, patch: Partial<RateioItem>) {
    const clone = [...items];
    clone[idx] = { ...clone[idx], ...patch };
    onChange(clone);
  }
  function delItem(idx: number) {
    const clone = [...items];
    clone.splice(idx, 1);
    onChange(clone);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rateios por categoria</DialogTitle>
          <p className="text-sm text-muted-foreground">Selecione as categorias e distribua o valor.</p>
        </DialogHeader>

        <div className="space-y-3">
          {items.length === 0 && <div className="text-sm text-muted-foreground">Nenhum rateio adicionado.</div>}

          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-7">
                <Label>Categoria</Label>
                <Combobox
                  items={categorias}
                  value={it.categoria_id}
                  onChange={(id: string) => {
                    const nome = categorias.find((c) => c.id === id)?.label || "";
                    updItem(idx, { categoria_id: id, categoria_nome: nome });
                  }}
                  placeholder="Selecione a categoria"
                />
              </div>
              <div className="col-span-4">
                <Label>Valor</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={it.valor as number}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updItem(idx, { valor: Number(e.target.value || 0) })
                  }
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button variant="ghost" size="icon" onClick={() => delItem(idx)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <div>
            <Button type="button" variant="outline" className="gap-2" onClick={addItem}>
              <Plus className="h-4 w-4" /> Adicionar rateio
            </Button>
          </div>

          <div className="rounded-md bg-muted px-3 py-2 text-sm flex items-center justify-between">
            <span>
              Total rateado: <strong>{formatCurrencyBRL(soma)}</strong>
            </span>
            <span>
              Restante:{" "}
              <strong className={restante === 0 ? "text-emerald-700" : "text-amber-700"}>
                {formatCurrencyBRL(restante)}
              </strong>
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={() => onOpenChange(false)} className="bg-emerald-600 hover:bg-emerald-700">
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
