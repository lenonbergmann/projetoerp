"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { useRouter, useParams } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";

import {
  Building2,
  WalletCards,
  PlugZap,
  FileText,
  Receipt,
  PhoneCall,
  History as HistoryIcon,
  Shuffle,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* ======================= Tipos gerais ======================= */

type EmpresaBPO = {
  codigo_erp: number;
  nome_fantasia: string | null;
};

type ContaRecord = {
  Id: string | number;
  Tipo: string | null;
  Banco: string | null;
  Agencia: number | null;
  Conta: string | null;
  Apelido: string | null;
  Loja: number | null;
  saldo_inicial: string | null;       // text
  data_saldo_inicial: string | null;  // text YYYY-MM-DD
  considerar_fluxo: boolean | null;
  empresabpo: number | null;
  Status: string | null;
  Inclusao: string | null;
  pix_chave: string | null;
};

type FormState = {
  tipo: string;
  banco: string;
  agencia: string;
  conta: string;
  apelido: string;
  loja: string;
  saldoInicial: string;
  dataSaldoInicial: string;
  considerarFluxo: boolean;
  empresabpo: string;
  status: string;     // "Ativo" | "Inativo"
  pix_chave: string;
};

/* ======================= Tipos Conciliação ======================= */

type ConciliacaoTipo = "receita" | "despesa" | "transferencia";

type ConciliacaoRecord = {
  id: number;
  conta_id: number;
  tipo: ConciliacaoTipo | string;
  descricao_extrato: string | null;
  plano_contas_id: string | null;
  cliente_fornecedor_id: number | null;
  banco_destino_id: number | null;
};

type ConciliacaoFormState = {
  id?: number;
  tipo: ConciliacaoTipo | "";
  descricao_extrato: string;
  plano_contas_id: string;
  cliente_fornecedor_id: string;
  banco_destino_id: string;
};

type PlanoConta = {
  id: string;
  nome: string;
  plano_tipo: string; // RECEITA / DESPESA / ...
};

type ClienteFornecedor = {
  id: number;
  nome: string;
};

type ContaBancariaResumo = {
  id: number;
  apelido: string | null;
  banco: string | null;
};

/* ======================= Tipos Histórico ======================= */

type AuditRecord = {
  audit_id: number;
  conta_id: number | null;
  action: string;
  changed_at: string;
  changed_by: string | null;
  row_old: any | null;
  row_new: any | null;
  changed_diff: any | null;
};

type ContaMeta = {
  created_at: string | null;
  created_by: string | null;
};

/* ======================= Helpers ======================= */

function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatAcao(action: string) {
  const a = (action || "").toUpperCase();
  if (a === "INSERT") return "Criação";
  if (a === "UPDATE") return "Alteração";
  if (a === "DELETE") return "Exclusão";
  return action;
}

function resumoCampos(diff: any): string {
  if (!diff || typeof diff !== "object") return "—";
  const keys = Object.keys(diff);
  if (!keys.length) return "—";
  const principais = keys.slice(0, 3);
  let label = "Campos alterados: " + principais.join(", ");
  if (keys.length > 3) {
    label += ` (+${keys.length - 3} campo(s))`;
  }
  return label;
}

/* ======================= Página ======================= */

export default function EditContaBancariaPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const paramId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const contaId = Number(paramId ?? NaN);

  const supabase = createClientComponentClient();

  const [empresas, setEmpresas] = useState<EmpresaBPO[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    tipo: "",
    banco: "",
    agencia: "",
    conta: "",
    apelido: "",
    loja: "",
    saldoInicial: "",
    dataSaldoInicial: "",
    considerarFluxo: true,
    empresabpo: "",
    status: "Ativo",
    pix_chave: "",
  });

  const [empresaCodigo, setEmpresaCodigo] = useState<number | null>(null);

  const [contaMeta, setContaMeta] = useState<ContaMeta>({
    created_at: null,
    created_by: null,
  });

  /* =================== ESTADO CONCILIAÇÃO =================== */

  const [conciliacoes, setConciliacoes] = useState<ConciliacaoRecord[]>([]);
  const [loadingConciliacoes, setLoadingConciliacoes] = useState(false);
  const [conciliacaoError, setConciliacaoError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [concForm, setConcForm] = useState<ConciliacaoFormState>({
    id: undefined,
    tipo: "",
    descricao_extrato: "",
    plano_contas_id: "",
    cliente_fornecedor_id: "",
    banco_destino_id: "",
  });

  const [planosReceita, setPlanosReceita] = useState<PlanoConta[]>([]);
  const [planosDespesa, setPlanosDespesa] = useState<PlanoConta[]>([]);
  const [clientesCF, setClientesCF] = useState<ClienteFornecedor[]>([]);
  const [contasEmpresa, setContasEmpresa] = useState<ContaBancariaResumo[]>([]);

  /* =================== ESTADO HISTÓRICO =================== */

  const [historico, setHistorico] = useState<AuditRecord[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [historicoError, setHistoricoError] = useState<string | null>(null);

  /* =================== LOAD EMPRESAS =================== */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingEmpresas(true);
      const { data, error } = await supabase
        .from("empresas_bpo")
        .select("codigo_erp, nome_fantasia")
        .order("nome_fantasia", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error(error);
        setErrorMsg(`Falha ao carregar empresas: ${error.message}`);
      } else {
        setEmpresas((data ?? []) as EmpresaBPO[]);
      }
      setLoadingEmpresas(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  /* =================== LOAD CONTA =================== */

  useEffect(() => {
    let cancelled = false;

    if (!Number.isFinite(contaId)) {
      setErrorMsg("Conta bancária não encontrada (ID inválido).");
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("contas_bancarias")
        .select(
          "Id, Tipo, Banco, Agencia, Conta, Apelido, Loja, saldo_inicial, data_saldo_inicial, considerar_fluxo, empresabpo, Status, Inclusao, pix_chave, created_at, created_by"
        )
        .eq("Id", contaId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error(error);
        setErrorMsg(`Falha ao carregar conta bancária: ${error.message}`);
        setLoading(false);
        return;
      }
      if (!data) {
        setErrorMsg(
          "Conta bancária não encontrada (verifique o Id e as permissões de acesso)."
        );
        setLoading(false);
        return;
      }

      const c = data as ContaRecord;

      const rawStatus = (c as any).Status ?? "Ativo";
      const normalizedStatus =
        rawStatus.toLowerCase() === "ativa"
          ? "Ativo"
          : rawStatus.toLowerCase() === "inativa"
          ? "Inativo"
          : rawStatus;

      setForm({
        tipo: c.Tipo ?? "",
        banco: c.Banco ?? "",
        agencia: c.Agencia != null ? String(c.Agencia) : "",
        conta: c.Conta ?? "",
        apelido: c.Apelido ?? "",
        loja: c.Loja != null ? String(c.Loja) : "",
        saldoInicial: c.saldo_inicial ?? "",
        dataSaldoInicial: c.data_saldo_inicial ?? "",
        considerarFluxo: !!c.considerar_fluxo,
        empresabpo: c.empresabpo != null ? String(c.empresabpo) : "",
        status: normalizedStatus,
        pix_chave: c.pix_chave ?? "",
      });

      setEmpresaCodigo(c.empresabpo != null ? Number(c.empresabpo) : null);

      // meta para histórico (caso não haja INSERT na audit)
      setContaMeta({
        created_at: (data as any).created_at ?? null,
        created_by: (data as any).created_by ?? null,
      });

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, contaId]);

  /* =================== LOAD APOIO CONCILIAÇÃO =================== */

  useEffect(() => {
    let cancelled = false;

    async function loadConciliacaoAux() {
      if (!empresaCodigo) return;

      try {
        const { data: pr, error: errPr } = await supabase
          .from("plano_contas")
          .select("id, nome, plano_tipo")
          .eq("empresa_codigo_erp", empresaCodigo)
          .eq("plano_tipo", "RECEITA");

        if (!cancelled && !errPr && pr) {
          setPlanosReceita(
            (pr as any[]).map((r) => ({
              id: String(r.id),
              nome: r.nome ?? "",
              plano_tipo: r.plano_tipo ?? "",
            }))
          );
        }

        const { data: pd, error: errPd } = await supabase
          .from("plano_contas")
          .select("id, nome, plano_tipo")
          .eq("empresa_codigo_erp", empresaCodigo)
          .eq("plano_tipo", "DESPESA");

        if (!cancelled && !errPd && pd) {
          setPlanosDespesa(
            (pd as any[]).map((r) => ({
              id: String(r.id),
              nome: r.nome ?? "",
              plano_tipo: r.plano_tipo ?? "",
            }))
          );
        }

        const { data: cf, error: errCf } = await supabase
          .from("clientes_fornecedores")
          .select("id, nome")
          .order("nome", { ascending: true });

        if (!cancelled && !errCf && cf) {
          setClientesCF(
            (cf as any[]).map((r) => ({
              id: Number(r.id),
              nome: r.nome ?? "",
            }))
          );
        }

        const { data: cb, error: errCb } = await supabase
          .from("contas_bancarias")
          .select("Id, Apelido, Banco, empresabpo")
          .eq("empresabpo", empresaCodigo);

        if (!cancelled && !errCb && cb) {
          setContasEmpresa(
            (cb as any[]).map((r) => ({
              id: Number(r.Id),
              apelido: r.Apelido ?? null,
              banco: r.Banco ?? null,
            }))
          );
        }
      } catch (e) {
        console.error(e);
      }
    }

    loadConciliacaoAux();

    return () => {
      cancelled = true;
    };
  }, [empresaCodigo, supabase]);

  /* =================== LOAD CONCILIAÇÕES =================== */

  useEffect(() => {
    let cancelled = false;

    async function loadConciliacoes() {
      if (!Number.isFinite(contaId)) return;

      setLoadingConciliacoes(true);
      setConciliacaoError(null);

      try {
        const { data, error } = await supabase
          .from("contas_bancarias_conciliacoes")
          .select(
            "id, conta_id, tipo, descricao_extrato, plano_contas_id, cliente_fornecedor_id, banco_destino_id"
          )
          .eq("conta_id", contaId)
          .order("id", { ascending: true });

        if (cancelled) return;

        if (error) {
          console.error(error);
          setConciliacaoError(
            "Tabela de conciliações ainda não configurada no banco de dados."
          );
          setConciliacoes([]);
        } else {
          setConciliacoes((data ?? []) as ConciliacaoRecord[]);
        }
      } catch (e: any) {
        if (cancelled) return;
        console.error(e);
        setConciliacaoError(
          e?.message ?? "Falha ao carregar conciliações."
        );
        setConciliacoes([]);
      } finally {
        if (!cancelled) setLoadingConciliacoes(false);
      }
    }

    loadConciliacoes();

    return () => {
      cancelled = true;
    };
  }, [supabase, contaId]);

  /* =================== LOAD HISTÓRICO =================== */

  useEffect(() => {
    let cancelled = false;

    async function loadHistorico() {
      if (!Number.isFinite(contaId)) return;

      setLoadingHistorico(true);
      setHistoricoError(null);

      try {
        const { data, error } = await supabase
          .from("contas_bancarias_audit")
          .select(
            "audit_id, conta_id, action, changed_at, changed_by, row_old, row_new, changed_diff"
          )
          .eq("conta_id", contaId)
          .order("changed_at", { ascending: false });

        if (cancelled) return;

        if (error) {
          console.error(error);
          setHistoricoError(
            "Tabela de histórico ainda não configurada para contas bancárias."
          );
          setHistorico([]);
        } else {
          setHistorico((data ?? []) as AuditRecord[]);
        }
      } catch (e: any) {
        if (cancelled) return;
        console.error(e);
        setHistoricoError(
          e?.message ?? "Falha ao carregar histórico."
        );
        setHistorico([]);
      } finally {
        if (!cancelled) setLoadingHistorico(false);
      }
    }

    loadHistorico();

    return () => {
      cancelled = true;
    };
  }, [supabase, contaId]);

  /* =================== HELPERS GERAIS =================== */

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const canSubmit = useMemo(() => {
    return (
      !!form.banco.trim() &&
      !!form.apelido.trim() &&
      !!form.empresabpo.trim() &&
      !saving &&
      !loading
    );
  }, [form, saving, loading]);

  const isAtiva = (form.status ?? "").toLowerCase() === "ativo";

  const eventoCriacao = useMemo(() => {
    const inserts = historico.filter(
      (h) => (h.action || "").toUpperCase() === "INSERT"
    );
    if (!inserts.length) return null;
    return inserts.reduce((prev, curr) =>
      new Date(curr.changed_at) < new Date(prev.changed_at) ? curr : prev
    );
  }, [historico]);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!canSubmit) return;

    if (!Number.isFinite(contaId)) {
      setErrorMsg("ID inválido; não é possível salvar.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const row: Record<string, any> = {
        Tipo: form.tipo.trim() || null,
        Banco: form.banco.trim() || null,
        Agencia: form.agencia ? Number(form.agencia) : null,
        Conta: form.conta.trim() || null,
        Apelido: form.apelido.trim() || null,
        Loja: form.loja ? Number(form.loja) : null,
        saldo_inicial: form.saldoInicial.trim() || null,
        data_saldo_inicial: form.dataSaldoInicial || null,
        considerar_fluxo: !!form.considerarFluxo,
        empresabpo: form.empresabpo ? Number(form.empresabpo) : null,
        Status: form.status?.trim() || "Ativo",
        pix_chave: form.pix_chave.trim() || null,
      };

      const { error } = await supabase
        .from("contas_bancarias")
        .update(row)
        .eq("Id", contaId);

      if (error) {
        console.error(error);
        setErrorMsg(`Falha ao salvar: ${error.message}`);
        setSaving(false);
        return;
      }

      router.replace("/cadastro/contas-bancarias");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message ?? "Erro inesperado ao salvar.");
      setSaving(false);
    }
  }

  /* =================== HELPERS CONCILIAÇÃO =================== */

  function resetConcForm(tipo: ConciliacaoTipo | "" = "") {
    setConcForm({
      id: undefined,
      tipo,
      descricao_extrato: "",
      plano_contas_id: "",
      cliente_fornecedor_id: "",
      banco_destino_id: "",
    });
  }

  function openNovaConciliacao(tipo?: ConciliacaoTipo) {
    resetConcForm(tipo ?? "");
    setDialogOpen(true);
  }

  function editarConciliacao(c: ConciliacaoRecord) {
    setConcForm({
      id: c.id,
      tipo: (c.tipo as ConciliacaoTipo) ?? "",
      descricao_extrato: c.descricao_extrato ?? "",
      plano_contas_id: c.plano_contas_id ?? "",
      cliente_fornecedor_id: c.cliente_fornecedor_id
        ? String(c.cliente_fornecedor_id)
        : "",
      banco_destino_id: c.banco_destino_id
        ? String(c.banco_destino_id)
        : "",
    });
    setDialogOpen(true);
  }

  async function salvarConciliacao() {
    if (!Number.isFinite(contaId)) {
      setConciliacaoError("ID da conta bancária inválido.");
      return;
    }

    if (!concForm.tipo) {
      setConciliacaoError("Selecione o tipo de conciliação.");
      return;
    }

    if (!concForm.descricao_extrato.trim()) {
      setConciliacaoError("Informe a descrição do extrato.");
      return;
    }

    if (concForm.tipo === "receita" || concForm.tipo === "despesa") {
      if (!concForm.plano_contas_id) {
        setConciliacaoError("Selecione o plano de contas.");
        return;
      }
      if (!concForm.cliente_fornecedor_id) {
        setConciliacaoError("Selecione o cliente/fornecedor.");
        return;
      }
    }

    if (concForm.tipo === "transferencia") {
      if (!concForm.cliente_fornecedor_id) {
        setConciliacaoError("Selecione o cliente/fornecedor.");
        return;
      }
      if (!concForm.banco_destino_id) {
        setConciliacaoError("Selecione o banco destino.");
        return;
      }
    }

    setConciliacaoError(null);

    const payload = {
      conta_id: contaId,
      tipo: concForm.tipo,
      descricao_extrato: concForm.descricao_extrato.trim(),
      plano_contas_id:
        concForm.tipo === "transferencia" ? null : concForm.plano_contas_id || null,
      cliente_fornecedor_id: concForm.cliente_fornecedor_id
        ? Number(concForm.cliente_fornecedor_id)
        : null,
      banco_destino_id:
        concForm.tipo === "transferencia" && concForm.banco_destino_id
          ? Number(concForm.banco_destino_id)
          : null,
    };

    try {
      if (concForm.id) {
        const { error } = await supabase
          .from("contas_bancarias_conciliacoes")
          .update(payload)
          .eq("id", concForm.id);

        if (error) {
          console.error(error);
          setConciliacaoError(`Falha ao salvar conciliação: ${error.message}`);
          return;
        }

        setConciliacoes((prev) =>
          prev.map((c) =>
            c.id === concForm.id
              ? { ...c, ...payload }
              : c
          )
        );
      } else {
        const { data, error } = await supabase
          .from("contas_bancarias_conciliacoes")
          .insert(payload)
          .select(
            "id, conta_id, tipo, descricao_extrato, plano_contas_id, cliente_fornecedor_id, banco_destino_id"
          )
          .single();

        if (error) {
          console.error(error);
          setConciliacaoError(`Falha ao inserir conciliação: ${error.message}`);
          return;
        }

        if (data) {
          setConciliacoes((prev) => [
            ...prev,
            data as ConciliacaoRecord,
          ]);
        }
      }

      setDialogOpen(false);
      resetConcForm("");
    } catch (e: any) {
      console.error(e);
      setConciliacaoError(e?.message ?? "Erro inesperado ao salvar conciliação.");
    }
  }

  async function excluirConciliacao(idConc: number) {
    if (!confirm("Deseja realmente excluir esta conciliação?")) return;

    try {
      const { error } = await supabase
        .from("contas_bancarias_conciliacoes")
        .delete()
        .eq("id", idConc);

      if (error) {
        console.error(error);
        alert("Falha ao excluir conciliação: " + error.message);
        return;
      }

      setConciliacoes((prev) => prev.filter((c) => c.id !== idConc));
    } catch (e: any) {
      console.error(e);
      alert("Erro inesperado ao excluir conciliação.");
    }
  }

  const planosDisponiveis =
    concForm.tipo === "receita"
      ? planosReceita
      : concForm.tipo === "despesa"
      ? planosDespesa
      : [];

  function getNomePlano(idPlano: string | null) {
    if (!idPlano) return "";
    const all = [...planosReceita, ...planosDespesa];
    return all.find((p) => p.id === String(idPlano))?.nome ?? "";
  }

  function getNomeCliente(idCliente: number | null) {
    if (!idCliente) return "";
    return clientesCF.find((c) => c.id === idCliente)?.nome ?? "";
  }

  function getNomeContaDestino(idDestino: number | null) {
    if (!idDestino) return "";
    const c = contasEmpresa.find((c) => c.id === idDestino);
    if (!c) return "";
    return `${c.banco ?? ""} - ${c.apelido ?? ""}`.trim();
  }

  /* =================== UI =================== */

  if (loading) {
    return (
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="flex flex-col gap-2">
            <div className="h-7 w-56 rounded bg-muted animate-pulse" />
            <div className="h-4 w-80 rounded bg-muted animate-pulse" />
          </div>
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Carregando dados da conta bancária…
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cabeçalho */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                  <WalletCards className="h-3 w-3" />
                  Contas bancárias
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="font-mono text-[11px]">
                  ID: {paramId || "?"}
                </span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Editar conta bancária
              </h1>
              <p className="text-sm text-muted-foreground">
                Ajuste as informações da conta utilizada para conciliação,
                pagamentos e fluxo de caixa.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge
                  variant={isAtiva ? "default" : "outline"}
                  className="gap-1"
                >
                  <span
                    className={
                      isAtiva
                        ? "h-2 w-2 rounded-full bg-emerald-500"
                        : "h-2 w-2 rounded-full bg-slate-400"
                    }
                  />
                  {isAtiva ? "Ativa" : "Inativa"}
                </Badge>
                {form.empresabpo && (
                  <Badge variant="outline" className="gap-1">
                    <Building2 className="h-3 w-3" />
                    Empresa BPO #{form.empresabpo}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => router.replace("/cadastro/contas-bancarias")}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="rounded-xl"
                disabled={!canSubmit}
              >
                {saving ? "Salvando…" : "Salvar alterações"}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Tabs principais */}
          <Tabs defaultValue="dados" className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto rounded-2xl bg-muted/40 p-1">
              <TabsTrigger value="dados" className="gap-2">
                <WalletCards className="h-4 w-4" />
                Dados
              </TabsTrigger>

              <TabsTrigger value="conciliacao" className="gap-2">
                <Shuffle className="h-4 w-4" />
                Conciliação
              </TabsTrigger>

              <TabsTrigger value="integracoes" className="gap-2">
                <PlugZap className="h-4 w-4" />
                Integrações
              </TabsTrigger>
              <TabsTrigger value="pagamentos" className="gap-2">
                <FileText className="h-4 w-4" />
                Pagamentos & CNAB
              </TabsTrigger>
              <TabsTrigger value="boletos" className="gap-2">
                <Receipt className="h-4 w-4" />
                Boletos
              </TabsTrigger>
              <TabsTrigger value="contatos" className="gap-2">
                <PhoneCall className="h-4 w-4" />
                Contatos
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2">
                <HistoryIcon className="h-4 w-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            {/* TAB: DADOS */}
            <TabsContent value="dados" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Dados principais</CardTitle>
                  <CardDescription>
                    Informações básicas da conta bancária e vínculo com a
                    empresa BPO.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Empresa BPO + Tipo + Status */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">
                        Empresa BPO *
                      </Label>
                      {loadingEmpresas ? (
                        <div className="text-xs text-muted-foreground">
                          Carregando empresas…
                        </div>
                      ) : (
                        <select
                          className="h-9 w-full rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          value={form.empresabpo}
                          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                            onChange("empresabpo", e.target.value);
                            setEmpresaCodigo(
                              e.target.value
                                ? Number(e.target.value)
                                : null
                            );
                          }}
                          required
                        >
                          <option value="">Selecione a empresa</option>
                          {empresas.map((emp) => (
                            <option
                              key={emp.codigo_erp}
                              value={emp.codigo_erp}
                            >
                              {emp.nome_fantasia ?? emp.codigo_erp}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">
                        Tipo de conta
                      </Label>
                      <select
                        className="h-9 w-full rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={form.tipo}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                          onChange("tipo", e.target.value)
                        }
                      >
                        <option value="">Selecione</option>
                        <option value="Corrente">Conta corrente</option>
                        <option value="Investimento">Conta investimento</option>
                        <option value="Capital">Conta capital</option>
                        <option value="Operadora">Operadora de cartão</option>
                        <option value="Pagamento">
                          Conta de pagamento
                        </option>
                        <option value="Aplicacao">Aplicação</option>
                        <option value="Adiantamento">Adiantamento</option>
                        <option value="Caixa">Caixa</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Status</Label>
                      <div className="flex h-9 items-center justify-between rounded-xl border bg-background px-3">
                        <span className="text-xs text-muted-foreground">
                          {isAtiva ? "Conta ativa" : "Conta inativa"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">
                            {isAtiva ? "Ativo" : "Inativo"}
                          </span>
                          <Switch
                            checked={isAtiva}
                            onCheckedChange={(checked) =>
                              onChange("status", checked ? "Ativo" : "Inativo")
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  {/* Banco + Agência + Conta + Loja */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs font-medium">
                        Banco *
                      </Label>
                      <Input
                        value={form.banco}
                        onChange={(e) => onChange("banco", e.target.value)}
                        placeholder="Ex.: Itaú, Sicoob…"
                        className="rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Agência</Label>
                      <Input
                        value={form.agencia}
                        onChange={(e) =>
                          onChange(
                            "agencia",
                            e.target.value.replace(/\D/g, "")
                          )
                        }
                        inputMode="numeric"
                        placeholder="0001"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Conta</Label>
                      <Input
                        value={form.conta}
                        onChange={(e) => onChange("conta", e.target.value)}
                        placeholder="12345-6"
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs font-medium">
                        Apelido da conta *
                      </Label>
                      <Input
                        value={form.apelido}
                        onChange={(e) => onChange("apelido", e.target.value)}
                        placeholder="Ex.: Itaú Matriz, Sicoob Loja 1"
                        className="rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">
                        Loja (opcional)
                      </Label>
                      <Input
                        value={form.loja}
                        onChange={(e) =>
                          onChange("loja", e.target.value.replace(/\D/g, ""))
                        }
                        inputMode="numeric"
                        placeholder="Número da loja"
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <Separator className="my-2" />

                  {/* PIX + saldo inicial */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Chave PIX</Label>
                      <Input
                        value={form.pix_chave}
                        onChange={(e) =>
                          onChange("pix_chave", e.target.value)
                        }
                        placeholder="CPF/CNPJ, e-mail, telefone ou aleatória"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          Saldo inicial
                        </Label>
                        <Input
                          value={form.saldoInicial}
                          onChange={(e) =>
                            onChange("saldoInicial", e.target.value)
                          }
                          inputMode="decimal"
                          placeholder="Ex.: 1500,00"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          Data do saldo inicial
                        </Label>
                        <Input
                          type="date"
                          value={form.dataSaldoInicial}
                          onChange={(e) =>
                            onChange("dataSaldoInicial", e.target.value)
                          }
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Considerar no fluxo */}
                  <div className="mt-2 flex items-center justify-between rounded-xl border bg-muted/40 px-3 py-2.5">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-medium">
                        Considerar no Fluxo de Caixa
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Quando ativo, essa conta entra nos dashboards e
                        relatórios de fluxo de caixa.
                      </p>
                    </div>
                    <Switch
                      checked={form.considerarFluxo}
                      onCheckedChange={(checked) =>
                        onChange("considerarFluxo", checked)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: CONCILIAÇÃO */}
            <TabsContent value="conciliacao">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shuffle className="h-4 w-4" />
                      Regras de conciliação
                    </CardTitle>
                    <CardDescription>
                      Defina como o extrato dessa conta será interpretado:
                      receitas, despesas e transferências.
                    </CardDescription>
                  </div>

                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => openNovaConciliacao()}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Inserir nova conciliação
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="text-base">
                          {concForm.id
                            ? "Editar conciliação"
                            : "Nova conciliação"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                          Configure como um lançamento de extrato será
                          interpretado e classificado.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-3 py-2">
                        {/* Tipo */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">
                            Tipo
                          </Label>
                          <select
                            className="h-9 w-full rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            value={concForm.tipo}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                              setConcForm((prev) => ({
                                ...prev,
                                tipo: e.target.value as ConciliacaoTipo,
                                plano_contas_id: "",
                                banco_destino_id: "",
                              }))
                            }
                          >
                            <option value="">Selecione</option>
                            <option value="receita">Receita</option>
                            <option value="despesa">Despesa</option>
                            <option value="transferencia">
                              Transferência
                            </option>
                          </select>
                        </div>

                        {/* Descrição do extrato */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">
                            Descrição do extrato
                          </Label>
                          <Input
                            value={concForm.descricao_extrato}
                            onChange={(e) =>
                              setConcForm((prev) => ({
                                ...prev,
                                descricao_extrato: e.target.value,
                              }))
                            }
                            placeholder="Texto (ou parte) que aparece no extrato"
                            className="rounded-xl"
                          />
                        </div>

                        {/* Condicionais por tipo */}
                        {concForm.tipo === "receita" && (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">
                                Plano de contas (Receita)
                              </Label>
                              <select
                                className="h-9 w-full rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={concForm.plano_contas_id}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                  setConcForm((prev) => ({
                                    ...prev,
                                    plano_contas_id: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Selecione</option>
                                {planosReceita.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.nome}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-medium">
                                Cliente / Fornecedor
                              </Label>
                              <select
                                className="h-9 w-full rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={concForm.cliente_fornecedor_id}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                  setConcForm((prev) => ({
                                    ...prev,
                                    cliente_fornecedor_id: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Selecione</option>
                                {clientesCF.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.nome}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}

                        {concForm.tipo === "despesa" && (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">
                                Plano de contas (Despesa)
                              </Label>
                              <select
                                className="h-9 w-full rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={concForm.plano_contas_id}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                  setConcForm((prev) => ({
                                    ...prev,
                                    plano_contas_id: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Selecione</option>
                                {planosDespesa.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.nome}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-medium">
                                Cliente / Fornecedor
                              </Label>
                              <select
                                className="h-9 w-full rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={concForm.cliente_fornecedor_id}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                  setConcForm((prev) => ({
                                    ...prev,
                                    cliente_fornecedor_id: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Selecione</option>
                                {clientesCF.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.nome}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}

                        {concForm.tipo === "transferencia" && (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">
                                Cliente / Fornecedor
                              </Label>
                              <select
                                className="h-9 w-full rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={concForm.cliente_fornecedor_id}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                  setConcForm((prev) => ({
                                    ...prev,
                                    cliente_fornecedor_id: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Selecione</option>
                                {clientesCF.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.nome}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-medium">
                                Banco destino
                              </Label>
                              <select
                                className="h-9 w-full rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={concForm.banco_destino_id}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                  setConcForm((prev) => ({
                                    ...prev,
                                    banco_destino_id: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Selecione</option>
                                {contasEmpresa.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.banco ?? ""} - {c.apelido ?? ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}

                        {conciliacaoError && (
                          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
                            {conciliacaoError}
                          </div>
                        )}
                      </div>

                      <DialogFooter className="mt-2 flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => setDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-xl"
                          onClick={salvarConciliacao}
                        >
                          {concForm.id ? "Salvar alterações" : "Salvar"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>

                <CardContent className="space-y-3">
                  {conciliacoes.length === 0 && !loadingConciliacoes ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma conciliação cadastrada para esta conta.
                    </p>
                  ) : null}

                  {loadingConciliacoes && (
                    <p className="text-xs text-muted-foreground">
                      Carregando conciliações…
                    </p>
                  )}

                  {conciliacaoError && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      {conciliacaoError}
                    </p>
                  )}

                  {conciliacoes.length > 0 && (
                    <div className="overflow-hidden rounded-xl border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[120px]">
                              Tipo
                            </TableHead>
                            <TableHead>Descrição do extrato</TableHead>
                            <TableHead>Plano de contas</TableHead>
                            <TableHead>Cliente / Fornecedor</TableHead>
                            <TableHead>Banco destino</TableHead>
                            <TableHead className="w-[120px] text-right">
                              Ações
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {conciliacoes.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell className="text-xs font-medium uppercase">
                                {c.tipo}
                              </TableCell>
                              <TableCell className="text-sm">
                                {c.descricao_extrato ?? "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {getNomePlano(c.plano_contas_id) || "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {getNomeCliente(c.cliente_fornecedor_id) ||
                                  "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {getNomeContaDestino(c.banco_destino_id) ||
                                  "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="inline-flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-xl px-2 text-xs"
                                    onClick={() => editarConciliacao(c)}
                                  >
                                    <Pencil className="mr-1 h-3 w-3" />
                                    Editar
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-xl px-2 text-xs"
                                    onClick={() =>
                                      excluirConciliacao(c.id)
                                    }
                                  >
                                    <Trash2 className="mr-1 h-3 w-3" />
                                    Excluir
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: INTEGRAÇÕES */}
            <TabsContent value="integracoes">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PlugZap className="h-4 w-4" />
                    Integrações com o banco
                  </CardTitle>
                  <CardDescription>
                    Configure aqui futuros conectores diretos (API) com o banco
                    para extratos, saldos, webhooks, etc.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Nesta aba vamos centralizar todas as integrações possíveis
                    com a instituição financeira desta conta, por exemplo:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Integração de extrato em tempo real / via API;</li>
                    <li>Webhooks para avisos de crédito/débito;</li>
                    <li>
                      Tokens, Client ID/Secret e credenciais de acesso
                      segregadas por conta;
                    </li>
                    <li>Configuração de ambiente (produção x homologação).</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: PAGAMENTOS & CNAB */}
            <TabsContent value="pagamentos">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Pagamentos & CNAB
                  </CardTitle>
                  <CardDescription>
                    Parâmetros para remessa bancária, CNAB, DDA e automação do
                    contas a pagar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Aqui ficarão as configurações relacionadas a pagamentos
                    via CNAB e automações, como:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Layout CNAB (240/400) por banco/convênio;</li>
                    <li>Números de convênio, carteira, variação;</li>
                    <li>
                      Configurações de DDA: importação automática, conciliação
                      com o contas a pagar;
                    </li>
                    <li>
                      Regras de atualização de status de títulos após retorno
                      CNAB.
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: BOLETOS */}
            <TabsContent value="boletos">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Emissão de boletos
                  </CardTitle>
                  <CardDescription>
                    Ative e configure a emissão de boletos bancários nesta
                    conta.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Nesta aba vamos ter um toggle principal “Permitir emissão de
                    boletos nesta conta”. Quando ligado, abrirão campos como:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Tipo de carteira / modalidade;</li>
                    <li>
                      Instruções padrão (juros, multa, protesto, baixa
                      automática);
                    </li>
                    <li>Espécie de documento, aceite, lugar de pagamento;</li>
                    <li>Logo e dados do cedente para o boleto.</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: CONTATOS */}
            <TabsContent value="contatos">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PhoneCall className="h-4 w-4" />
                    Contatos da conta
                  </CardTitle>
                  <CardDescription>
                    Centralize os contatos do banco, gerente, operadora de
                    cartão e mesa de câmbio.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Nesta aba pretendemos guardar, para cada conta:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Gerente da conta: nome, telefone, e-mail;</li>
                    <li>
                      Gerente / executivo da operadora de cartão: nome, contato,
                      e-mail;
                    </li>
                    <li>
                      Mesa de câmbio: telefone direto, e-mail, observações.
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: HISTÓRICO */}
            <TabsContent value="historico">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <HistoryIcon className="h-4 w-4" />
                    Histórico de alterações
                  </CardTitle>
                  <CardDescription>
                    Log completo de quem criou a conta, alterações de dados e
                    mudanças de status.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  {/* Bloco de criação */}
                  {(contaMeta.created_at || contaMeta.created_by || eventoCriacao) && (
                    <div className="rounded-xl border bg-muted/40 px-3 py-2 text-xs text-foreground">
                      <div className="mb-0.5 font-medium">
                        Criação da conta
                      </div>
                      <div>
                        {eventoCriacao ? (
                          <>
                            Criada em{" "}
                            <span className="font-mono">
                              {formatDateTime(eventoCriacao.changed_at)}
                            </span>
                          </>
                        ) : contaMeta.created_at ? (
                          <>
                            Criada em{" "}
                            <span className="font-mono">
                              {formatDateTime(contaMeta.created_at)}
                            </span>
                          </>
                        ) : (
                          "Data de criação não disponível."
                        )}
                      </div>
                      <div>
                        Usuário:{" "}
                        <span className="font-mono">
                          {eventoCriacao?.changed_by ??
                            contaMeta.created_by ??
                            "Não identificado"}
                        </span>
                      </div>
                    </div>
                  )}

                  {loadingHistorico && (
                    <p className="text-xs text-muted-foreground">
                      Carregando histórico de alterações…
                    </p>
                  )}

                  {historicoError && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      {historicoError}
                    </p>
                  )}

                  {historico.length === 0 &&
                    !loadingHistorico &&
                    !historicoError && (
                      <p className="text-xs text-muted-foreground">
                        Nenhuma alteração registrada para esta conta ainda.
                      </p>
                    )}

                  {historico.length > 0 && (
                    <div className="overflow-hidden rounded-xl border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[160px]">
                              Data / hora
                            </TableHead>
                            <TableHead className="w-[100px]">
                              Ação
                            </TableHead>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Resumo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {historico.map((h) => (
                            <TableRow key={h.audit_id}>
                              <TableCell className="font-mono text-xs">
                                {formatDateTime(h.changed_at)}
                              </TableCell>
                              <TableCell className="text-xs">
                                {formatAcao(h.action)}
                              </TableCell>
                              <TableCell className="text-xs">
                                {h.changed_by ?? "Não informado"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {resumoCampos(h.changed_diff)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Mensagens de erro */}
          {errorMsg && (
            <Card className="border-red-300 bg-red-50">
              <CardContent className="p-3 text-sm text-red-700">
                {errorMsg}
              </CardContent>
            </Card>
          )}

          {/* Botões finais */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => router.replace("/cadastro/contas-bancarias")}
            >
              Voltar sem salvar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="rounded-xl"
              disabled={!canSubmit}
            >
              {saving ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
