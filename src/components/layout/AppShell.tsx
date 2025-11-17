"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";

import TopbarPro from "./TopbarPro";
import { PeriodProvider } from "./PeriodContext";

import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import type { User, Session } from "@supabase/supabase-js";

// Ícones da barra de módulos
import {
  LayoutDashboard,
  FolderTree,
  FileText,
  Ship,
  ArrowUpToLine,
  CircleDollarSign,
  ReceiptText,
  CreditCard,
  Landmark,
  LineChart,
  BarChart3,
  UploadCloud,
} from "lucide-react";

/* ============================================================================
 * Constantes / helpers
 * ========================================================================== */

const HIDE_SHELL_PATHS = ["/login"] as const;

const SHELL_SKELETON = (
  <div className="min-h-dvh bg-background text-foreground flex flex-col">
    <header className="flex h-14 items-center border-b bg-card/60 px-4 md:px-6" />
    <div className="h-11 border-b bg-card/40 px-4 md:px-6" />
    <main className="px-4 py-6 md:px-8">
      <div className="h-10 w-40 rounded-full bg-muted mb-4" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="h-32 rounded-xl bg-muted" />
        <div className="h-32 rounded-xl bg-muted" />
        <div className="h-32 rounded-xl bg-muted" />
      </div>
    </main>
  </div>
);

type NavItem = {
  label: string;
  href: string;
  matchPrefix: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

/** Itens da barra de navegação logo abaixo do Topbar */
const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    matchPrefix: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Cadastros",
    href: "/cadastro",
    matchPrefix: "/cadastro",
    icon: FolderTree,
  },
  {
    label: "Fiscal",
    href: "/fiscal",
    matchPrefix: "/fiscal",
    icon: FileText,
  },
  {
    label: "Importação",
    href: "/importacoes",
    matchPrefix: "/importacoes",
    icon: Ship,
  },
  {
    label: "Exportação",
    href: "/exportacoes",
    matchPrefix: "/exportacoes",
    icon: ArrowUpToLine,
  },
  {
    label: "Contas a receber",
    href: "/contas-receber",
    matchPrefix: "/contas-receber",
    icon: CircleDollarSign,
  },
  {
    label: "Contas a pagar",
    href: "/contas-pagar",
    matchPrefix: "/contas-pagar",
    icon: ReceiptText,
  },
  {
    label: "Conciliação de cartão",
    href: "/conciliacao-cartao",
    matchPrefix: "/conciliacao-cartao",
    icon: CreditCard,
  },
  {
    label: "Conciliação Bancária",
    href: "/conciliacao-bancaria",
    matchPrefix: "/conciliacao-bancaria",
    icon: Landmark,
  },
  {
    label: "Projeções",
    href: "/projecoes",
    matchPrefix: "/projecoes",
    icon: LineChart,
  },
  {
    label: "Relatórios",
    href: "/relatorios",
    matchPrefix: "/relatorios",
    icon: BarChart3,
  },
  {
    label: "Upload de arquivos",
    href: "/upload-arquivos",
    matchPrefix: "/upload-arquivos",
    icon: UploadCloud,
  },
];

/* ============================================================================
 * Barra de navegação secundária (logo abaixo do Topbar)
 * ========================================================================== */

function SecondaryTopbarNav({ empresaNome }: { empresaNome?: string | null }) {
  const router = useRouter();
  const pathname = usePathname();

  // no momento não usamos empresaNome, mas mantemos para compatibilidade
  void empresaNome;

  return (
    <div
      className="
        sticky top-14 z-30
        px-2 md:px-6
        bg-white/80 dark:bg-neutral-900/70
        backdrop-blur-md
        border-b border-black/5 dark:border-white/10
      "
    >
      <nav
        className="
          mt-2 mb-3
          flex gap-2 overflow-x-auto
          rounded-xl
          px-2 md:px-4 py-2
          bg-white/70 dark:bg-neutral-800/70
          backdrop-blur-xl
        "
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.matchPrefix);

          const Icon = item.icon;

          const baseBtn = `
            inline-flex items-center gap-2
            rounded-full
            px-4 py-1.5
            text-sm font-medium
            whitespace-nowrap
            transition-all
            duration-150 ease-out
            border
          `;

          const activeBtn = `
            bg-white dark:bg-neutral-700
            text-neutral-900 dark:text-white
            border-black/10 dark:border-white/15
            shadow-[0_2px_6px_rgba(15,23,42,0.18)]
            scale-[1.01]
          `;

          const inactiveBtn = `
            bg-transparent
            text-neutral-700 dark:text-neutral-300
            border-transparent
            hover:bg-white/80 hover:dark:bg-neutral-700/50
            hover:text-neutral-900 hover:dark:text-white
            hover:border-black/5 hover:dark:border-white/10
            hover:shadow-[0_2px_4px_rgba(15,23,42,0.12)]
          `;

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`${baseBtn} ${isActive ? activeBtn : inactiveBtn}`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}




/* ============================================================================
 * AppShell
 * ========================================================================== */

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  const shouldHideShell = HIDE_SHELL_PATHS.includes(
    pathname as (typeof HIDE_SHELL_PATHS)[number]
  );

  React.useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (!session && pathname !== "/login") {
        router.replace("/login");
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (!session && pathname !== "/login") {
        router.replace("/login");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router, supabase]);

  // Login não usa AppShell
  if (shouldHideShell) {
    return <>{children}</>;
  }

  if (loading) {
    return SHELL_SKELETON;
  }

  // user para o TopbarPro (usa metadata do Supabase)
  const uiUser = React.useMemo(
    () => ({
      name:
        (user?.user_metadata as any)?.full_name ??
        user?.email ??
        "Usuário",
      avatarUrl:
        (user?.user_metadata as any)?.avatar_url ?? null,
      role: (user?.app_metadata as any)?.role ?? null,
    }),
    [user]
  );

  // empresa inicial (TopbarPro depois busca empresas no banco e atualiza)
  const empresaInicial = React.useMemo(
    () => ({
      nome_fantasia: null,
      razao_social: null,
      cpf_cnpj: null,
      logo_url: null,
      codigo_erp: null,
    }),
    []
  );

  const handleLogout = React.useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  }, [router, supabase]);

  return (
    <PeriodProvider>
      <div className="min-h-dvh bg-background text-foreground flex flex-col">
        {/* Topbar COMPLETO que você já tem */}
        <TopbarPro
          empresa={empresaInicial}
          user={uiUser}
          onLogout={handleLogout}
        />

        {/* Barra de módulos fixa com efeito 3D e ícones */}
        <SecondaryTopbarNav />


        {/* Conteúdo principal */}
        <main className="flex-1 px-4 py-4 md:px-8 md:py-6">
          {children}
        </main>
      </div>
    </PeriodProvider>
  );
}

