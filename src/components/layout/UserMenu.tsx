"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

import {
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  User2,
  Building2,
  ShieldCheck,
  Bell,
  ExternalLink,
  Moon,
  Sun,
  Laptop2,
} from "lucide-react";

/* ------------------------------- Types ----------------------------------- */

export type AppRole = "admin" | "coordenador" | "analista" | "assistente" | "convidado";

export type UserMenuItem = {
  label: string;
  href: string;
  external?: boolean;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  kbd?: string; // ex: "G P"
};

export type UserCompany = {
  codigoERP?: string | number | null;
  nomeFantasia?: string | null;
  logoUrl?: string | null;
};

export type UserMenuProps = {
  name?: string;
  email?: string | null;
  role?: AppRole;
  avatarUrl?: string | null;
  loginHref?: string; // fallback pós-logout
  onLogout?: () => void | Promise<void>;
  items?: UserMenuItem[]; // links extras
  company?: UserCompany; // empresa BPO atual
  notificationsCount?: number;
  switchCompanyHref?: string; // rota para trocar empresa (ex: "/company-selection")
  className?: string;
};

type ThemeMode = "light" | "dark" | "system";

function isThemeMode(x: string): x is ThemeMode {
  return x === "light" || x === "dark" || x === "system";
}

const DEFAULT_ITEMS: UserMenuItem[] = [
  { label: "Perfil", href: "/perfil", icon: User2 },
  { label: "Preferências", href: "/configuracoes", icon: SettingsIcon },
];

/* ------------------------------- Component -------------------------------- */

export default function UserMenu({
  name = "Usuário",
  email = null,
  role = "convidado",
  avatarUrl = null,
  loginHref = "/login",
  onLogout,
  items = DEFAULT_ITEMS,
  company,
  notificationsCount = 0,
  switchCompanyHref = "/company-selection",
  className,
}: UserMenuProps) {
  const [themeValue, setThemeValue] = React.useState<ThemeMode>("system");
  const { setTheme, theme } = useTheme();

  React.useEffect(() => {
    if (isThemeMode(theme ?? "")) {
      setThemeValue(theme as ThemeMode);
    }
  }, [theme]);

  async function handleLogout() {
    try {
      if (onLogout) {
        const r = onLogout();
        if (r && typeof (r as Promise<void>).then === "function") {
          await r;
        }
      }
    } finally {
      if (typeof window !== "undefined") window.location.href = loginHref;
    }
  }

  const initials = getInitials(name);

  return (
    <div className={cn("ml-auto flex items-center gap-2", className)}>
      {/* Nome + status */}
      <div className="hidden sm:flex flex-col items-end leading-tight">
        <span className="text-sm font-medium max-w-[220px] truncate" title={name}>
          {name}
        </span>
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          Logado
        </span>
      </div>

      {/* Trigger */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-xl pl-1 pr-2 data-[state=open]:bg-muted"
            aria-label="Abrir menu do usuário"
          >
            <span className="relative">
              <Avatar className="h-8 w-8">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={name} referrerPolicy="no-referrer" />
                ) : (
                  <AvatarFallback className="font-semibold">{initials}</AvatarFallback>
                )}
              </Avatar>

              {notificationsCount > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-medium text-white"
                  aria-label={`${notificationsCount} notificações`}
                >
                  {Math.min(notificationsCount, 99)}
                </span>
              )}
            </span>

            <ChevronDown className="h-4 w-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>

        {/* Dropdown */}
        <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-2xl p-1">
          {/* Header */}
          <DropdownMenuLabel className="flex items-start gap-3 p-3">
            <Avatar className="h-9 w-9">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={name} referrerPolicy="no-referrer" />
              ) : (
                <AvatarFallback className="font-semibold">{initials}</AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0">
              <div className="truncate font-medium" title={name}>
                {name}
              </div>
              {email && (
                <div className="truncate text-xs text-muted-foreground" title={email}>
                  {email}
                </div>
              )}
              <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> {prettyRole(role)}
              </div>
            </div>
          </DropdownMenuLabel>

          {/* Empresa atual */}
          {company && (company.nomeFantasia || company.codigoERP) && (
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href={switchCompanyHref} className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <div className="min-w-0">
                    <div className="truncate text-sm">
                      {company.nomeFantasia ?? "Empresa selecionada"}
                    </div>
                    {company.codigoERP && (
                      <div className="text-[11px] text-muted-foreground">ERP {company.codigoERP}</div>
                    )}
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}

          <DropdownMenuSeparator />

          {/* Itens extras configuráveis */}
          {items?.length ? (
            <DropdownMenuGroup>
              {items.map((it) => (
                <DropdownMenuItem key={it.href} asChild>
                  {it.external ? (
                    <a href={it.href} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2">
                      {it.icon ? <it.icon className="h-4 w-4" /> : <User2 className="h-4 w-4" />}
                      <span className="truncate">{it.label}</span>
                      <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-70" />
                    </a>
                  ) : (
                    <Link href={it.href} className="flex items-center gap-2">
                      {it.icon ? <it.icon className="h-4 w-4" /> : <User2 className="h-4 w-4" />}
                      <span className="truncate">{it.label}</span>
                      {it.kbd && <DropdownMenuShortcut>{it.kbd}</DropdownMenuShortcut>}
                    </Link>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          ) : null}

          <DropdownMenuSeparator />

          {/* Notificações */}
          <DropdownMenuItem asChild>
            <Link href="/notificacoes" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações
              {notificationsCount > 0 && (
                <span className="ml-auto rounded-md bg-rose-100 px-1.5 text-[10px] font-medium text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
                  {Math.min(notificationsCount, 99)}
                </span>
              )}
            </Link>
          </DropdownMenuItem>

          {/* Tema (claro/escuro/sistema) */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-2">
              {themeValue === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : themeValue === "light" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Laptop2 className="h-4 w-4" />
              )}
              Tema
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-44">
              <DropdownMenuRadioGroup
                value={themeValue}
                onValueChange={(v: string) => {
                  const val: ThemeMode = isThemeMode(v) ? v : "system";
                  setThemeValue(val);
                  setTheme(val);
                }}
              >
                <DropdownMenuRadioItem value="light">
                  <Sun className="mr-2 h-4 w-4" /> Claro
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <Moon className="mr-2 h-4 w-4" /> Escuro
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  <Laptop2 className="mr-2 h-4 w-4" /> Sistema
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Sair */}
          <DropdownMenuItem onClick={handleLogout} className="text-rose-700 focus:text-rose-700">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ------------------------------ Helpers ---------------------------------- */

export function UserMenuSkeleton() {
  return (
    <div className="ml-auto flex items-center gap-2">
      <div className="hidden sm:flex flex-col items-end leading-tight">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-3 w-16 animate-pulse rounded bg-muted/70" />
      </div>
      <div className="h-10 w-[92px] animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

function getInitials(fullName?: string) {
  if (!fullName) return "U";
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

function prettyRole(role?: AppRole) {
  const map: Record<AppRole, string> = {
    admin: "Administrador",
    coordenador: "Coordenador",
    analista: "Analista",
    assistente: "Assistente",
    convidado: "Convidado",
  };
  return role ? map[role] ?? "Usuário" : "Usuário";
}
