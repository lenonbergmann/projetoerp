"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";

import SidebarRailPro from "./SidebarRailPro";
import TopbarPro from "./TopbarPro";
import { PeriodProvider } from "./PeriodContext";

import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

import type { AppRole, FeatureFlag } from "./menu";
import { ALL_FLAGS } from "./menu";

/* ============================== Constantes ============================== */
const HIDE_SHELL_PATHS = ["/login"] as const;

const SHELL_SKELETON = (
  <div className="min-h-dvh bg-white text-gray-900">
    <div className="flex h-14 items-center border-b px-4 md:px-6" />
    <main className="mx-auto max-w-[1600px] px-3 py-4 md:px-6 md:py-6">
      <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
      <div className="mt-4 h-4 w-96 animate-pulse rounded bg-gray-200" />
    </main>
  </div>
);

/* ============================== Helpers ============================== */
function safeGetCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split("; ");
  for (const p of parts) {
    const [k, ...rest] = p.split("=");
    if (decodeURIComponent(k) === name) return decodeURIComponent(rest.join("="));
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
function formatCpfCnpj(raw?: string | null) {
  if (!raw) return "";
  const digits = (raw.match(/\d/g) || []).join("");
  if (digits.length === 11)
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (digits.length === 14)
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
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

  const hideChrome = React.useMemo(
    () => HIDE_SHELL_PATHS.some((p) => (pathname || "").startsWith(p)),
    [pathname]
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
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const sess = data.session ?? null;
        setUser(sess?.user ?? null);
      } finally {
        if (mounted) setAuthChecked(true);
      }
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
  }, [authChecked, user, pathname, router]);

  /* ----------------------- Empresa (cookies + DB) ---------------------- */
  React.useEffect(() => {
    let mounted = true;

    const id = safeGetCookie("empresaId");
    const nome = safeGetCookie("empresaNomeFantasia") || safeGetCookie("empresaNome") || null;
    const razao = safeGetCookie("empresaRazaoSocial");
    const doc = safeGetCookie("empresaCpfCnpj");
    const logo = safeGetCookie("empresaLogoUrl");

    setEmpresaId(id);

    if (nome || razao || doc || logo) {
      setEmpresa({
        nome_fantasia: nome,
        razao_social: razao,
        cpf_cnpj: doc,
        logo_url: logo,
      });
    }

    (async () => {
      if (!id) return;
      if (nome && razao && doc && logo) return;

      const db = await fetchEmpresaRobusta(supabase, id);
      if (!mounted || !db) return;

      setEmpresa((prev) => ({
        nome_fantasia: db.nome_fantasia ?? prev.nome_fantasia,
        razao_social: db.razao_social ?? prev.razao_social,
        cpf_cnpj: db.cpf_cnpj ?? prev.cpf_cnpj,
        logo_url: db.logo_url ?? prev.logo_url,
      }));
    })().catch(() => {});
    return () => {
      mounted = false;
    };
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

  const handleLogout = React.useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      router.replace("/login");
    }
  }, [router, supabase]);

  const handleTrocarEmpresa = React.useCallback(() => {
    router.push("/selecionar-empresa");
  }, [router]);

  if (hideChrome) return <>{children}</>;
  if (!authChecked) return SHELL_SKELETON;

  return (
    <PeriodProvider>
      <div className="min-h-dvh">
        <div className="hidden md:block">
          <SidebarRailPro
            role={role}
            enabledFlags={enabledFlags}
            empresaCodigoERP={empresaId}
            topOffset={90}
            railGutter={12}
            collapsedWidth={64}
            expandWidth={300}
            defaultExpanded
          />
        </div>

        {/* Drawer mobile */}
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
            />
          </div>
        </div>

        {/* Wrapper principal */}
        <div
          className="
            flex min-h-dvh flex-col
            ml-0 md:ml-[var(--sidebar-width,64px)]
            transition-[margin] md:transition-[margin]
            duration-200 ease-out
          "
        >
          <TopbarPro
            empresa={{
              nome_fantasia: nomeFantasia,
              razao_social: razaoSocial,
              cpf_cnpj: cpfCnpjFmt,
              logo_url: empresa.logo_url,
            }}
            user={{ name: displayName, avatarUrl, role }}
            onLogout={handleLogout}
            onTrocarEmpresa={handleTrocarEmpresa}
            onOpenMenu={() => setDrawerOpen(true)}
          />

          <main className="min-w-0 flex-1 bg-gray-50/50">
            <div className="mx-auto max-w-[1600px] px-3 py-4 md:px-6 md:py-6">{children}</div>
          </main>
        </div>
      </div>
    </PeriodProvider>
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
