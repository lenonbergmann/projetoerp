// src/components/layout/AppTopbarServer.tsx
import * as React from "react";
import { cookies as nextCookies } from "next/headers";
import { createServerComponentClient } from "@/lib/supabase/serverClient";
import UserMenuBridge from "@/components/layout/UserMenuBridge";

type Role = "admin" | "coordenador" | "analista" | "assistente" | "convidado";

export default async function AppTopbarServer() {
  const supabase = createServerComponentClient();

  // 1) Sessão/usuário
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Defaults
  let name: string = "Usuário";
  let email: string | null = null;
  let role: Role = "convidado";

  // 2) Perfil (apenas se houver user.id)
  if (user?.id) {
    email = user.email ?? null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, avatar_url, role")
      .eq("id", user.id)
      .maybeSingle();

    name = profile?.name ?? email ?? "Usuário";
    role = (profile?.role ?? "convidado") as Role;
  }

  // 3) Empresa atual via cookie -> fallback para vínculo padrão do usuário
  const cookieStore = await nextCookies();
  const empresaCookie = cookieStore.get("empresa_bpo")?.value;
  let empresaCodigo: string | number | null = empresaCookie ?? null;

  if (!empresaCodigo && user?.id) {
    const { data: vinculos } = await supabase
      .from("users_empresas_bpo")
      .select("empresa_codigo_erp")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .limit(1);

    empresaCodigo = vinculos?.[0]?.empresa_codigo_erp ?? null;
  }

  // 4) Dados da empresa (condicional)
  let empresaNome: string | null = null;
  if (empresaCodigo) {
    const { data: empresa } = await supabase
      .from("empresas_bpo")
      .select("nome_fantasia")
      .eq("codigo_erp", empresaCodigo)
      .maybeSingle();

    empresaNome = empresa?.nome_fantasia ?? null;
  }

  // 5) Render
  return (
    <div className="flex items-center gap-3">
      <UserMenuBridge
        name={name}
        email={email}
        role={role}
        company={{
          nomeFantasia: empresaNome,
          codigoERP: empresaCodigo,
        }}
      />
    </div>
  );
}
