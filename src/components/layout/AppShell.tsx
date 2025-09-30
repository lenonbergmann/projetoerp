// src/components/layout/AppShell.tsx
"use client";

import * as React from "react";
// import Link from "next/link"; // ⛔ removido, não é usado aqui
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import UserMenu from "./UserMenu";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

/* ----------------------------- helpers ----------------------------- */
function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function nameFromEmail(email?: string | null) {
  if (!email) return "Usuário";
  const base = email.split("@")[0] || "Usuário";
  return base
    .split(/[._-]+/)
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : ""))
    .join(" ");
}

/** Formata CPF (11) ou CNPJ (14) */
function formatCpfCnpj(raw?: string | null) {
  if (!raw) return "";
  const digits = (raw.match(/\d/g) || []).join("");
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return raw; // mantém como veio se tamanho desconhecido
}

/* ------------------------------ types ------------------------------ */
type EmpresaInfo = {
  nome_fantasia: string | null;
  razao_social: string | null;
  cpf_cnpj: string | null;
  logo_url: string | null;
};

/* ---------------------------- componente --------------------------- */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);

  const [empresaId, setEmpresaId] = React.useState<string | null>(null);
  const [empresa, setEmpresa] = React.useState<EmpresaInfo>({
    nome_fantasia: null,
    razao_social: null,
    cpf_cnpj: null,
    logo_url: null,
  });

  const router = useRouter();
  const pathname = usePathname();

  // Rotas sem chrome
  const HIDE_SHELL_PATHS = ["/login"];
  const hideChrome = HIDE_SHELL_PATHS.some((p) => pathname?.startsWith(p));

  const supabase = React.useMemo(() => createClientComponentClient(), []);

  // usuário
  React.useEffect(() => {
    let mounted = true;
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (mounted) setUser(data.user ?? null);
    }
    load();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // empresa (cookies -> supabase)
  React.useEffect(() => {
    const id = getCookie("empresaId");
    setEmpresaId(id);

    const nomeCookie =
      getCookie("empresaNomeFantasia") || getCookie("empresaNome") || null;
    const razaoCookie = getCookie("empresaRazaoSocial");
    const cpfCnpjCookie = getCookie("empresaCpfCnpj");
    const logoCookie = getCookie("empresaLogoUrl");

    if (nomeCookie || razaoCookie || cpfCnpjCookie || logoCookie) {
      setEmpresa({
        nome_fantasia: nomeCookie,
        razao_social: razaoCookie,
        cpf_cnpj: cpfCnpjCookie,
        logo_url: logoCookie,
      });
    }

    // faltou algo? busca no banco (por id OU codigo_erp)
    if (id && (!nomeCookie || !razaoCookie || !cpfCnpjCookie || !logoCookie)) {
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

  // nome do usuário (nunca e-mail)
  const displayName =
    (user?.user_metadata as any)?.full_name ||
    (user?.user_metadata as any)?.name ||
    (user?.user_metadata as any)?.user_name ||
    nameFromEmail(user?.email);

  const avatarUrl =
    (user?.user_metadata as any)?.avatar_url ||
    (user?.user_metadata as any)?.picture ||
    null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleTrocarEmpresa = () => {
    router.push("/selecionar-empresa");
  };

  if (hideChrome) {
    return <>{children}</>;
  }

  const nomeFantasia =
    empresa.nome_fantasia ?? (empresaId ? `Empresa ${empresaId}` : "Nenhuma selecionada");
  const razaoSocial = empresa.razao_social ?? "";
  const cpfCnpjFmt = formatCpfCnpj(empresa.cpf_cnpj);

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar desktop */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Drawer mobile */}
      <div className={["fixed inset-0 z-40 md:hidden transition", open ? "visible" : "invisible"].join(" ")}>
        <div
          className={["absolute inset-0 bg-black/40 transition-opacity", open ? "opacity-100" : "opacity-0"].join(" ")}
          onClick={() => setOpen(false)}
        />
        <div
          className={[
            "absolute inset-y-0 left-0 w-72 bg-white border-r shadow-xl transition-transform",
            open ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <Sidebar onNavigate={() => setOpen(false)} />
        </div>
      </div>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header FIXO com 3 regiões: esquerda (menu mobile), centro (empresa), direita (usuário) */}
        <header
          className="
            sticky top-0 z-50
            grid grid-cols-[auto_1fr_auto] items-center gap-2
            border-b bg-white/80 px-3 py-2
            backdrop-blur supports-[backdrop-filter]:bg-white/60
            md:px-6
          "
        >
          {/* Esquerda: apenas o botão do menu mobile */}
          <div className="flex items-center gap-3">
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Abrir menu"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 6h18M3 12h18M3 18h18" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Centro: BLOCO CENTRALIZADO com logo + textos + botão Alterar */}
          <div className="justify-self-center">
            <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2">
              {/* logo */}
              <div className="flex h-10 w-10 md:h-14 md:w-14 items-center justify-center overflow-hidden rounded-md border bg-white">
                {empresa.logo_url ? (
                  <img
                    src={empresa.logo_url}
                    alt="Logo da empresa"
                    className="h-full w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <svg className="h-5 w-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="7" width="18" height="13" rx="2" strokeWidth="2" />
                    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" strokeWidth="2" />
                  </svg>
                )}
              </div>

              {/* textos centralizados */}
              <div className="flex min-w-0 flex-col items-center text-center">
                <div className="max-w-[44ch] truncate text-sm font-bold text-indigo-900">
                  {nomeFantasia}
                </div>
                {razaoSocial ? (
                  <div className="max-w-[48ch] truncate text-xs text-indigo-800/90">
                    {razaoSocial}
                  </div>
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
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M4 7h11M10 17H21" strokeWidth="2" strokeLinecap="round" />
                  <path d="M7 4l-3 3 3 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M17 14l3 3-3 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Alterar
              </button>
            </div>
          </div>

          {/* Direita: usuário */}
          <UserMenu
            name={displayName}
            avatarUrl={avatarUrl}
            onLogout={handleLogout}
          />
        </header>

        <main className="min-w-0 flex-1 bg-gray-50/50">
          <div className="mx-auto max-w-[1600px] px-3 py-4 md:px-6 md:py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

/* ------------------------- data fetch (robusto) ------------------------- */
/**
 * Tenta buscar a empresa por `id`; se não achar, tenta por `codigo_erp`.
 * Ajuste os nomes das colunas se seu schema divergir.
 */
async function fetchEmpresaRobusta(
  supabase: ReturnType<typeof createClientComponentClient>,
  empresaId: string
): Promise<EmpresaInfo | null> {
  // 1) tenta por id
  let { data, error } = await supabase
    .from("empresas_bpo")
    .select("nome_fantasia, razao_social, cpf_cnpj, logo_url")
    .eq("id", empresaId)
    .maybeSingle();

  // 2) se não veio, tenta por codigo_erp
  if ((error || !data) && empresaId) {
    const res = await supabase
      .from("empresas_bpo")
      .select("nome_fantasia, razao_social, cpf_cnpj, logo_url")
      .eq("codigo_erp", empresaId)
      .maybeSingle();
    data = res.data as any;
  }

  return (data as any) ?? null;
}
