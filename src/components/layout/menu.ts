// src/components/layout/menu.ts
// Menu profissional com ids, descrições e imagem por item (imageSrc, 16:9)

import type { LucideIcon } from "lucide-react";
import {
  Home,
  Building2,
  Briefcase,
  Contact2,
  FileText,
  Landmark,
  Wallet,
  Banknote,
  CreditCard,
  ArrowLeftRight,
  BarChart3,
  FileSpreadsheet,
  UploadCloud,
  Settings,
  ShieldCheck,
  BookOpenCheck,
  FilePieChart,
} from "lucide-react";

export type AppRole = "admin" | "coordenador" | "analista" | "assistente" | "convidado";

export type FeatureFlag =
  | "fiscal"
  | "contas_receber"
  | "contas_pagar"
  | "conciliacao_cartao"
  | "conciliacao_bancaria"
  | "fluxo_caixa"
  | "demonstrativos"
  | "contabilidade"
  | "uploads"
  | "cadastros";

export type Badge = {
  text: string;
  tone?: "default" | "success" | "info" | "warn" | "danger" | "neutral";
};

export type MatchStrategy =
  | { type: "startsWith"; value: string }
  | { type: "regex"; value: RegExp }
  | { type: "exact"; value: string };

export type MenuItem = {
  id: string;
  label: string;
  description?: string;
  href?: string;
  icon?: LucideIcon;
  children?: MenuItem[];
  roles?: AppRole[];
  feature?: FeatureFlag;
  external?: boolean;
  target?: "_blank" | "_self";
  badge?: Badge;
  match?: MatchStrategy;
  disabled?: boolean;
  soon?: boolean;
  /** caminho público da imagem 16:9 (ex.: /img/menu/fiscal.jpg|svg) */
  imageSrc?: string;
};

export type BuildMenuInput = {
  role: AppRole;
  enabledFlags: FeatureFlag[];
  empresaCodigoERP?: string | number | null;
};

function hasFlag(flag: FeatureFlag | undefined, enabled: FeatureFlag[]) {
  return flag ? enabled.includes(flag) : true;
}
function hasRole(roles: AppRole[] | undefined, userRole: AppRole) {
  return roles ? roles.includes(userRole) : true;
}
function filterByAccess(tree: MenuItem[], ctx: BuildMenuInput): MenuItem[] {
  return tree
    .filter((n) => hasRole(n.roles, ctx.role) && hasFlag(n.feature, ctx.enabledFlags))
    .map((n) =>
      n.children
        ? { ...n, children: filterByAccess(n.children, ctx) }.children?.length
          ? { ...n, children: filterByAccess(n.children!, ctx) }
          : { ...n, children: undefined }
        : n
    )
    .filter((n) => (n.children ? n.children.length > 0 : true));
}

/* -------------------------------------------------------------------------- */
/*                                   MENU                                      */
/* -------------------------------------------------------------------------- */

export const BASE_MENU: MenuItem[] = [
  {
    id: "inicio",
    label: "Início",
    description: "Visão geral do seu financeiro e atalhos rápidos.",
    href: "/",
    icon: Home,
    match: { type: "exact", value: "/" },
    imageSrc: "/img/menu/inicio.svg",
  },
  {
    id: "cadastros",
    label: "Cadastros",
    description: "Clientes, fornecedores, bancos e tipos de documentos.",
    icon: BookOpenCheck,
    feature: "cadastros",
    imageSrc: "/img/menu/cadastros.svg",
    children: [
      {
        id: "cad_clientes_fornecedores",
        label: "Clientes e Fornecedores",
        description: "Cadastro unificado com CNPJ/CPF, PIX e contatos.",
        href: "/cadastro/clientes-fornecedores",
        icon: Contact2,
        match: { type: "startsWith", value: "/cadastro/clientes-fornecedores" },
        imageSrc: "/img/menu/cad-clientes-fornecedores.svg",
      },
      {
        id: "cad_tipos_documentos",
        label: "Tipos de Documentos",
        description: "Configure naturezas, séries e regras fiscais.",
        href: "/cadastro/tipos-documentos",
        icon: FileText,
        match: { type: "startsWith", value: "/cadastro/tipos-documentos" },
        imageSrc: "/img/menu/cad-tipos-documentos.svg",
      },
      {
        id: "cad_contas_bancarias",
        label: "Contas Bancárias",
        description: "Contas, agências e integrações para conciliação.",
        href: "/cadastro/contas-bancarias",
        icon: Landmark,
        match: { type: "startsWith", value: "/cadastro/contas-bancarias" },
        imageSrc: "/img/menu/cad-contas-bancarias.svg",
      },
      {
        id: "cad_clientes_bpo",
        label: "Clientes BPO",
        description: "Gestão de carteiras e parâmetros por empresa.",
        href: "/cadastro/clientes-bpo",
        icon: Building2,
        match: { type: "startsWith", value: "/cadastro/clientes-bpo" },
        roles: ["admin", "coordenador"],
        imageSrc: "/img/menu/cad-clientes-bpo.svg",
      },
    ],
  },
  {
    id: "fiscal",
    label: "Faturamento",
    description: "Emissão, gestão de documentos e integrações fiscais.",
    href: "/fiscal",
    icon: Briefcase,
    feature: "fiscal",
    match: { type: "startsWith", value: "/fiscal" },
    imageSrc: "/img/menu/fiscal.svg",
  },
  {
    id: "cr",
    label: "Contas a Receber",
    description: "Cobranças, boletos, PIX e baixas de títulos.",
    href: "/contas-receber",
    icon: Wallet,
    feature: "contas_receber",
    match: { type: "startsWith", value: "/contas-receber" },
    imageSrc: "/img/menu/contas-receber.svg",
  },
  {
    id: "cp",
    label: "Contas a Pagar",
    description: "Pagamentos, remessas bancárias e aprovações.",
    href: "/contas-pagar",
    icon: Banknote,
    feature: "contas_pagar",
    match: { type: "startsWith", value: "/contas-pagar" },
    imageSrc: "/img/menu/contas-pagar.svg",
  },
  {
    id: "cartoes",
    label: "Conciliação de Cartão",
    description: "Concilie vendas, taxas e recebimentos de adquirentes.",
    href: "/conciliacao-cartao",
    icon: CreditCard,
    feature: "conciliacao_cartao",
    match: { type: "startsWith", value: "/conciliacao-cartao" },
    imageSrc: "/img/menu/conciliacao-cartao.svg",
  },
  {
    id: "bancos",
    label: "Conciliação Bancária",
    description: "Integra extratos, categoriza lançamentos e reconcilia.",
    href: "/conciliacao-bancaria",
    icon: ArrowLeftRight,
    feature: "conciliacao_bancaria",
    match: { type: "startsWith", value: "/conciliacao-bancaria" },
    imageSrc: "/img/menu/conciliacao-bancaria.svg",
  },
  {
    id: "fluxo",
    label: "Fluxo de Caixa",
    description: "Projeções, cenários e acompanhamento em tempo real.",
    href: "/fluxo-caixa",
    icon: BarChart3,
    feature: "fluxo_caixa",
    match: { type: "startsWith", value: "/fluxo-caixa" },
    imageSrc: "/img/menu/fluxo-caixa.svg",
  },
  {
    id: "demonstrativos",
    label: "Demonstrativos",
    description: "DRE, balanço e relatórios gerenciais personalizáveis.",
    href: "/demonstrativos",
    icon: FilePieChart,
    feature: "demonstrativos",
    match: { type: "startsWith", value: "/demonstrativos" },
    imageSrc: "/img/menu/dre.svg",
  },
  {
    id: "contabilidade",
    label: "Contabilidade",
    description: "Integração contábil, plano de contas e lançamentos.",
    href: "/contabilidade",
    icon: FileSpreadsheet,
    feature: "contabilidade",
    match: { type: "startsWith", value: "/contabilidade" },
    roles: ["admin", "coordenador"],
    imageSrc: "/img/menu/contabilidade.svg",
  },
  {
    id: "uploads",
    label: "Upload de Arquivos",
    description: "Envio inteligente de documentos e comprovantes.",
    href: "/upload-arquivos",
    icon: UploadCloud,
    feature: "uploads",
    match: { type: "startsWith", value: "/upload-arquivos" },
    imageSrc: "/img/menu/uploads.svg",
  },
  {
    id: "config",
    label: "Configurações",
    description: "Perfis, acessos e parâmetros avançados do sistema.",
    icon: Settings,
    roles: ["admin", "coordenador"],
    imageSrc: "/img/menu/config.svg",
    children: [
      {
        id: "config_perfis",
        label: "Perfis e Acessos",
        description: "Controle fino de permissões por função (RLS).",
        href: "/config/permissoes",
        icon: ShieldCheck,
        roles: ["admin"],
        badge: { text: "RLS", tone: "info" },
        imageSrc: "/img/menu/config-perfis.svg",
      },
    ],
  },
];

/* ------------------------------ Builder ----------------------------------- */

export function buildMenu(ctx: BuildMenuInput): MenuItem[] {
  const runtime = BASE_MENU.map((n) => ({ ...n })); // clone raso
  return filterByAccess(runtime, ctx);
}

export const ALL_FLAGS: FeatureFlag[] = [
  "fiscal",
  "contas_receber",
  "contas_pagar",
  "conciliacao_cartao",
  "conciliacao_bancaria",
  "fluxo_caixa",
  "demonstrativos",
  "contabilidade",
  "uploads",
  "cadastros",
];

export function isActive(pathname: string, item: MenuItem): boolean {
  const m = item.match;
  if (!m || !pathname) return false;
  if (m.type === "exact") return pathname === m.value;
  if (m.type === "startsWith") return pathname.startsWith(m.value);
  if (m.type === "regex") return m.value.test(pathname);
  return false;
}
