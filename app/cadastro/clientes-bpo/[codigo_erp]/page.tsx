// app/cadastro/clientes-bpo/[codigo_erp]/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import {
  ArrowLeft,
  Loader2,
  Building2,
  FileText,
  CreditCard,
  Shield,
  Settings2,
  ListChecks,
  History,
  Plus,
  X,
  ChevronDown,
  ImageIcon,
  Trash2,
} from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/* ========================================================================
 * Tipos
 * ====================================================================== */

const TABLE_NAME = "empresas_bpo" as const;
const LOGO_BUCKET = "empresas_bpo_logos"; // crie esse bucket no Supabase

type EmpresaRow = {
  codigo_erp: number;
  razao_social: string | null;
  nome_fantasia: string | null;
  cpf_cnpj: string | null;
  status: boolean | null;
  data_inicio: string | null; // ISO
  honorario_mensal: number | null;
  horas_mensais: number | null;
  valor_hora_adicional: number | null;
  administrador_delegado: string | null;
  emite_nfe_produtos: boolean | null;
  emite_nfe_servicos: boolean | null;
  emite_boletos: boolean | null;
  faz_importacao: boolean | null;
  faz_exportacao: boolean | null;
  faz_conciliacao_cartao: boolean | null;
  logo_url: string | null;
};

type EmpresaFormState = {
  codigo_erp: string;
  razao_social: string;
  nome_fantasia: string;
  cpf_cnpj: string;
  status: boolean;
  data_inicio: string; // yyyy-MM-dd
  honorario_mensal: string;
  horas_mensais: string;
  valor_hora_adicional: string;
  administrador_delegado: string;
  emite_nfe_produtos: boolean;
  emite_nfe_servicos: boolean;
  emite_boletos: boolean;
  faz_importacao: boolean;
  faz_exportacao: boolean;
  faz_conciliacao_cartao: boolean;
  logo_url: string;
};

type EmpresaSnapshot = {
  razao_social: string | null;
  nome_fantasia: string | null;
  cpf_cnpj: string | null;
  status: boolean | null;
  data_inicio: string | null;
  honorario_mensal: number | null;
  horas_mensais: number | null;
  valor_hora_adicional: number | null;
  administrador_delegado: string | null;
  emite_nfe_produtos: boolean;
  emite_nfe_servicos: boolean;
  emite_boletos: boolean;
  faz_importacao: boolean;
  faz_exportacao: boolean;
  faz_conciliacao_cartao: boolean;
};

type Filial = {
  id?: string;
  cnpj: string;
  apelido: string;
};

type Acesso = {
  id?: string;
  tipo: string;
  descricao: string;
  login: string;
  senha: string;
  url: string;
};

type Particularidade = {
  id?: string;
  titulo: string;
  texto: string;
};

type HistoricoAuditoriaRow = {
  id: string;
  campo: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  alterado_em: string; // ISO
  alterado_por: string | null;
  alterado_por_nome: string | null;
};

type IntegracoesState = {
  certificado_tipo: string;
  certificado_vencimento: string; // yyyy-MM-dd ou ""
  integracoes_descricao: string;
};

/* ========================================================================
 * Inputs / helpers visuais
 * ====================================================================== */

function InputField({
  label,
  id,
  hint,
  ...props
}: {
  label: string;
  id: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-neutral-800 dark:text-neutral-100"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        className="block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-100 dark:focus:ring-neutral-100"
        {...props}
      />
      {hint && (
        <p className="text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
          {hint}
        </p>
      )}
    </div>
  );
}

function TextAreaField({
  label,
  id,
  hint,
  ...props
}: {
  label: string;
  id: string;
  hint?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-neutral-800 dark:text-neutral-100"
      >
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        rows={4}
        className="block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-100 dark:focus:ring-neutral-100"
        {...props}
      />
      {hint && (
        <p className="text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Toggle 3D Sim/Não */
function Toggle3D({
  active,
  onClick,
  ariaLabel,
}: {
  active: boolean;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel ?? (active ? "Sim" : "Não")}
      className={[
        "relative inline-flex h-7 w-14 items-center rounded-full border transition-colors duration-200",
        "bg-gradient-to-b",
        active
          ? "from-emerald-300 to-emerald-500 border-emerald-500"
          : "from-rose-300 to-rose-500 border-rose-500",
        "shadow-md",
        active ? "shadow-emerald-500/50" : "shadow-rose-500/50",
        "hover:shadow-lg",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "absolute inset-0 rounded-full shadow-inner",
          active ? "shadow-emerald-900/30" : "shadow-rose-900/30",
        ].join(" ")}
      />
      <span
        aria-hidden="true"
        className={[
          "relative z-10 h-6 w-6 rounded-full bg-white",
          "transition-transform duration-200",
          "shadow-[0_2px_0_#0000000a,0_6px_12px_#00000040]",
          "border border-black/10",
        ].join(" ")}
        style={{
          transform: active ? "translateX(24px)" : "translateX(4px)",
        }}
      />
    </button>
  );
}

function YesNoRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-900">
      <span className="text-xs font-medium text-neutral-800 dark:text-neutral-100">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full border ${
            value
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700"
              : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-700"
          }`}
        >
          {value ? "Sim" : "Não"}
        </span>
        <Toggle3D active={value} onClick={() => onChange(!value)} />
      </div>
    </div>
  );
}

/* ========================================================================
 * Página
 * ====================================================================== */

export default function EditarEmpresaBPOPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const params = useParams<{ codigo_erp: string }>();
  const codigoFromUrl = params?.codigo_erp ?? "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("dados");

  const [formData, setFormData] = useState<EmpresaFormState | null>(null);
  const originalSnapshotRef = useRef<EmpresaSnapshot | null>(null);

  const [filiais, setFiliais] = useState<Filial[]>([]);
  const filiaisOrigRef = useRef<Filial[]>([]);

  const [acessos, setAcessos] = useState<Acesso[]>([]);
  const acessosOrigRef = useRef<Acesso[]>([]);

  const [particularidades, setParticularidades] = useState<Particularidade[]>(
    []
  );
  const partOrigRef = useRef<Particularidade[]>([]);
  const [openPart, setOpenPart] = useState<Record<number, boolean>>({});

  const [integracoes, setIntegracoes] = useState<IntegracoesState>({
    certificado_tipo: "",
    certificado_vencimento: "",
    integracoes_descricao: "",
  });
  const integOrigRef = useRef<IntegracoesState | null>(null);

  const [historico, setHistorico] = useState<HistoricoAuditoriaRow[]>([]);

  // Logo
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoRemoving, setLogoRemoving] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  /* --------------------- Helpers de carga --------------------- */

  const loadEmpresa = useCallback(async () => {
    if (!codigoFromUrl) {
      setErrorMsg("Código ERP inválido na URL.");
      setLoading(false);
      return;
    }

    const codigoNumeric = Number(codigoFromUrl);
    if (!Number.isFinite(codigoNumeric)) {
      setErrorMsg("Código ERP inválido na URL.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(
        `
        codigo_erp,
        razao_social,
        nome_fantasia,
        cpf_cnpj,
        status,
        data_inicio,
        honorario_mensal,
        horas_mensais,
        valor_hora_adicional,
        administrador_delegado,
        emite_nfe_produtos,
        emite_nfe_servicos,
        emite_boletos,
        faz_importacao,
        faz_exportacao,
        faz_conciliacao_cartao,
        logo_url
      `
      )
      .eq("codigo_erp", codigoNumeric)
      .single();

    if (error) {
      console.error("Erro ao buscar empresa:", error);
      setErrorMsg(
        `Não foi possível carregar os dados da empresa. Erro: ${error.message}`
      );
      setLoading(false);
      return;
    }

    const row = data as EmpresaRow;

    const dataInicio =
      row.data_inicio && typeof row.data_inicio === "string"
        ? row.data_inicio.slice(0, 10)
        : "";

    const honorarioStr =
      row.honorario_mensal != null ? String(row.honorario_mensal) : "";

    const horasMensaisStr =
      row.horas_mensais != null ? String(row.horas_mensais) : "";

    const valorHoraStr =
      row.valor_hora_adicional != null
        ? String(row.valor_hora_adicional)
        : "";

    setFormData({
      codigo_erp: String(row.codigo_erp),
      razao_social: row.razao_social ?? "",
      nome_fantasia: row.nome_fantasia ?? "",
      cpf_cnpj: row.cpf_cnpj ?? "",
      status: row.status == null ? true : Boolean(row.status),
      data_inicio: dataInicio,
      honorario_mensal: honorarioStr,
      horas_mensais: horasMensaisStr,
      valor_hora_adicional: valorHoraStr,
      administrador_delegado: row.administrador_delegado ?? "",
      emite_nfe_produtos: !!row.emite_nfe_produtos,
      emite_nfe_servicos: !!row.emite_nfe_servicos,
      emite_boletos: !!row.emite_boletos,
      faz_importacao: !!row.faz_importacao,
      faz_exportacao: !!row.faz_exportacao,
      faz_conciliacao_cartao: !!row.faz_conciliacao_cartao,
      logo_url: row.logo_url ?? "",
    });

    originalSnapshotRef.current = {
      razao_social: row.razao_social,
      nome_fantasia: row.nome_fantasia,
      cpf_cnpj: row.cpf_cnpj,
      status: row.status,
      data_inicio: dataInicio || null,
      honorario_mensal: row.honorario_mensal,
      horas_mensais: row.horas_mensais,
      valor_hora_adicional: row.valor_hora_adicional,
      administrador_delegado: row.administrador_delegado,
      emite_nfe_produtos: !!row.emite_nfe_produtos,
      emite_nfe_servicos: !!row.emite_nfe_servicos,
      emite_boletos: !!row.emite_boletos,
      faz_importacao: !!row.faz_importacao,
      faz_exportacao: !!row.faz_exportacao,
      faz_conciliacao_cartao: !!row.faz_conciliacao_cartao,
    };
  }, [codigoFromUrl, supabase]);

  const loadRelatedData = useCallback(
    async (codigoNumeric: number) => {
      // Filiais
      const filiaisRes = await supabase
        .from("empresas_bpo_filiais")
        .select("id, cnpj, apelido")
        .eq("empresa_codigo_erp", codigoNumeric)
        .order("apelido", { ascending: true });

      if (!filiaisRes.error && filiaisRes.data) {
        const mapped = filiaisRes.data.map((f) => ({
          id: f.id,
          cnpj: f.cnpj ?? "",
          apelido: f.apelido ?? "",
        }));
        setFiliais(mapped);
        filiaisOrigRef.current = mapped;
      }

      // Acessos
      const acessosRes = await supabase
        .from("empresas_bpo_acessos")
        .select("id, tipo, descricao, login, senha, url")
        .eq("empresa_codigo_erp", codigoNumeric)
        .order("created_at", { ascending: true });

      if (!acessosRes.error && acessosRes.data) {
        const mapped = acessosRes.data.map((a) => ({
          id: a.id,
          tipo: a.tipo ?? "",
          descricao: a.descricao ?? "",
          login: a.login ?? "",
          senha: a.senha ?? "",
          url: a.url ?? "",
        }));
        setAcessos(mapped);
        acessosOrigRef.current = mapped;
      }

      // Particularidades
      const partRes = await supabase
        .from("empresas_bpo_particularidades")
        .select("id, titulo, texto")
        .eq("empresa_codigo_erp", codigoNumeric)
        .order("created_at", { ascending: true });

      if (!partRes.error && partRes.data) {
        const mapped = partRes.data.map((p) => ({
          id: p.id,
          titulo: p.titulo ?? "",
          texto: p.texto ?? "",
        }));
        setParticularidades(mapped);
        partOrigRef.current = mapped;
      }

      // Integrações
      const integRes = await supabase
        .from("empresas_bpo_integracoes")
        .select("id, certificado_tipo, certificado_vencimento, integracoes_descricao")
        .eq("empresa_codigo_erp", codigoNumeric)
        .maybeSingle();

      if (!integRes.error && integRes.data) {
        const row = integRes.data;
        const novo: IntegracoesState = {
          certificado_tipo: row.certificado_tipo ?? "",
          certificado_vencimento: row.certificado_vencimento
            ? String(row.certificado_vencimento).slice(0, 10)
            : "",
          integracoes_descricao: row.integracoes_descricao ?? "",
        };
        setIntegracoes(novo);
        integOrigRef.current = novo;
      } else {
        const vazio: IntegracoesState = {
          certificado_tipo: "",
          certificado_vencimento: "",
          integracoes_descricao: "",
        };
        integOrigRef.current = vazio;
        setIntegracoes(vazio);
      }

      // Histórico de auditoria
      const histRes = await supabase
        .from("empresas_bpo_auditoria")
        .select(
          "id, campo, valor_anterior, valor_novo, alterado_em, alterado_por, alterado_por_nome"
        )
        .eq("empresa_codigo_erp", codigoNumeric)
        .order("alterado_em", { ascending: false });

      if (!histRes.error && histRes.data) {
        setHistorico(histRes.data as any);
      } else if (histRes.error) {
        console.error(
          "sync: erro ao carregar auditoria empresas_bpo:",
          histRes.error
        );
      }
    },
    [supabase]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorMsg(null);

      await loadEmpresa();

      const codigoNumeric = Number(codigoFromUrl);
      if (Number.isFinite(codigoNumeric)) {
        await loadRelatedData(codigoNumeric);
      }

      setLoading(false);
    })();
  }, [codigoFromUrl, loadEmpresa, loadRelatedData]);

  /* --------------------- Handlers gerais --------------------- */

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : prev));
  }

  /* ----- CRUD de listas (Filiais / Acessos / Particularidades) ----- */

  function addFilial() {
    setFiliais((prev) => [...prev, { cnpj: "", apelido: "" }]);
  }
  function updateFilial(index: number, field: keyof Filial, value: string) {
    setFiliais((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: value } : f))
    );
  }
  function removeFilial(index: number) {
    setFiliais((prev) => prev.filter((_, i) => i !== index));
  }

  function addAcesso() {
    setAcessos((prev) => [
      ...prev,
      { tipo: "", descricao: "", login: "", senha: "", url: "" },
    ]);
  }
  function updateAcesso(index: number, field: keyof Acesso, value: string) {
    setAcessos((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  }
  function removeAcesso(index: number) {
    setAcessos((prev) => prev.filter((_, i) => i !== index));
  }

  function addParticularidade() {
    setParticularidades((prev) => [...prev, { titulo: "", texto: "" }]);
  }
  function updateParticularidade(
    index: number,
    field: keyof Particularidade,
    value: string
  ) {
    setParticularidades((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  }
  function removeParticularidade(index: number) {
    setParticularidades((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleParticularidadeOpen(index: number) {
    setOpenPart((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }

  /* ----- Helpers de Auditoria ----- */

  async function getUserInfoForAuditoria() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id ?? null;
    const userName =
      (user?.user_metadata as any)?.full_name ?? user?.email ?? null;
    const agora = new Date().toISOString();

    return { userId, userName, agora };
  }

  async function registrarAuditoria(
    codigoNumeric: number,
    snapshotAntes: EmpresaSnapshot,
    snapshotDepois: EmpresaSnapshot
  ) {
    const { userId, userName, agora } = await getUserInfoForAuditoria();

    type CampoCfg = {
      key: keyof EmpresaSnapshot;
      label: string;
      format?: (v: any) => string | null;
    };

    const campos: CampoCfg[] = [
      { key: "razao_social", label: "Razão social" },
      { key: "nome_fantasia", label: "Nome fantasia" },
      { key: "cpf_cnpj", label: "CPF/CNPJ" },
      {
        key: "status",
        label: "Status",
        format: (v) => (v == null ? null : v ? "Ativo" : "Inativo"),
      },
      { key: "data_inicio", label: "Data de início" },
      {
        key: "honorario_mensal",
        label: "Honorário mensal",
        format: (v) => (v == null ? null : String(v)),
      },
      {
        key: "horas_mensais",
        label: "Horas mensais do contrato",
        format: (v) => (v == null ? null : String(v)),
      },
      {
        key: "valor_hora_adicional",
        label: "Valor da hora adicional",
        format: (v) => (v == null ? null : String(v)),
      },
      {
        key: "administrador_delegado",
        label: "Administrador delegado",
      },
      {
        key: "emite_nfe_produtos",
        label: "Emite NF de produtos?",
        format: (v) => (v ? "Sim" : "Não"),
      },
      {
        key: "emite_nfe_servicos",
        label: "Emite NF de serviços?",
        format: (v) => (v ? "Sim" : "Não"),
      },
      {
        key: "emite_boletos",
        label: "Emite boletos?",
        format: (v) => (v ? "Sim" : "Não"),
      },
      {
        key: "faz_importacao",
        label: "Faz importação?",
        format: (v) => (v ? "Sim" : "Não"),
      },
      {
        key: "faz_exportacao",
        label: "Faz exportação?",
        format: (v) => (v ? "Sim" : "Não"),
      },
      {
        key: "faz_conciliacao_cartao",
        label: "Concilia cartão?",
        format: (v) => (v ? "Sim" : "Não"),
      },
    ];

    const registros: any[] = [];

    for (const campo of campos) {
      const antes = snapshotAntes[campo.key];
      const depois = snapshotDepois[campo.key];

      const rawAntes =
        campo.format?.(antes) ?? (antes == null ? null : String(antes));
      const rawDepois =
        campo.format?.(depois) ?? (depois == null ? null : String(depois));

      if (rawAntes === rawDepois) continue;

      registros.push({
        empresa_codigo_erp: codigoNumeric,
        campo: campo.label,
        valor_anterior: rawAntes,
        valor_novo: rawDepois,
        alterado_em: agora,
        alterado_por: userId,
        alterado_por_nome: userName,
      });
    }

    if (registros.length === 0) return;

    const { error } = await supabase
      .from("empresas_bpo_auditoria")
      .insert(registros);

    if (error) {
      console.error("auditoria: erro ao inserir:", error);
    }
  }

  /* ----- Sync Filiais / Acessos / Particularidades / Integrações ----- */

  async function syncFiliais(codigoNumeric: number) {
    const orig = filiaisOrigRef.current || [];
    const atual = filiais;

    const key = (f: Filial) => `${f.cnpj.trim()}||${f.apelido.trim()}`;

    const origMap = new Map<string, Filial>();
    orig.forEach((f) => origMap.set(key(f), f));

    const atualMap = new Map<string, Filial>();
    atual.forEach((f) => atualMap.set(key(f), f));

    const removidas: Filial[] = [];
    const adicionadas: Filial[] = [];

    for (const f of orig) {
      if (!atualMap.has(key(f))) removidas.push(f);
    }
    for (const f of atual) {
      if (!origMap.has(key(f))) adicionadas.push(f);
    }

    const { error: delError } = await supabase
      .from("empresas_bpo_filiais")
      .delete()
      .eq("empresa_codigo_erp", codigoNumeric);

    if (delError) {
      console.error("syncFiliais: erro ao deletar antigas:", delError);
      return;
    }

    const payload = atual
      .filter((f) => f.cnpj.trim() || f.apelido.trim())
      .map((f) => ({
        empresa_codigo_erp: codigoNumeric,
        cnpj: f.cnpj.trim() || null,
        apelido: f.apelido.trim() || null,
      }));

    if (payload.length > 0) {
      const { error: insError } = await supabase
        .from("empresas_bpo_filiais")
        .insert(payload);

      if (insError) {
        console.error("syncFiliais: erro ao inserir:", insError);
      }
    }

    if (removidas.length > 0 || adicionadas.length > 0) {
      const { userId, userName, agora } = await getUserInfoForAuditoria();

      const registros: any[] = [];

      removidas.forEach((f) => {
        const desc = `${f.cnpj || "sem CNPJ"} - ${f.apelido || "sem apelido"}`;
        registros.push({
          empresa_codigo_erp: codigoNumeric,
          campo: "Filial removida",
          valor_anterior: desc,
          valor_novo: null,
          alterado_em: agora,
          alterado_por: userId,
          alterado_por_nome: userName,
        });
      });

      adicionadas.forEach((f) => {
        const desc = `${f.cnpj || "sem CNPJ"} - ${f.apelido || "sem apelido"}`;
        registros.push({
          empresa_codigo_erp: codigoNumeric,
          campo: "Filial adicionada",
          valor_anterior: null,
          valor_novo: desc,
          alterado_em: agora,
          alterado_por: userId,
          alterado_por_nome: userName,
        });
      });

      if (registros.length > 0) {
        const { error } = await supabase
          .from("empresas_bpo_auditoria")
          .insert(registros);
        if (error) {
          console.error("auditoria filiais: erro ao inserir:", error);
        }
      }
    }
  }

  async function syncAcessos(codigoNumeric: number) {
    const orig = acessosOrigRef.current || [];
    const atual = acessos;

    const key = (a: Acesso) =>
      `${a.tipo.trim()}||${a.descricao.trim()}||${a.login.trim()}||${a.url.trim()}`;

    const origMap = new Map<string, Acesso>();
    orig.forEach((a) => origMap.set(key(a), a));

    const atualMap = new Map<string, Acesso>();
    atual.forEach((a) => atualMap.set(key(a), a));

    const removidos: Acesso[] = [];
    const adicionados: Acesso[] = [];

    for (const a of orig) {
      if (!atualMap.has(key(a))) removidos.push(a);
    }
    for (const a of atual) {
      if (!origMap.has(key(a))) adicionados.push(a);
    }

    const { error: delError } = await supabase
      .from("empresas_bpo_acessos")
      .delete()
      .eq("empresa_codigo_erp", codigoNumeric);

    if (delError) {
      console.error("syncAcessos: erro ao deletar antigos:", delError);
      return;
    }

    const payload = atual
      .filter(
        (a) =>
          a.tipo.trim() ||
          a.descricao.trim() ||
          a.login.trim() ||
          a.senha.trim() ||
          a.url.trim()
      )
      .map((a) => ({
        empresa_codigo_erp: codigoNumeric,
        tipo: a.tipo.trim() || null,
        descricao: a.descricao.trim() || null,
        login: a.login.trim() || null,
        senha: a.senha.trim() || null,
        url: a.url.trim() || null,
      }));

    if (payload.length > 0) {
      const { error: insError } = await supabase
        .from("empresas_bpo_acessos")
        .insert(payload);

      if (insError) {
        console.error("syncAcessos: erro ao inserir:", insError);
      }
    }

    if (removidos.length > 0 || adicionados.length > 0) {
      const { userId, userName, agora } = await getUserInfoForAuditoria();
      const registros: any[] = [];

      const resumo = (a: Acesso) =>
        `${a.tipo || "sem tipo"} - ${a.descricao || "sem descrição"} - ${
          a.login || "sem login"
        }`;

      removidos.forEach((a) => {
        registros.push({
          empresa_codigo_erp: codigoNumeric,
          campo: "Acesso removido",
          valor_anterior: resumo(a),
          valor_novo: null,
          alterado_em: agora,
          alterado_por: userId,
          alterado_por_nome: userName,
        });
      });

      adicionados.forEach((a) => {
        registros.push({
          empresa_codigo_erp: codigoNumeric,
          campo: "Acesso adicionado",
          valor_anterior: null,
          valor_novo: resumo(a),
          alterado_em: agora,
          alterado_por: userId,
          alterado_por_nome: userName,
        });
      });

      if (registros.length > 0) {
        const { error } = await supabase
          .from("empresas_bpo_auditoria")
          .insert(registros);
        if (error) {
          console.error("auditoria acessos: erro ao inserir:", error);
        }
      }
    }
  }

  async function syncParticularidades(codigoNumeric: number) {
    const orig = partOrigRef.current || [];
    const atual = particularidades;

    const key = (p: Particularidade) =>
      `${p.titulo.trim()}||${p.texto.trim()}`;

    const origMap = new Map<string, Particularidade>();
    orig.forEach((p) => origMap.set(key(p), p));

    const atualMap = new Map<string, Particularidade>();
    atual.forEach((p) => atualMap.set(key(p), p));

    const removidas: Particularidade[] = [];
    const adicionadas: Particularidade[] = [];

    for (const p of orig) {
      if (!atualMap.has(key(p))) removidas.push(p);
    }
    for (const p of atual) {
      if (!origMap.has(key(p))) adicionadas.push(p);
    }

    const { error: delError } = await supabase
      .from("empresas_bpo_particularidades")
      .delete()
      .eq("empresa_codigo_erp", codigoNumeric);

    if (delError) {
      console.error(
        "syncParticularidades: erro ao deletar antigas:",
        delError
      );
      return;
    }

    const payload = atual
      .filter((p) => p.titulo.trim() || p.texto.trim())
      .map((p) => ({
        empresa_codigo_erp: codigoNumeric,
        titulo: p.titulo.trim() || null,
        texto: p.texto.trim() || null,
      }));

    if (payload.length > 0) {
      const { error: insError } = await supabase
        .from("empresas_bpo_particularidades")
        .insert(payload);

      if (insError) {
        console.error(
          "syncParticularidades: erro ao inserir novas:",
          insError
        );
      }
    }

    if (removidas.length > 0 || adicionadas.length > 0) {
      const { userId, userName, agora } = await getUserInfoForAuditoria();
      const registros: any[] = [];

      const resumo = (p: Particularidade) =>
        p.titulo || p.texto.slice(0, 60) || "Sem título";

      removidas.forEach((p) => {
        registros.push({
          empresa_codigo_erp: codigoNumeric,
          campo: "Particularidade removida",
          valor_anterior: resumo(p),
          valor_novo: null,
          alterado_em: agora,
          alterado_por: userId,
          alterado_por_nome: userName,
        });
      });

      adicionadas.forEach((p) => {
        registros.push({
          empresa_codigo_erp: codigoNumeric,
          campo: "Particularidade adicionada",
          valor_anterior: null,
          valor_novo: resumo(p),
          alterado_em: agora,
          alterado_por: userId,
          alterado_por_nome: userName,
        });
      });

      if (registros.length > 0) {
        const { error } = await supabase
          .from("empresas_bpo_auditoria")
          .insert(registros);
        if (error) {
          console.error(
            "auditoria particularidades: erro ao inserir:",
            error
          );
        }
      }
    }
  }

  async function syncIntegracoes(codigoNumeric: number) {
    const before = integOrigRef.current ?? {
      certificado_tipo: "",
      certificado_vencimento: "",
      integracoes_descricao: "",
    };
    const after = integracoes;

    const { error: delError } = await supabase
      .from("empresas_bpo_integracoes")
      .delete()
      .eq("empresa_codigo_erp", codigoNumeric);

    if (delError) {
      console.error("syncIntegracoes: erro ao deletar:", delError);
      return;
    }

    const hasData =
      after.certificado_tipo.trim() ||
      after.certificado_vencimento.trim() ||
      after.integracoes_descricao.trim();

    if (hasData) {
      const { error: insError } = await supabase
        .from("empresas_bpo_integracoes")
        .insert({
          empresa_codigo_erp: codigoNumeric,
          certificado_tipo: after.certificado_tipo.trim() || null,
          certificado_vencimento:
            after.certificado_vencimento.trim() || null,
          integracoes_descricao:
            after.integracoes_descricao.trim() || null,
        });

      if (insError) {
        console.error("syncIntegracoes: erro ao inserir:", insError);
      }
    }

    const campos: {
      key: keyof IntegracoesState;
      label: string;
    }[] = [
      { key: "certificado_tipo", label: "Integrações - tipo de certificado" },
      {
        key: "certificado_vencimento",
        label: "Integrações - vencimento do certificado",
      },
      {
        key: "integracoes_descricao",
        label: "Integrações - descrição",
      },
    ];

    const diffs: any[] = [];
    const { userId, userName, agora } = await getUserInfoForAuditoria();

    campos.forEach((c) => {
      const antes = before[c.key] || "";
      const depois = after[c.key] || "";
      if (antes === depois) return;

      diffs.push({
        empresa_codigo_erp: codigoNumeric,
        campo: c.label,
        valor_anterior: antes || null,
        valor_novo: depois || null,
        alterado_em: agora,
        alterado_por: userId,
        alterado_por_nome: userName,
      });
    });

    if (diffs.length > 0) {
      const { error } = await supabase
        .from("empresas_bpo_auditoria")
        .insert(diffs);
      if (error) {
        console.error("auditoria integracoes: erro ao inserir:", error);
      }
    }
  }

  /* --------------------- Logo (upload/remover) --------------------- */

  function triggerLogoSelect() {
    fileInputRef.current?.click();
  }

  async function handleLogoFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);

    const codigoNumeric = Number(codigoFromUrl);
    if (!Number.isFinite(codigoNumeric)) {
      setLogoError("Código ERP inválido para upload da logo.");
      return;
    }

    setLogoUploading(true);

    try {
      const fileExt = file.name.split(".").pop() || "png";
      const path = `${codigoNumeric}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(path, file, { upsert: true });

      if (uploadError) {
        console.error("Erro ao fazer upload da logo:", uploadError);
        setLogoError(`Erro ao enviar logo: ${uploadError.message}`);
        setLogoUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from(LOGO_BUCKET)
        .getPublicUrl(path);

      const publicUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from(TABLE_NAME)
        .update({ logo_url: publicUrl })
        .eq("codigo_erp", codigoNumeric);

      if (updateError) {
        console.error("Erro ao salvar logo_url:", updateError);
        setLogoError(`Erro ao salvar logo no cadastro: ${updateError.message}`);
        setLogoUploading(false);
        return;
      }

      // Auditoria da logo
      const { userId, userName, agora } = await getUserInfoForAuditoria();
      await supabase.from("empresas_bpo_auditoria").insert({
        empresa_codigo_erp: codigoNumeric,
        campo: "Logo",
        valor_anterior: formData?.logo_url || null,
        valor_novo: publicUrl,
        alterado_em: agora,
        alterado_por: userId,
        alterado_por_nome: userName,
      });

      // Atualiza estado local e recarrega histórico
      setFormData((prev) =>
        prev ? { ...prev, logo_url: publicUrl } : prev
      );
      const codigoNum = Number(codigoFromUrl);
      if (Number.isFinite(codigoNum)) {
        await loadRelatedData(codigoNum);
      }
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleLogoRemove() {
    const codigoNumeric = Number(codigoFromUrl);
    if (!Number.isFinite(codigoNumeric)) {
      setLogoError("Código ERP inválido para remover logo.");
      return;
    }

    if (!formData?.logo_url) return;

    setLogoError(null);
    setLogoRemoving(true);

    try {
      const oldUrl = formData.logo_url;

      const { error: updateError } = await supabase
        .from(TABLE_NAME)
        .update({ logo_url: null })
        .eq("codigo_erp", codigoNumeric);

      if (updateError) {
        console.error("Erro ao remover logo_url:", updateError);
        setLogoError(`Erro ao remover logo: ${updateError.message}`);
        setLogoRemoving(false);
        return;
      }

      const { userId, userName, agora } = await getUserInfoForAuditoria();
      await supabase.from("empresas_bpo_auditoria").insert({
        empresa_codigo_erp: codigoNumeric,
        campo: "Logo",
        valor_anterior: oldUrl,
        valor_novo: null,
        alterado_em: agora,
        alterado_por: userId,
        alterado_por_nome: userName,
      });

      setFormData((prev) =>
        prev ? { ...prev, logo_url: "" } : prev
      );
      const codigoNum = Number(codigoFromUrl);
      if (Number.isFinite(codigoNum)) {
        await loadRelatedData(codigoNum);
      }
    } finally {
      setLogoRemoving(false);
    }
  }

  /* --------------------- Submit geral --------------------- */

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formData) return;

    setSaving(true);
    setErrorMsg(null);

    const codigoNumeric = Number(codigoFromUrl);
    if (!Number.isFinite(codigoNumeric)) {
      setErrorMsg("Código ERP inválido na URL.");
      setSaving(false);
      return;
    }

    const snapshotAntes = originalSnapshotRef.current;

    const submission = {
      razao_social: formData.razao_social.trim() || null,
      nome_fantasia: formData.nome_fantasia.trim() || null,
      cpf_cnpj: formData.cpf_cnpj.trim() || null,
      status: formData.status,
      data_inicio: formData.data_inicio || null,
      honorario_mensal: formData.honorario_mensal
        ? Number(formData.honorario_mensal)
        : null,
      horas_mensais: formData.horas_mensais
        ? Number(formData.horas_mensais)
        : null,
      valor_hora_adicional: formData.valor_hora_adicional
        ? Number(formData.valor_hora_adicional)
        : null,
      administrador_delegado:
        formData.administrador_delegado.trim() || null,
      emite_nfe_produtos: formData.emite_nfe_produtos,
      emite_nfe_servicos: formData.emite_nfe_servicos,
      emite_boletos: formData.emite_boletos,
      faz_importacao: formData.faz_importacao,
      faz_exportacao: formData.faz_exportacao,
      faz_conciliacao_cartao: formData.faz_conciliacao_cartao,
    };

    const { error } = await supabase
      .from(TABLE_NAME)
      .update(submission)
      .eq("codigo_erp", codigoNumeric);

    if (error) {
      console.error("Erro ao atualizar empresa:", error);
      setErrorMsg(`Erro ao salvar: ${error.message}`);
      setSaving(false);
      return;
    }

    try {
      await Promise.all([
        syncFiliais(codigoNumeric),
        syncAcessos(codigoNumeric),
        syncParticularidades(codigoNumeric),
        syncIntegracoes(codigoNumeric),
      ]);
    } catch (e: any) {
      console.error("Erro ao sincronizar dados relacionados:", e);
      setErrorMsg(
        "Dados principais salvos, mas houve erro ao sincronizar alguns detalhes. Verifique o console."
      );
    }

    if (snapshotAntes) {
      const snapshotDepois: EmpresaSnapshot = {
        razao_social: submission.razao_social,
        nome_fantasia: submission.nome_fantasia,
        cpf_cnpj: submission.cpf_cnpj,
        status: submission.status,
        data_inicio: submission.data_inicio,
        honorario_mensal: submission.honorario_mensal,
        horas_mensais: submission.horas_mensais,
        valor_hora_adicional: submission.valor_hora_adicional,
        administrador_delegado: submission.administrador_delegado,
        emite_nfe_produtos: submission.emite_nfe_produtos,
        emite_nfe_servicos: submission.emite_nfe_servicos,
        emite_boletos: submission.emite_boletos,
        faz_importacao: submission.faz_importacao,
        faz_exportacao: submission.faz_exportacao,
        faz_conciliacao_cartao: submission.faz_conciliacao_cartao,
      };

      await registrarAuditoria(
        codigoNumeric,
        snapshotAntes,
        snapshotDepois
      );
      originalSnapshotRef.current = snapshotDepois;
    }

    const codigoNum = Number(codigoFromUrl);
    if (Number.isFinite(codigoNum)) {
      await loadRelatedData(codigoNum);
    }

    setSaving(false);
  }

  /* ========================================================================
   * Render
   * ====================================================================== */

  if (loading || !formData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <Loader2 className="h-4 w-4 animate-spin text-neutral-700 dark:text-neutral-100" />
          <span className="text-sm text-neutral-700 dark:text-neutral-100">
            Carregando dados da empresa…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <main className="mx-auto max-w-6xl px-3 py-8 sm:px-4 lg:px-6 xl:px-0">
        {/* Cabeçalho */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2">
              <Building2 className="h-5 w-5 text-neutral-700 dark:text-neutral-100" />
              <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                Editar Cliente BPO
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span>Cód. ERP {formData.codigo_erp}</span>
              <span>•</span>
              <span>{formData.razao_social || "Sem razão social"}</span>
              <span>•</span>
              <Badge
                variant={formData.status ? "default" : "outline"}
                className={
                  formData.status
                    ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-100"
                    : "bg-rose-500/10 text-rose-300 border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-100"
                }
              >
                {formData.status ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {errorMsg && (
              <span className="max-w-xs text-right text-xs text-rose-500">
                {errorMsg}
              </span>
            )}
            <Link
              href="/cadastro/clientes-bpo"
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <TabsList className="flex flex-wrap gap-1.5 rounded-2xl border border-neutral-100 bg-white p-1 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <TabsTrigger
                value="dados"
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs data-[state=active]:border data-[state=active]:border-neutral-200 data-[state=active]:bg-neutral-900/5 data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm dark:data-[state=active]:border-neutral-700 dark:data-[state=active]:bg-neutral-800 dark:data-[state=active]:text-neutral-50"
              >
                <FileText className="h-4 w-4" />
                Dados
              </TabsTrigger>
              <TabsTrigger
                value="filiais"
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs data-[state=active]:border data-[state=active]:border-neutral-200 data-[state=active]:bg-neutral-900/5 data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm dark:data-[state=active]:border-neutral-700 dark:data-[state=active]:bg-neutral-800 dark:data-[state=active]:text-neutral-50"
              >
                <Building2 className="h-4 w-4" />
                Filiais
              </TabsTrigger>
              <TabsTrigger
                value="financeiro"
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs data-[state=active]:border data-[state=active]:border-neutral-200 data-[state=active]:bg-neutral-900/5 data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm dark:data-[state=active]:border-neutral-700 dark:data-[state=active]:bg-neutral-800 dark:data-[state=active]:text-neutral-50"
              >
                <CreditCard className="h-4 w-4" />
                Financeiro
              </TabsTrigger>
              <TabsTrigger
                value="acessos"
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs data-[state=active]:border data-[state=active]:border-neutral-200 data-[state=active]:bg-neutral-900/5 data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm dark:data-[state=active]:border-neutral-700 dark:data-[state=active]:bg-neutral-800 dark:data-[state=active]:text-neutral-50"
              >
                <Shield className="h-4 w-4" />
                Acessos
              </TabsTrigger>
              <TabsTrigger
                value="particularidades"
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs data-[state=active]:border data-[state=active]:border-neutral-200 data-[state=active]:bg-neutral-900/5 data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm dark:data-[state=active]:border-neutral-700 dark:data-[state=active]:bg-neutral-800 dark:data-[state=active]:text-neutral-50"
              >
                <ListChecks className="h-4 w-4" />
                Particularidades
              </TabsTrigger>
              <TabsTrigger
                value="integracoes"
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs data-[state=active]:border data-[state=active]:border-neutral-200 data-[state=active]:bg-neutral-900/5 data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm dark:data-[state=active]:border-neutral-700 dark:data-[state=active]:bg-neutral-800 dark:data-[state=active]:text-neutral-50"
              >
                <Settings2 className="h-4 w-4" />
                Integrações
              </TabsTrigger>
              <TabsTrigger
                value="historico"
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs data-[state=active]:border data-[state=active]:border-neutral-200 data-[state=active]:bg-neutral-900/5 data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm dark:data-[state=active]:border-neutral-700 dark:data-[state=active]:bg-neutral-800 dark:data-[state=active]:text-neutral-50"
              >
                <History className="h-4 w-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            {/* -------------------- Aba Dados -------------------- */}
            <TabsContent value="dados" className="space-y-4">
              <Card className="border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    Dados cadastrais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputField
                      label="Código ERP"
                      id="codigo_erp"
                      value={formData.codigo_erp}
                      disabled
                    />
                    <InputField
                      label="CPF/CNPJ"
                      id="cpf_cnpj"
                      value={formData.cpf_cnpj}
                      onChange={handleChange}
                      placeholder="00.000.000/0001-00"
                    />
                    <InputField
                      label="Razão social"
                      id="razao_social"
                      value={formData.razao_social}
                      onChange={handleChange}
                    />
                    <InputField
                      label="Nome fantasia"
                      id="nome_fantasia"
                      value={formData.nome_fantasia}
                      onChange={handleChange}
                    />
                    <InputField
                      label="Data de início"
                      id="data_inicio"
                      type="date"
                      value={formData.data_inicio}
                      onChange={handleChange}
                    />
                  </div>

                  <Separator className="my-4 border-neutral-200 dark:border-neutral-800" />

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <YesNoRow
                      label="Emite nota fiscal de produtos?"
                      value={formData.emite_nfe_produtos}
                      onChange={(val) =>
                        setFormData((prev) =>
                          prev ? { ...prev, emite_nfe_produtos: val } : prev
                        )
                      }
                    />
                    <YesNoRow
                      label="Emite nota fiscal de serviços?"
                      value={formData.emite_nfe_servicos}
                      onChange={(val) =>
                        setFormData((prev) =>
                          prev ? { ...prev, emite_nfe_servicos: val } : prev
                        )
                      }
                    />
                    <YesNoRow
                      label="Emite boletos?"
                      value={formData.emite_boletos}
                      onChange={(val) =>
                        setFormData((prev) =>
                          prev ? { ...prev, emite_boletos: val } : prev
                        )
                      }
                    />
                    <YesNoRow
                      label="Realiza importação de mercadorias?"
                      value={formData.faz_importacao}
                      onChange={(val) =>
                        setFormData((prev) =>
                          prev ? { ...prev, faz_importacao: val } : prev
                        )
                      }
                    />
                    <YesNoRow
                      label="Realiza exportação de mercadorias?"
                      value={formData.faz_exportacao}
                      onChange={(val) =>
                        setFormData((prev) =>
                          prev ? { ...prev, faz_exportacao: val } : prev
                        )
                      }
                    />
                    <YesNoRow
                      label="Faz conciliação de cartão?"
                      value={formData.faz_conciliacao_cartao}
                      onChange={(val) =>
                        setFormData((prev) =>
                          prev
                            ? { ...prev, faz_conciliacao_cartao: val }
                            : prev
                        )
                      }
                    />
                  </div>

                  <Separator className="my-4 border-neutral-200 dark:border-neutral-800" />

                  {/* Logo */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
                      Logo da empresa
                    </p>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <div className="flex-1">
                        <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
                          {formData.logo_url ? (
                            // logo grande
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={formData.logo_url}
                              alt="Logo da empresa"
                              className="max-h-36 max-w-full object-contain"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                              <ImageIcon className="h-6 w-6" />
                              <span>Nenhuma logo enviada ainda.</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 md:w-56">
                        <button
                          type="button"
                          onClick={triggerLogoSelect}
                          disabled={logoUploading}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
                        >
                          {logoUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ImageIcon className="h-4 w-4" />
                          )}
                          {formData.logo_url
                            ? "Alterar logo"
                            : "Enviar logo"}
                        </button>
                        {formData.logo_url && (
                          <button
                            type="button"
                            onClick={handleLogoRemove}
                            disabled={logoRemoving}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60 dark:border-rose-800 dark:bg-rose-900/40 dark:text-rose-200 dark:hover:bg-rose-900/60"
                          >
                            {logoRemoving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Remover logo
                          </button>
                        )}
                        {logoError && (
                          <p className="text-[11px] text-rose-500">
                            {logoError}
                          </p>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoFileChange}
                        />
                        <p className="text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
                          Formatos recomendados: PNG ou SVG. Tamanho ideal
                          até ~300px de altura para boa visualização.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* -------------------- Aba Filiais -------------------- */}
            <TabsContent value="filiais" className="space-y-4">
              <Card className="border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    Filiais / CNPJs
                  </CardTitle>
                  <button
                    type="button"
                    onClick={addFilial}
                    className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-2.5 py-1 text-xs shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar
                  </button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {filiais.length === 0 && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Nenhuma filial cadastrada para este cliente.
                    </p>
                  )}

                  {filiais.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-2 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-900"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-end">
                        <div className="flex-1">
                          <InputField
                            label="CNPJ"
                            id={`filial_cnpj_${idx}`}
                            value={f.cnpj}
                            onChange={(e) =>
                              updateFilial(idx, "cnpj", e.target.value)
                            }
                          />
                        </div>
                        <div className="flex-1">
                          <InputField
                            label="Apelido"
                            id={`filial_apelido_${idx}`}
                            value={f.apelido}
                            onChange={(e) =>
                              updateFilial(idx, "apelido", e.target.value)
                            }
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFilial(idx)}
                          className="self-start text-xs text-neutral-400 hover:text-rose-500 dark:text-neutral-500 dark:hover:text-rose-400"
                          title="Remover filial"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* -------------------- Aba Financeiro -------------------- */}
            <TabsContent value="financeiro">
              <Card className="border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    Financeiro
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputField
                      label="Honorário mensal (R$)"
                      id="honorario_mensal"
                      type="number"
                      step="0.01"
                      value={formData.honorario_mensal}
                      onChange={handleChange}
                    />
                    <InputField
                      label="Horas mensais do contrato"
                      id="horas_mensais"
                      type="number"
                      step="0.01"
                      value={formData.horas_mensais}
                      onChange={handleChange}
                    />
                    <InputField
                      label="Valor da hora adicional (R$)"
                      id="valor_hora_adicional"
                      type="number"
                      step="0.01"
                      value={formData.valor_hora_adicional}
                      onChange={handleChange}
                    />
                    <InputField
                      label="Administrador delegado"
                      id="administrador_delegado"
                      value={formData.administrador_delegado}
                      onChange={handleChange}
                      hint="Responsável pelos ajustes de contrato, aprovações e negociações."
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    As alterações financeiras também são registradas na aba{" "}
                    <strong>Histórico</strong>, permitindo rastrear reajustes e
                    mudanças ao longo do tempo.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* -------------------- Aba Acessos -------------------- */}
            <TabsContent value="acessos" className="space-y-4">
              <Card className="border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    Acessos críticos
                  </CardTitle>
                  <button
                    type="button"
                    onClick={addAcesso}
                    className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-2.5 py-1 text-xs shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar
                  </button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {acessos.length === 0 && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Nenhum acesso cadastrado. Aqui você pode guardar acessos
                      de bancos, operadoras de cartão, portais da receita,
                      sistemas, etc.
                    </p>
                  )}

                  {acessos.map((a, idx) => (
                    <div
                      key={idx}
                      className="space-y-2 rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900"
                    >
                      <div className="flex flex-col gap-2 md:flex-row">
                        <div className="md:w-1/4">
                          <InputField
                            label="Tipo"
                            id={`acesso_tipo_${idx}`}
                            value={a.tipo}
                            onChange={(e) =>
                              updateAcesso(idx, "tipo", e.target.value)
                            }
                            placeholder="Banco, Cartão, Site…"
                          />
                        </div>
                        <div className="md:flex-1">
                          <InputField
                            label="Descrição"
                            id={`acesso_desc_${idx}`}
                            value={a.descricao}
                            onChange={(e) =>
                              updateAcesso(idx, "descricao", e.target.value)
                            }
                          />
                        </div>
                        <div className="md:w-1/4">
                          <InputField
                            label="URL"
                            id={`acesso_url_${idx}`}
                            value={a.url}
                            onChange={(e) =>
                              updateAcesso(idx, "url", e.target.value)
                            }
                            placeholder="https://…"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 md:flex-row">
                        <div className="md:w-1/3">
                          <InputField
                            label="Login"
                            id={`acesso_login_${idx}`}
                            value={a.login}
                            onChange={(e) =>
                              updateAcesso(idx, "login", e.target.value)
                            }
                          />
                        </div>
                        <div className="md:w-1/3">
                          <InputField
                            label="Senha"
                            id={`acesso_senha_${idx}`}
                            type="text"
                            value={a.senha}
                            onChange={(e) =>
                              updateAcesso(idx, "senha", e.target.value)
                            }
                          />
                        </div>
                        <div className="flex flex-1 items-end justify-end">
                          <button
                            type="button"
                            onClick={() => removeAcesso(idx)}
                            className="text-xs text-neutral-400 hover:text-rose-500 dark:text-neutral-500 dark:hover:text-rose-400"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* -------------------- Aba Particularidades -------------------- */}
            <TabsContent value="particularidades" className="space-y-4">
              <Card className="border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    Particularidades do cliente
                  </CardTitle>
                  <button
                    type="button"
                    onClick={addParticularidade}
                    className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-2.5 py-1 text-xs shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar
                  </button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {particularidades.length === 0 && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Use esta área para registrar regras específicas, combinados
                      fora do padrão, exceções de processo, etc.
                    </p>
                  )}

                  {particularidades.map((p, idx) => {
                    const isOpen = !!openPart[idx];
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-neutral-100 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"
                      >
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <div className="flex-1">
                            <InputField
                              label="Título"
                              id={`part_titulo_${idx}`}
                              value={p.titulo}
                              onChange={(e) =>
                                updateParticularidade(
                                  idx,
                                  "titulo",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleParticularidadeOpen(idx)}
                            className="mt-6 inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                            title={isOpen ? "Recolher texto" : "Exibir texto"}
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeParticularidade(idx)}
                            className="mt-6 text-xs text-neutral-400 hover:text-rose-500 dark:text-neutral-500 dark:hover:text-rose-400"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        {isOpen && (
                          <div className="border-t border-neutral-100 px-3 pb-3 pt-2 dark:border-neutral-700">
                            <TextAreaField
                              label="Texto"
                              id={`part_texto_${idx}`}
                              value={p.texto}
                              onChange={(e) =>
                                updateParticularidade(
                                  idx,
                                  "texto",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            {/* -------------------- Aba Integrações -------------------- */}
            <TabsContent value="integracoes">
              <Card className="border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    Integrações & certificados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <InputField
                      label="Tipo de certificado digital"
                      id="certificado_tipo"
                      value={integracoes.certificado_tipo}
                      onChange={(e) =>
                        setIntegracoes((prev) => ({
                          ...prev,
                          certificado_tipo: e.target.value,
                        }))
                      }
                      placeholder="A1, A3…"
                    />
                    <InputField
                      label="Vencimento do certificado"
                      id="certificado_vencimento"
                      type="date"
                      value={integracoes.certificado_vencimento}
                      onChange={(e) =>
                        setIntegracoes((prev) => ({
                          ...prev,
                          certificado_vencimento: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <TextAreaField
                    label="Integrações / APIs / Observações técnicas"
                    id="integracoes_descricao"
                    value={integracoes.integracoes_descricao}
                    onChange={(e) =>
                      setIntegracoes((prev) => ({
                        ...prev,
                        integracoes_descricao: e.target.value,
                      }))
                    }
                    hint="Ex: Integração com Rede, Getnet, emissão automática de NF-e, robôs, etc."
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* -------------------- Aba Histórico -------------------- */}
            <TabsContent value="historico" className="space-y-4">
              <Card className="border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    Histórico de alterações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {historico.length === 0 ? (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Nenhuma alteração registrada ainda para este cliente.
                    </p>
                  ) : (
                    <div className="max-h-[420px] overflow-auto rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <table className="w-full text-xs">
                        <thead className="bg-neutral-50 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-300">
                          <tr>
                            <th className="px-3 py-2 text-left">Quando</th>
                            <th className="px-3 py-2 text-left">Quem</th>
                            <th className="px-3 py-2 text-left">Campo</th>
                            <th className="px-3 py-2 text-left">De</th>
                            <th className="px-3 py-2 text-left">Para</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historico.map((h) => {
                            const dt = new Date(h.alterado_em);
                            const dataStr = dt.toLocaleString("pt-BR");
                            return (
                              <tr
                                key={h.id}
                                className="border-t border-neutral-100 hover:bg-neutral-50/80 dark:border-neutral-800 dark:hover:bg-neutral-800"
                              >
                                <td className="px-3 py-2 align-top">
                                  {dataStr}
                                </td>
                                <td className="px-3 py-2 align-top">
                                  {h.alterado_por_nome ??
                                    h.alterado_por ??
                                    "-"}
                                </td>
                                <td className="px-3 py-2 align-top">
                                  {h.campo}
                                </td>
                                <td className="px-3 py-2 align-top text-neutral-500 dark:text-neutral-400">
                                  {h.valor_anterior ?? "—"}
                                </td>
                                <td className="px-3 py-2 align-top">
                                  {h.valor_novo ?? "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Rodapé com botão salvar */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 disabled:bg-neutral-500 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
