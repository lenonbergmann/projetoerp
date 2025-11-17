"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

import {
  Building2,
  Users,
  Landmark,
  Banknote,
  FileText,
  Settings2,
  Network,
  LayoutPanelLeft,
  FolderKanban,
  Wallet,
  FileCog,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

type GroupItem = {
  label: string;
  href: string;
  description?: string;
  icon?: React.ElementType;
};

type Group = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  items: GroupItem[];
};

const groups: Group[] = [
  {
    id: "empresas",
    title: "Empresas & Acessos",
    description:
      "Estrutura base do BPO: empresas atendidas, times e regras de acesso.",
    icon: Building2,
    items: [
      {
        label: "Clientes BPO",
        href: "/cadastro/clientes-bpo",
        description:
          "Cadastro das empresas atendidas, lojas/CNPJs, matriz x filial.",
        icon: Building2,
      },
      {
        label: "Particularidades por Empresa",
        href: "/cadastro/particularidades",
        description:
          "Regras específicas de cada cliente (fluxo, tributos, exceções).",
        icon: FileCog,
      },
      {
        label: "Usuários & Perfis de Acesso",
        href: "/cadastro/usuarios",
        description:
          "Time interno do BPO, papéis, permissões e empresas liberadas.",
        icon: Users,
      },
      {
        label: "Regras de Aprovação",
        href: "/cadastro/regras-aprovacao",
        description:
          "Workflows de aprovação de pagamentos, limites e alçadas.",
        icon: ShieldCheck,
      },
    ],
  },
  {
    id: "financeiro",
    title: "Financeiro & Operações",
    description:
      "Tudo que amarra contas a pagar, receber, orçamento e fluxo de caixa.",
    icon: Wallet,
    items: [
      {
        label: "Clientes & Fornecedores",
        href: "/cadastro/clientes-fornecedores",
        description:
          "Cadastro único, histórico, múltiplos bancos e documentos fiscais.",
        icon: Users,
      },
      {
        label: "Contas Bancárias",
        href: "/cadastro/contas-bancarias",
        description:
          "Contas correntes, carteiras de cobrança, cartões e wallets.",
        icon: Banknote,
      },
      {
        label: "Plano de Contas",
        href: "/cadastro/plano-de-contas",
        description:
          "Estrutura contábil e gerencial para DRE, DFC e dashboards.",
        icon: FolderKanban,
      },
      {
        label: "Centros de Custo & Projetos",
        href: "/cadastro/centros-custo",
        description:
          "Lojas, unidades de negócio, obras, campanhas e importações.",
        icon: LayoutPanelLeft,
      },
      {
        label: "Tipos de Documento",
        href: "/cadastro/tipos-documento",
        description:
          "NF-e, NF-s, boletos, contratos, adiantamentos, cartões, etc.",
        icon: FileText,
      },
      {
        label: "Categorias & Regras de Classificação",
        href: "/cadastro/categorias",
        description:
          "Regras automáticas para classificar extratos, cartões e lançamentos.",
        icon: Settings2,
      },
    ],
  },
  {
    id: "integracoes",
    title: "Integrações & Fiscal",
    description: "Conectores, automações e cadastros de apoio fiscal.",
    icon: Network,
    items: [
      {
        label: "Integrações (APIs)",
        href: "/cadastro/integracoes",
        description:
          "Gateways, adquirentes, bancos, ERPs e conectores externos.",
        icon: Network,
      },
      {
        label: "Configurações Fiscais",
        href: "/cadastro/configuracoes-fiscais",
        description:
          "Naturezas de operação, CFOP, regimes, parametrizações por cliente.",
        icon: Landmark,
      },
      {
        label: "Modelos de Contrato & Documentos",
        href: "/cadastro/modelos-documentos",
        description:
          "Contratos de prestação de serviço, notificações, minutas padrão.",
        icon: FileText,
      },
      {
        label: "Tabelas Auxiliares",
        href: "/cadastro/tabelas-auxiliares",
        description:
          "Bancos, moedas, índices, naturezas de recebimento/pagamento.",
        icon: Settings2,
      },
    ],
  },
];

export default function CadastroPage() {
  return (
    <motion.div
      className="w-full px-2 pb-6 pt-2 md:px-0 md:pb-8 md:pt-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* HEADER */}
      <motion.div
        className="mb-5 flex flex-col gap-4 md:mb-7 md:flex-row md:items-center md:justify-between"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Cadastros do Sistema
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
            Centralize toda a base de clientes, fornecedores, contas, planos e
            integrações do seu BPO financeiro em um único lugar, com organização
            e governança.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" className="rounded-full">
            <Link href="/cadastro/clientes-bpo">
              Novo cliente BPO
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-full"
          >
            <Link href="/cadastro/clientes-fornecedores">
              Novo cliente/fornecedor
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-full"
          >
            <Link href="/cadastro/contas-bancarias">
              Nova conta bancária
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* ACCORDIONS */}
      <Accordion
        type="multiple"
        defaultValue={groups.map((g) => g.id)}
        className="space-y-4"
      >
        {groups.map((group, index) => {
          const GroupIcon = group.icon;
          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
            >
              <Card className="overflow-hidden rounded-2xl border bg-card/60 shadow-sm backdrop-blur-sm">
                <AccordionItem value={group.id} className="border-none">
                  <AccordionTrigger className="px-4 py-3 text-left hover:no-underline md:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                        <GroupIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex flex-col text-sm md:text-base">
                        <span className="font-medium">{group.title}</span>
                        <span className="text-xs text-muted-foreground md:text-sm">
                          {group.description}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 pb-4 pt-0 md:px-6 md:pb-6">
                    <CardContent className="px-0 pb-0 pt-0">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {group.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <Link key={item.label} href={item.href}>
                              <motion.div
                                whileHover={{ y: -2, scale: 1.01 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 260,
                                  damping: 20,
                                }}
                                className="group flex h-full cursor-pointer items-center justify-between rounded-xl border bg-background/60 px-3 py-3 text-left shadow-sm ring-0 transition-all hover:border-primary/40 hover:bg-background/90 hover:shadow-md md:px-4"
                              >
                                <div className="flex flex-1 flex-col gap-1">
                                  <div className="flex items-center gap-2 text-sm font-medium md:text-base">
                                    {ItemIcon && (
                                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <ItemIcon className="h-4 w-4" />
                                      </span>
                                    )}
                                    <span>{item.label}</span>
                                  </div>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground md:text-sm">
                                      {item.description}
                                    </p>
                                  )}
                                </div>

                                <ArrowRight className="ml-3 h-4 w-4 flex-shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                              </motion.div>
                            </Link>
                          );
                        })}
                      </div>
                    </CardContent>
                  </AccordionContent>
                </AccordionItem>
              </Card>
            </motion.div>
          );
        })}
      </Accordion>
    </motion.div>
  );
}
