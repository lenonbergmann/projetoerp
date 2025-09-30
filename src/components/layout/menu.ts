// src/components/layout/menu.ts
export type MenuItem = {
  label: string;
  href: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>; // opcional (lucide)
  children?: Array<{
    label: string;
    href: string;
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }>;
};

export const MENU: MenuItem[] = [
  {
    label: "Cadastro",
    href: "/cadastro",
    children: [
      { label: "Clientes e Fornecedores", href: "/cadastro/clientes-fornecedores" },
      { label: "Tipos de Documentos", href: "/cadastro/tipos-documentos" },
      { label: "Contas Bancárias", href: "/cadastro/contas-bancarias" },
      { label: "Clientes BPO", href: "/cadastro/clientes-bpo" },
      // { label: "Outros cadastros...", href: "/cadastro/outros" }, // opcional, adicione mais aqui
    ],
  },
  { label: "Faturamento", href: "/faturamento" },
  { label: "Contas a Receber", href: "/contas-receber" },
  { label: "Contas a Pagar", href: "/contas-pagar" },
  { label: "Conciliação de cartão", href: "/conciliacao-cartao" },
  { label: "Fluxo de caixa", href: "/fluxo-caixa" },
  { label: "Conciliação bancária", href: "/conciliacao-bancaria" },
  { label: "Demonstrativos", href: "/demonstrativos" },
  { label: "Contabilidade", href: "/contabilidade" },
  { label: "Upload de arquivos", href: "/upload-arquivos" },
];
