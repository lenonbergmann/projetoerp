// src/components/layout/UserMenuBridge.tsx
"use client";

import * as React from "react";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import UserMenu from "./UserMenu";

type Role = "admin" | "coordenador" | "analista" | "assistente" | "convidado";

export default function UserMenuBridge(props: {
  name: string;
  email: string | null;
  role: Role;
  company?: { nomeFantasia?: string | null; codigoERP?: string | number | null } | null;
}) {
  const supabase = createClientComponentClient();

  return (
    <UserMenu
      name={props.name}
      email={props.email}
      role={props.role}
      company={{
        nomeFantasia: props.company?.nomeFantasia ?? undefined,
        codigoERP: props.company?.codigoERP ?? undefined,
      }}
      items={[
        { label: "Perfil", href: "/perfil" },
        { label: "Preferências", href: "/configuracoes" },
      ]}
      onLogout={async () => {
        await supabase.auth.signOut();
      }}
      loginHref="/login"
    />
  );
}
