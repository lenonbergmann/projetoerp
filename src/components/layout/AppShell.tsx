// src/components/layout/AppShell.tsx
"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

// Sidebar fixa que colapsa/expande e atualiza --sidebar-width
import SidebarRailPro from "./SidebarRailPro";

import UserMenu from "./UserMenu";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

// tipos/flags do menu (para passar ao SidebarRailPro)
import type { AppRole, FeatureFlag } from "./menu";
import { ALL_FLAGS } from "./menu";

/* ============================== Helpers ============================== */
function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (const c of cookies) {
    const [k, ...rest] = c.split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function nameFromEmail(email?: string | null) {
  if (!email) return "Usuário";
  const base = email.split("@")[0] || "Usuário";
  return base
    .split(/[._-]+/i)
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : ""))
    .join(" ");
}

/** Formata CPF (11) ou CNPJ (14) */
function formatCpfCnpj(raw?: string | null) {
  if (!raw) return "";
  const digits = (raw.match(/\d/g) || []).join("");
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return raw;
}

/* ================================ Types =============================== */
type EmpresaInfo = {
  nome_fantasia: string | null;
  razao_social: string | null;
  cpf_cnpj: string | null;
  logo_url: string | null;
};

/* ============================= AppShell ============================== */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = React.useMemo(() => createClientComponentClient(), []);

  const HIDE_SHELL_PATHS = React.useMemo(() => ["/login"], []);
  const hideChrome = React.useMemo(
    () => HIDE_SHELL_PATHS.some((p) => (pathname || "").startsWith(p)),
    [HIDE_SHELL_PATHS, pathname]
  );

  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Auth state
  const [user, setUser] = React.useState<User | null>(null);
  const [authChecked, setAuthChecked] = React.useState(false);

  // Empresa state
  const [empresaId, setEmpresaId] = React.useState<string | null>(null);
  const [empresa, setEmpresa] = React.useState<EmpresaInfo>({
    nome_fantasia: null,
    razao_social: null,
    cpf_cnpj: null,
    logo_url: null,
  });

  /* ------------------------ Sessão do usuário ------------------------ */
  React.useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const sess = data.session ?? null;
      setUser(sess?.user ?? null);
      setAuthChecked(true);
    }

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
        setAuthChecked(true);
      }
    );

    bootstrap();

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [supabase]);

  /* -------------------- Proteção de rotas (client-side) -------------------- */
  React.useEffect(() => {
    if (!authChecked) return;
    const isPublic = HIDE_SHELL_PATHS.some((p) => (pathname || "").startsWith(p));
    if (!user && !isPublic) router.replace("/login");
  }, [authChecked, user, pathname, HIDE_SHELL_PATHS, router]);

  /* ----------------------- Empresa (cookies + DB) ---------------------- */
  React.useEffect(() => {
    const id = getCookie("empresaId");
    setEmpresaId(id);

    const nome = getCookie("empresaNomeFantasia") || getCookie("empresaNome") || null;
    const razao = getCookie("empresaRazaoSocial");
    const doc = getCookie("empresaCpfCnpj");
    const logo = getCookie("empresaLogoUrl");

    // Pré-hidrata com cookies (evita “salto” visual)
    if (nome || razao || doc || logo) {
      setEmpresa({
        nome_fantasia: nome,
        razao_social: razao,
        cpf_cnpj: doc,
        logo_url: logo,
      });
    }

    // Busca no banco se faltar algo essencial
    if (id && (!nome || !razao || !doc || !logo)) {
      fetchEmpresaRobusta(supabase, id)
        .then((db) => {
          if (!db) return;
          setEmpresa((prev) => ({
            nome_fantasia: db.nome_fantasia ?? prev.nome_fantasia,
            razao_social: db.razao_social ?? prev.razao_social,
            cpf_cnpj: db.cpf_cnpj ?? prev.cpf_cnpj,
            logo_url: db.logo_url ?? prev.logo_url,
          }));
        })
        .catch(() => {
          /* silencioso */
        });
    }
  }, [pathname, supabase]);

  /* --------------------- Computados de exibição ---------------------- */
  const displayName = React.useMemo(() => {
    const md = (user?.user_metadata || {}) as Record<string, any>;
    return md.full_name || md.name || md.user_name || nameFromEmail(user?.email);
  }, [user]);

  const avatarUrl = React.useMemo(() => {
    const md = (user?.user_metadata || {}) as Record<string, any>;
    return md.avatar_url || md.picture || null;
  }, [user]);

  // role do usuário (app_metadata > user_metadata > "convidado")
  const role: AppRole = React.useMemo(() => {
    const am = (user?.app_metadata || {}) as Record<string, any>;
    const um = (user?.user_metadata || {}) as Record<string, any>;
    return (am.role ?? um.role ?? "convidado") as AppRole;
  }, [user]);

  const enabledFlags: FeatureFlag[] = ALL_FLAGS;

  const nomeFantasia =
    empresa.nome_fantasia ?? (empresaId ? `Empresa ${empresaId}` : "Nenhuma selecionada");
  const razaoSocial = empresa.razao_social ?? "";
  const cpfCnpjFmt = formatCpfCnpj(empresa.cpf_cnpj);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleTrocarEmpresa = () => {
    router.push("/selecionar-empresa");
  };

  /* ------------------- Sem chrome nas rotas públicas ------------------ */
  if (hideChrome) return <>{children}</>;

  /* ------------------------- Placeholder seguro ----------------------- */
  if (!authChecked) {
    return (
      <div className="min-h-dvh bg-white text-gray-900">
        <div className="flex h-14 items-center border-b px-4 md:px-6" />
        <main className="mx-auto max-w-[1600px] px-3 py-4 md:px-6 md:py-6">
          <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 h-4 w-96 animate-pulse rounded bg-gray-200" />
        </main>
      </div>
    );
  }

  /* =============================== UI ================================ */
  return (
    <div className="min-h-dvh">
      {/* Sidebar fixa (desktop). Ela atualiza --sidebar-width (colapsada/expandida) */}
      <div className="hidden md:block">
        <SidebarRailPro
          role={role}
          enabledFlags={enabledFlags}
          empresaCodigoERP={empresaId}
          topOffset={90}        // altura do header para não sobrepor
          railGutter={12}       // “gutter” quando o texto colapsa atrás do ícone
          collapsedWidth={64}   // largura só de ícones
          expandWidth={300}     // largura expandida
          defaultExpanded        // começa expandida (estilo ChatGPT)
        />
      </div>

      {/* Drawer mobile (overlay) */}
      <div
        className={[
          "fixed inset-0 z-40 md:hidden transition",
          drawerOpen ? "visible" : "invisible",
        ].join(" ")}
        aria-hidden={!drawerOpen}
      >
        <div
          className={[
            "absolute inset-0 bg-black/40 transition-opacity",
            drawerOpen ? "opacity-100" : "opacity-0",
          ].join(" ")}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={[
            "absolute inset-y-0 left-0 w-72 bg-white border-r shadow-xl transition-transform outline-none",
            drawerOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
          tabIndex={-1}
        >
          <SidebarRailPro
            role={role}
            enabledFlags={enabledFlags}
            empresaCodigoERP={empresaId}
            onNavigate={() => setDrawerOpen(false)}
            // no mobile, pode manter os defaults internos
          />
        </div>
      </div>

      {/* Wrapper que EMPURRA Header + Main (igual ChatGPT) */}
      <div
        className="
          flex min-h-dvh flex-col
          ml-0 md:ml-[var(--sidebar-width,64px)]
          transition-[margin] md:transition-[margin]
          duration-200 ease-out
        "
      >
        {/* Header fixo (também empurrado) */}
        <header
          className="
            sticky top-0 z-50
            grid grid-cols-[auto_1fr_auto] items-center gap-2
            border-b bg-white/80 px-3 py-2
            backdrop-blur supports-[backdrop-filter]:bg-white/60
            md:px-6
          "
        >
          {/* Esquerda: menu mobile */}
          <div className="flex items-center gap-3">
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border md:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menu"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Centro: empresa (logo + textos + botão Alterar) */}
          <div className="justify-self-center">
            <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2">
              {/* Logo */}
              <div className="relative h-10 w-10 md:h-14 md:w-14 overflow-hidden rounded-md border bg-white">
                {empresa.logo_url ? (
                  <Image
                    src={empresa.logo_url}
                    alt="Logo da empresa"
                    fill
                    sizes="56px"
                    className="object-contain"
                    priority={false}
                  />
                ) : (
                  <svg className="h-full w-full p-2 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <rect x="3" y="7" width="18" height="13" rx="2" strokeWidth="2" />
                    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" strokeWidth="2" />
                  </svg>
                )}
              </div>

              {/* textos */}
              <div className="flex min-w-0 flex-col items-center text-center">
                <div className="max-w-[44ch] truncate text-sm font-bold text-indigo-900">
                  {nomeFantasia}
                </div>
                {razaoSocial ? (
                  <div className="max-w-[48ch] truncate text-xs text-indigo-800/90">{razaoSocial}</div>
                ) : null}
                <div className="text-[11px] leading-none text-indigo-700/80">
                  {cpfCnpjFmt || "CPF/CNPJ não informado"}
                </div>
              </div>

              {/* botão Alterar */}
              <button
                className="ml-2 inline-flex h-8 items-center gap-2 rounded-md border px-2 text-xs hover:bg-gray-50"
                onClick={handleTrocarEmpresa}
                title="Trocar empresa"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M4 7h11M10 17H21" strokeWidth="2" strokeLinecap="round" />
                  <path d="M7 4l-3 3 3 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M17 14l3 3-3 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Alterar
              </button>
            </div>
          </div>

          {/* Direita: usuário */}
          <UserMenu name={displayName} avatarUrl={avatarUrl} onLogout={handleLogout} />
        </header>

        {/* Conteúdo */}
        <main className="min-w-0 flex-1 bg-gray-50/50">
          <div className="mx-auto max-w-[1600px] px-3 py-4 md:px-6 md:py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

/* ============================ Data fetch ============================ */
async function fetchEmpresaRobusta(
  supabase: ReturnType<typeof createClientComponentClient>,
  empresaId: string
): Promise<EmpresaInfo | null> {
  const asNumber = Number(empresaId);
  const isNumeric = Number.isFinite(asNumber);

  if (isNumeric) {
    const { data, error } = await supabase
      .from("empresas_bpo")
      .select("nome_fantasia, razao_social, cpf_cnpj, logo_url")
      .eq("codigo_erp", asNumber)
      .maybeSingle();

    if (!error && data) return data as EmpresaInfo;
  }

  const { data, error } = await supabase
    .from("empresas_bpo")
    .select("nome_fantasia, razao_social, cpf_cnpj, logo_url")
    .eq("id", empresaId)
    .maybeSingle();

  if (!error && data) return data as EmpresaInfo;

  return null;
}
