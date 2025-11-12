// src/components/layout/TopbarPro.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";

import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandEmpty,
} from "@/components/ui/command";

import {
  Menu as MenuIcon,
  Search,
  Calendar,
  Plus,
  Bell,
  Sun,
  Moon,
  LayoutGrid,
} from "lucide-react";

import { DateRangePicker } from "@/components/layout/DateRangePicker";
import { usePeriod, usePeriodLabel, PeriodPreset } from "@/components/layout/PeriodContext";

/* ============================== Helpers ============================== */

function initialsFromName(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("");
  return (initials || "U").toUpperCase();
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split("; ");
  for (const p of parts) {
    const [k, ...rest] = p.split("=");
    if (decodeURIComponent(k) === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/* ========================= Notifications hook ========================= */

type Notification = {
  id: string;
  title: string;
  body?: string | null;
  created_at: string;
  read_at?: string | null;
};

function useNotifications(empresaId: string | null) {
  const supabase = React.useMemo(() => createClientComponentClient(), []);
  const [items, setItems] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchAll = React.useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, created_at, read_at")
        .eq("empresa_codigo_erp", empresaId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setItems(data as Notification[]);
    } finally {
      setLoading(false);
    }
  }, [empresaId, supabase]);

  const markAsRead = React.useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (!error) {
        setItems((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
        );
      }
    },
    [supabase]
  );

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { items, loading, fetchAll, markAsRead };
}

/* ============================= TopbarPro ============================== */

export default function TopbarPro({
  empresa,
  user,
  onLogout,
  onTrocarEmpresa,
  onOpenMenu,
}: {
  empresa: {
    nome_fantasia?: string | null;
    razao_social?: string | null;
    cpf_cnpj?: string | null;
    logo_url?: string | null;
  };
  user: { name: string; avatarUrl?: string | null; role?: string | null };
  onLogout: () => void;
  onTrocarEmpresa: () => void;
  onOpenMenu: () => void;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // -------- Period Context --------
  const { period, setPreset, setCustom } = usePeriod(); // period.{from,to}
  const periodLabel = usePeriodLabel();
  const safeStart = period.from ?? new Date();
  const safeEnd   = period.to   ?? safeStart;
  const presets: PeriodPreset[] = [
    "Hoje",
    "Ontem",
    "Últimos 7 dias",
    "Últimos 30 dias",
    "Este mês",
    "Mês passado",
  ];
  const [openPeriod, setOpenPeriod] = React.useState(false);

  // -------- Command Palette (real) --------
  const supabase = React.useMemo(() => createClientComponentClient(), []);
  const [openCmd, setOpenCmd] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loadingCmd, setLoadingCmd] = React.useState(false);
  const [resultFornec, setResultFornec] = React.useState<
    Array<{ id: string; nome: string; doc?: string }>
  >([]);
  const [resultCP, setResultCP] = React.useState<
    Array<{ id: string; descricao: string; valor?: number | null }>
  >([]);
  const [resultCR, setResultCR] = React.useState<
    Array<{ id: string; descricao: string; valor?: number | null }>
  >([]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key?.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === "k") {
        e.preventDefault();
        setOpenCmd((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  React.useEffect(() => {
    if (!openCmd) return;
    if (query.trim().length < 2) {
      setResultFornec([]);
      setResultCP([]);
      setResultCR([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setLoadingCmd(true);
        {
          const { data } = await supabase
            .from("clientes_fornecedores")
            .select("id, nome, documento")
            .or(`nome.ilike.%${query}%,documento.ilike.%${query}%`)
            .limit(10);
          setResultFornec(
            (data || []).map((r: any) => ({
              id: String(r.id),
              nome: r.nome ?? "(sem nome)",
              doc: r.documento ?? undefined,
            }))
          );
        }
        {
          const { data } = await supabase
            .from("contas_pagar")
            .select("id, descricao, valor")
            .or(`descricao.ilike.%${query}%,numero_doc.ilike.%${query}%`)
            .limit(8);
          setResultCP(
            (data || []).map((r: any) => ({
              id: String(r.id),
              descricao: r.descricao ?? "(sem descrição)",
              valor: r.valor ?? null,
            }))
          );
        }
        {
          const { data } = await supabase
            .from("contas_receber")
            .select("id, descricao, valor")
            .or(`descricao.ilike.%${query}%,numero_doc.ilike.%${query}%`)
            .limit(8);
          setResultCR(
            (data || []).map((r: any) => ({
              id: String(r.id),
              descricao: r.descricao ?? "(sem descrição)",
              valor: r.valor ?? null,
            }))
          );
        }
      } finally {
        setLoadingCmd(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [openCmd, query, supabase]);

  // -------- Notifications --------
  const empresaId = getCookie("empresaId");
  const { items: notifications, markAsRead, fetchAll } = useNotifications(empresaId);

  const initials = initialsFromName(user.name);
  const env = (process.env.NEXT_PUBLIC_APP_ENV || "").toUpperCase();
  const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;

  return (
    <div className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between gap-2 px-3 md:px-6">
        {/* Esquerda */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 md:hidden"
            onClick={onOpenMenu}
            aria-label="Abrir menu"
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-card">
            <LayoutGrid className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {empresa.nome_fantasia ?? "Empresa"}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {empresa.cpf_cnpj ?? ""}
              </div>
            </div>
            <Button size="sm" variant="outline" className="ml-1 text-xs" onClick={onTrocarEmpresa}>
              Trocar
            </Button>
          </div>
        </div>

        {/* Centro */}
        <div className="flex flex-1 justify-center">
          <button
            onClick={() => setOpenCmd(true)}
            className="group hidden md:inline-flex h-9 w-[360px] items-center gap-2 rounded-md border bg-muted/40 px-3 text-left text-sm text-muted-foreground hover:bg-muted"
          >
            <Search className="h-4 w-4 opacity-70" />
            <span className="flex-1 truncate">Buscar (Ctrl/⌘ + K)</span>
          </button>
        </div>

        {/* Direita */}
        <div className="flex items-center gap-1">
          <Popover open={openPeriod} onOpenChange={setOpenPeriod}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="h-9 px-2">
                      <Calendar className="h-4 w-4" />
                      <span className="ml-2 hidden sm:block text-sm">{periodLabel}</span>
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Selecionar período global</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <PopoverContent align="end" className="w-72">
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-1">
                  {presets.map((p) => (
                    <Button
                      key={p}
                      variant="ghost"
                      className="justify-start"
                      onClick={() => {
                        setPreset(p);
                        setOpenPeriod(false);
                      }}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
                <div className="rounded-md border p-2">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    Personalizado
                  </div>

                  {/* ✅ valor no formato { start, end } */}
                  <DateRangePicker
                    value={{ start: safeStart, end: safeEnd }}
                    onChange={(start: Date | null, end: Date | null) => {
                      setCustom(start, end);
                    }}
                    onApply={() => setOpenPeriod(false)}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-9 px-2">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Novo registro</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/contas-pagar/novo")}>
                Título a pagar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/contas-receber/novo")}>
                Título a receber
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/cadastro/clientes-fornecedores/novo")}
              >
                Cliente/Fornecedor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 px-2">
                <Bell className="h-4 w-4" />
                {notifications.some((n) => !n.read_at) && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notificações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">Sem notificações.</div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-auto p-2">
                  {notifications.map((n) => (
                    <div key={n.id} className="rounded-md border p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">{n.title}</div>
                          {n.body ? (
                            <div className="text-xs text-muted-foreground">{n.body}</div>
                          ) : null}
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {new Date(n.created_at).toLocaleString("pt-BR")}
                          </div>
                        </div>
                        {!n.read_at ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7"
                            onClick={() => markAsRead(n.id)}
                          >
                            Marcar lida
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="h-6 text-[10px]">
                            Lida
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="p-2">
                <Button variant="outline" className="w-full" onClick={fetchAll}>
                  Atualizar
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 px-2"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Alternar tema</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 pl-1 pr-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="ml-2 hidden flex-col items-start leading-tight sm:flex">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-[11px] text-muted-foreground capitalize">
                    {user.role ?? "Usuário"}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/perfil")}>Perfil</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/config")}>
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {env && <Badge className="ml-1 hidden md:inline-flex">{env}</Badge>}
          <Badge
            variant={isOnline ? "secondary" : "destructive"}
            className="ml-1 hidden md:inline-flex"
          >
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>
      </div>

      {/* Command Palette */}
      <CommandDialog open={openCmd} onOpenChange={setOpenCmd}>
        <div className="px-2 pt-2">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar fornecedores, contas a pagar/receber..."
          />
        </div>
        <CommandList>
          <CommandEmpty>{loadingCmd ? "Buscando..." : "Nada encontrado."}</CommandEmpty>

          <CommandGroup heading="Navegação">
            <CommandItem onSelect={() => router.push("/")}>Dashboard</CommandItem>
            <CommandItem onSelect={() => router.push("/contas-pagar")}>
              Contas a Pagar
            </CommandItem>
            <CommandItem onSelect={() => router.push("/contas-receber")}>
              Contas a Receber
            </CommandItem>
            <CommandItem onSelect={() => router.push("/conciliacao-bancaria")}>
              Conciliação Bancária
            </CommandItem>
            <CommandItem onSelect={() => router.push("/fiscal")}>Fiscal</CommandItem>
          </CommandGroup>

          {resultFornec.length > 0 && (
            <CommandGroup heading="Fornecedores / Clientes">
              {resultFornec.map((f) => (
                <CommandItem
                  key={`forn-${f.id}`}
                  onSelect={() => router.push(`/cadastro/clientes-fornecedores/${f.id}`)}
                >
                  {f.nome}
                  {f.doc ? (
                    <span className="ml-auto text-xs text-muted-foreground">{f.doc}</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {resultCP.length > 0 && (
            <CommandGroup heading="Contas a Pagar">
              {resultCP.map((t) => (
                <CommandItem
                  key={`cp-${t.id}`}
                  onSelect={() => router.push(`/contas-pagar/${t.id}`)}
                >
                  {t.descricao}
                  {t.valor != null ? (
                    <span className="ml-auto text-xs text-muted-foreground">
                      R$ {Number(t.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {resultCR.length > 0 && (
            <CommandGroup heading="Contas a Receber">
              {resultCR.map((t) => (
                <CommandItem
                  key={`cr-${t.id}`}
                  onSelect={() => router.push(`/contas-receber/${t.id}`)}
                >
                  {t.descricao}
                  {t.valor != null ? (
                    <span className="ml-auto text-xs text-muted-foreground">
                      R$ {Number(t.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
