// src/components/layout/AppTopbar.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Calendar as CalendarIcon,
  Bell,
  Plus,
  LayoutGrid,
  Search,
  ChevronDown,
  Sun,
  Moon,
  Keyboard,
} from "lucide-react";

// Pequeno "kbd" estilizado
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded-md border bg-muted text-xs font-medium">
      {children}
    </kbd>
  );
}

type Role = "admin" | "coordenador" | "analista" | "assistente" | "convidado";

export default function AppTopbar(props: {
  user: { id: string | null; name: string; email: string | null; role: Role; avatarUrl: string | null };
  companyCurrent: { codigoERP: string | number; nomeFantasia: string } | null;
  companies: { codigoERP: string | number; nomeFantasia: string; logoUrl?: string | null }[];
  setEmpresaAction: (formData: FormData) => Promise<void>;
  envLabel: string | null;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // ---------- Command Palette ----------
  const [openCmd, setOpenCmd] = React.useState(false);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      if ((isMac && e.metaKey && e.key.toLowerCase() === "k") || (!isMac && e.ctrlKey && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setOpenCmd((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---------- Período global (demo simples) ----------
  const [range, setRange] = React.useState<string>(() => {
    if (typeof window === "undefined") return "Últimos 30 dias";
    return localStorage.getItem("erp.range") || "Últimos 30 dias";
  });
  React.useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("erp.range", range);
  }, [range]);

  // ---------- Notificações (mock) ----------
  const [notifications] = React.useState([
    { id: "n1", title: "Boleto vence hoje", desc: "Fornec. ACME - R$ 12.540,00", time: "há 1h" },
    { id: "n2", title: "Retorno CNAB disponível", desc: "Santander - Lote 23", time: "há 3h" },
    { id: "n3", title: "NF-e importada", desc: "42 novas notas em Fiscal", time: "ontem" },
  ]);

  // ---------- Troca de empresa ----------
  async function trocarEmpresa(codigoERP: string | number) {
    const fd = new FormData();
    fd.set("empresa_codigo_erp", String(codigoERP));
    await props.setEmpresaAction(fd);
    router.refresh();
  }

  const initials =
    props.user.name
      .split(" ")
      .slice(0, 2)
      .map((s) => s[0])
      .join("")
      .toUpperCase() || "U";

  const env = props.envLabel ? props.envLabel.toUpperCase() : null;
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;

  return (
    <div className="sticky top-0 z-50 w-full border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-full items-center gap-2 px-3 sm:px-4">
        {/* Company Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span className="max-w-[160px] truncate">
                {props.companyCurrent?.nomeFantasia ?? "Selecionar empresa"}
              </span>
              <ChevronDown className="h-4 w-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            <DropdownMenuLabel>Empresas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <CommandList className="max-h-72 overflow-auto p-1">
              {props.companies.map((c) => (
                <DropdownMenuItem
                  key={String(c.codigoERP)}
                  onClick={() => trocarEmpresa(c.codigoERP)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {/* mini logo */}
                    {c.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logoUrl} alt="" className="h-6 w-6 rounded-md object-cover" />
                    ) : (
                      <div className="h-6 w-6 rounded-md bg-muted" />
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium leading-tight">{c.nomeFantasia}</span>
                      <span className="text-xs text-muted-foreground">ERP #{String(c.codigoERP)}</span>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </CommandList>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Separador fino */}
        <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

        {/* Global Search (abre palette) */}
        <div className="relative hidden w-full max-w-lg flex-1 sm:block">
          <button
            onClick={() => setOpenCmd(true)}
            className="group inline-flex h-9 w-full items-center gap-2 rounded-md border bg-muted/40 px-3 text-left text-sm text-muted-foreground hover:bg-muted"
          >
            <Search className="h-4 w-4 opacity-70" />
            <span className="flex-1 truncate">Buscar (fornecedores, títulos, notas...)</span>
            <span className="hidden items-center gap-1 sm:flex">
              <Kbd>{navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl"}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
        </div>

        {/* Período global */}
        <Popover>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="h-9 gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">{range}</span>
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Período global</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PopoverContent className="w-56" align="end">
            <div className="grid gap-1">
              {["Hoje", "Ontem", "Últimos 7 dias", "Últimos 30 dias", "Este mês", "Mês passado"].map((opt) => (
                <Button
                  key={opt}
                  variant={range === opt ? "default" : "ghost"}
                  className="justify-start"
                  onClick={() => setRange(opt)}
                >
                  {opt}
                </Button>
              ))}
              <Separator className="my-1" />
              <Button variant="outline" className="justify-start">Personalizado…</Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Quick Add */}
        <DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button className="h-9 gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Adicionar</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Novo registro rápido</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Adicionar</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => (window.location.href = "/contas-pagar/novo")}>
                Título a pagar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => (window.location.href = "/contas-receber/novo")}>
                Título a receber
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => (window.location.href = "/cadastros/fornecedores/novo")}>
                Fornecedor/Cliente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => (window.location.href = "/conciliacao-bancaria/importar-extrato")}>
                Importar extrato
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notificações */}
        <Popover>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="h-9 px-2">
                    <div className="relative">
                      <Bell className="h-5 w-5" />
                      {notifications.length > 0 && (
                        <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                          {notifications.length}
                        </span>
                      )}
                    </div>
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Notificações</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-2">
              <div className="text-sm font-medium">Notificações</div>
              <Separator />
              <div className="max-h-72 space-y-3 overflow-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="rounded-lg border p-3">
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{n.desc}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{n.time}</div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full">
                Ver tudo
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Tema */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 px-2"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Alternar tema</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Ajuda / atalhos */}
        <DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 px-2">
                    <Keyboard className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Ajuda & Atalhos</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Atalhos</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setOpenCmd(true)}>
              Abrir busca global <span className="ml-auto text-xs"><Kbd>{navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl"}</Kbd>+<Kbd>K</Kbd></span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => alert("Em breve: Guia do usuário")}>
              Guia do usuário
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => alert("Em breve: Central de suporte")}>
              Central de suporte
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Badge ambiente + status */}
        {env && <Badge className="hidden sm:inline-flex">{env}</Badge>}
        <Badge variant={online ? "secondary" : "destructive"} className="hidden sm:inline-flex">
          {online ? "Online" : "Offline"}
        </Badge>

        {/* Usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 pl-1 pr-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={props.user.avatarUrl ?? undefined} alt={props.user.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight sm:block">
                <div className="text-sm font-medium">{props.user.name}</div>
                <div className="text-[11px] text-muted-foreground capitalize">{props.user.role}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => (window.location.href = "/perfil")}>Perfil</DropdownMenuItem>
            <DropdownMenuItem onClick={() => (window.location.href = "/config")}>Configurações</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => (window.location.href = "/auth/signout")}>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Command Palette */}
      <CommandDialog open={openCmd} onOpenChange={setOpenCmd}>
        <CommandInput placeholder="Buscar em todo o ERP…" />
        <CommandList>
          <CommandEmpty>Nada encontrado.</CommandEmpty>

          <CommandGroup heading="Navegação">
            <CommandItem onSelect={() => (window.location.href = "/dashboard")}>Dashboard</CommandItem>
            <CommandItem onSelect={() => (window.location.href = "/contas-pagar")}>Contas a Pagar</CommandItem>
            <CommandItem onSelect={() => (window.location.href = "/conciliacao-bancaria")}>Conciliação Bancária</CommandItem>
            <CommandItem onSelect={() => (window.location.href = "/fiscal")}>Fiscal</CommandItem>
          </CommandGroup>

          <CommandGroup heading="Ações rápidas">
            <CommandItem onSelect={() => (window.location.href = "/contas-pagar/novo")}>Novo título a pagar</CommandItem>
            <CommandItem onSelect={() => (window.location.href = "/contas-receber/novo")}>Novo título a receber</CommandItem>
            <CommandItem onSelect={() => (window.location.href = "/cadastros/fornecedores/novo")}>Novo fornecedor</CommandItem>
            <CommandItem onSelect={() => (window.location.href = "/conciliacao-bancaria/importar-extrato")}>Importar extrato</CommandItem>
          </CommandGroup>

          {/* Você pode popular dinamicamente com buscas reais futuramente */}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
