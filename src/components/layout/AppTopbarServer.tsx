"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Plus,
  Calendar,
  Search,
  Moon,
  Sun,
  Keyboard,
  LayoutGrid,
} from "lucide-react";
import { CommandDialog, CommandGroup, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";

/* -------------------------------------------------------------------------- */
/*                              Componente principal                           */
/* -------------------------------------------------------------------------- */
export default function TopbarPro({
  empresa,
  user,
  onLogout,
  onTrocarEmpresa,
}: {
  empresa: {
    nome_fantasia?: string | null;
    razao_social?: string | null;
    cpf_cnpj?: string | null;
    logo_url?: string | null;
  };
  user: {
    name: string;
    avatarUrl?: string | null;
    role?: string | null;
  };
  onLogout: () => void;
  onTrocarEmpresa: () => void;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  /* ------------------------------ Busca global ------------------------------ */
  const [openCmd, setOpenCmd] = React.useState(false);
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenCmd((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ------------------------------ Período global ----------------------------- */
  const [range, setRange] = React.useState("Últimos 30 dias");

  /* ------------------------------ Notificações fake -------------------------- */
  const notifications = [
    { id: 1, title: "Boleto vence hoje", text: "Fornecedor ACME - R$ 2.340,00" },
    { id: 2, title: "Retorno CNAB disponível", text: "Santander - Lote 23" },
  ];

  const initials = user.name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-2 px-3 md:px-6">
        {/* ==================== BLOCO ESQUERDO ==================== */}
        <div className="flex items-center gap-3">
          {/* Logo e empresa */}
          <div className="flex items-center gap-2">
            <div className="relative h-9 w-9 overflow-hidden rounded-md border bg-white">
              {empresa.logo_url ? (
                <Image
                  src={empresa.logo_url}
                  alt="logo"
                  fill
                  className="object-contain p-1.5"
                />
              ) : (
                <LayoutGrid className="h-5 w-5 m-auto text-indigo-500" />
              )}
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-sm font-semibold truncate max-w-[160px]">
                {empresa.nome_fantasia ?? "Empresa"}
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                {empresa.cpf_cnpj ?? ""}
              </span>
            </div>
          </div>

          {/* Trocar empresa */}
          <Button
            size="sm"
            variant="outline"
            className="ml-1 text-xs"
            onClick={onTrocarEmpresa}
          >
            Trocar
          </Button>
        </div>

        {/* ==================== BLOCO CENTRAL ==================== */}
        <div className="flex flex-1 justify-center">
          {/* Barra de busca (abre palette) */}
          <button
            onClick={() => setOpenCmd(true)}
            className="group hidden md:inline-flex items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground hover:bg-muted h-9 w-[340px]"
          >
            <Search className="h-4 w-4 opacity-70" />
            <span className="flex-1 truncate">Buscar (Ctrl + K)</span>
          </button>
        </div>

        {/* ==================== BLOCO DIREITO ==================== */}
        <div className="flex items-center gap-1">
          {/* Período */}
          <Popover>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="h-9 px-2">
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Selecionar período</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <PopoverContent className="w-48" align="end">
              <div className="flex flex-col gap-1">
                {["Hoje", "Últimos 7 dias", "Últimos 30 dias", "Este mês"].map(
                  (opt) => (
                    <Button
                      key={opt}
                      variant={range === opt ? "default" : "ghost"}
                      className="justify-start"
                      onClick={() => setRange(opt)}
                    >
                      {opt}
                    </Button>
                  )
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Adicionar */}
          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button className="h-9 px-2">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Adicionar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Novo registro</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/contas-pagar/novo")}>
                Título a pagar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/contas-receber/novo")}>
                Título a receber
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/cadastro/clientes-fornecedores")}>
                Cliente / Fornecedor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notificações */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-9 px-2 relative">
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <div className="space-y-2">
                <div className="text-sm font-medium">Notificações</div>
                <Separator />
                {notifications.map((n) => (
                  <div key={n.id} className="rounded-md border p-2">
                    <div className="font-medium text-sm">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{n.text}</div>
                  </div>
                ))}
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
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Alternar tema</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 pl-1 pr-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start ml-2 leading-tight">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-[11px] text-muted-foreground capitalize">
                    {user.role ?? "Usuário"}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/perfil")}>
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/config")}>
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Command Palette */}
      <CommandDialog open={openCmd} onOpenChange={setOpenCmd}>
        <CommandInput placeholder="Buscar em todo o ERP..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado.</CommandEmpty>
          <CommandGroup heading="Navegação">
            <CommandItem onSelect={() => router.push("/")}>Dashboard</CommandItem>
            <CommandItem onSelect={() => router.push("/contas-pagar")}>
              Contas a Pagar
            </CommandItem>
            <CommandItem onSelect={() => router.push("/fiscal")}>Fiscal</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
