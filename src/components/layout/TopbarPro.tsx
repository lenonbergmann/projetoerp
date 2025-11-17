// src/components/layout/TopbarPro.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";

import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  LayoutGrid,
  ChevronDown,
  Copy,
  ExternalLink,
  Pencil,
  Check,
  X,
  Power,
} from "lucide-react";

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

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
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

/* ============================ Empresas hook ============================ */

type EmpresaBPO = {
  codigo_erp: number;
  nome_fantasia: string | null;
  logo_url: string | null;
};

function useEmpresas() {
  const supabase = React.useMemo(() => createClientComponentClient(), []);
  const [empresas, setEmpresas] = React.useState<EmpresaBPO[]>([]);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("empresas_bpo")
        .select("codigo_erp, nome_fantasia, logo_url")
        .order("codigo_erp", { ascending: true });
      if (active && data) {
        setEmpresas(
          (data as any[]).map((e) => ({
            codigo_erp: Number(e.codigo_erp),
            nome_fantasia: e.nome_fantasia ?? null,
            logo_url: e.logo_url ?? null,
          }))
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  return { empresas };
}

/* ============================= Acessos hook ============================ */

type Acesso = {
  id: string | number;
  sistema: string | null;
  usuario: string | null;
  senha: string | null;
  url: string | null;
  categoria: string | null;
  observacoes: string | null;
  ativo: boolean | null;
};

function useAcessos(empresaCodigo: number | null) {
  const supabase = React.useMemo(() => createClientComponentClient(), []);
  const [data, setData] = React.useState<Acesso[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchAcessos = React.useCallback(async () => {
    if (!empresaCodigo) return;
    setLoading(true);
    try {
      // usa insert/select/update direto (RLS desabilitado por enquanto)
      const { data, error } = await supabase
        .from("empresas_bpo_acessos")
        .select("id, sistema, usuario, url, categoria, observacoes, \"DELETED_AT\"")
        .eq("codigo_erp", empresaCodigo)
        .order("sistema", { ascending: true });
      if (!error && Array.isArray(data)) {
        setData(
          data.map((r: any) => ({
            id: r.id,
            sistema: r.sistema ?? null,
            usuario: r.usuario ?? null,
            senha: r.senha ?? null, // sem criptografia — não vem pela select padrão; se quiser, adicione a coluna
            url: r.url ?? null,
            categoria: r.categoria ?? null,
            observacoes: r.observacoes ?? null,
            ativo: r["DELETED_AT"] == null,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, [empresaCodigo, supabase]);

  const addAcesso = React.useCallback(
    async (novo: { sistema: string; usuario: string; senha: string; url?: string; categoria?: string; observacoes?: string }) => {
      if (!empresaCodigo) return;
      await supabase.from("empresas_bpo_acessos").insert({
        codigo_erp: empresaCodigo,
        sistema: novo.sistema,
        usuario: novo.usuario,
        senha_enc: novo.senha, // sem cripto: apenas guardando em senha_enc por compatibilidade do schema
        url: novo.url ?? null,
        categoria: novo.categoria ?? null,
        observacoes: novo.observacoes ?? null,
        DELETED_AT: null,
      });
      await fetchAcessos();
    },
    [empresaCodigo, supabase, fetchAcessos]
  );

  const updateAcesso = React.useCallback(
    async (id: string | number, patch: { sistema?: string; usuario?: string; senha?: string; url?: string; categoria?: string; observacoes?: string }) => {
      const upd: Record<string, any> = {};
      if (patch.sistema !== undefined) upd.sistema = patch.sistema;
      if (patch.usuario !== undefined) upd.usuario = patch.usuario;
      if (patch.url !== undefined) upd.url = patch.url;
      if (patch.categoria !== undefined) upd.categoria = patch.categoria;
      if (patch.observacoes !== undefined) upd.observacoes = patch.observacoes;
      if (patch.senha !== undefined) upd.senha_enc = patch.senha; // sem cripto
      if (Object.keys(upd).length === 0) return;

      await supabase.from("empresas_bpo_acessos").update(upd).eq("id", Number(id));
      await fetchAcessos();
    },
    [supabase, fetchAcessos]
  );

  const toggleAtivo = React.useCallback(
    async (id: string | number, ativo: boolean) => {
      await supabase
        .from("empresas_bpo_acessos")
        .update({ DELETED_AT: ativo ? null : new Date().toISOString() })
        .eq("id", Number(id));
      setData((prev) => prev.map((a) => (a.id === id ? { ...a, ativo } : a)));
    },
    [supabase]
  );

  return { data, loading, fetchAcessos, addAcesso, updateAcesso, toggleAtivo };
}

/* ============================= TopbarPro ============================== */

export default function TopbarPro({
  empresa,
  user,
  onLogout,
}: {
  empresa: {
    nome_fantasia?: string | null;
    razao_social?: string | null;
    cpf_cnpj?: string | null;
    logo_url?: string | null;
    codigo_erp?: number | null;
  };
  user: { name: string; avatarUrl?: string | null; role?: string | null };
  onLogout: () => void;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // -------- Empresas --------
  const { empresas } = useEmpresas();

  // Estado otimista do cabeçalho da empresa (mostra na hora após clique)
  const [empresaUI, setEmpresaUI] = React.useState<{
    codigo_erp: number | null;
    nome_fantasia: string | null;
    logo_url: string | null;
    cpf_cnpj: string | null;
  }>(() => ({
    codigo_erp: empresa?.codigo_erp ?? null,
    nome_fantasia: empresa?.nome_fantasia ?? null,
    logo_url: empresa?.logo_url ?? null,
    cpf_cnpj: empresa?.cpf_cnpj ?? null,
  }));

  // mantém empresaUI sincronizada quando props mudarem
  React.useEffect(() => {
    setEmpresaUI({
      codigo_erp: empresa?.codigo_erp ?? null,
      nome_fantasia: empresa?.nome_fantasia ?? null,
      logo_url: empresa?.logo_url ?? null,
      cpf_cnpj: empresa?.cpf_cnpj ?? null,
    });
  }, [empresa?.codigo_erp, empresa?.nome_fantasia, empresa?.logo_url, empresa?.cpf_cnpj]);

  const empresaCookie = getCookie("empresaId");
  const empresaAtualCodigo =
    empresaUI.codigo_erp ?? (empresa?.codigo_erp ?? null) ?? (empresaCookie ? Number(empresaCookie) : null);

  // Seleção de empresa: otimista + cookie + refresh + broadcast
  function selectEmpresa(cod: number) {
    const match = empresas.find((e) => e.codigo_erp === cod) || null;
    setEmpresaUI({
      codigo_erp: cod,
      nome_fantasia: match?.nome_fantasia ?? empresaUI.nome_fantasia ?? null,
      logo_url: match?.logo_url ?? empresaUI.logo_url ?? null,
      cpf_cnpj: empresaUI.cpf_cnpj ?? null, // mantemos o CPF/CNPJ atual se não tiver no match
    });

    setCookie("empresaId", String(cod));
    // pequeno broadcast para quem estiver ouvindo (opcional)
    try {
      localStorage.setItem("empresa:changed", String(Date.now()));
    } catch {}

    router.refresh();
  }

  // Busca no dropdown de empresas
  const [empresaQuery, setEmpresaQuery] = React.useState("");
  const empresasFiltradas = React.useMemo(() => {
    const q = empresaQuery.trim().toLowerCase();
    return empresas.filter((e) => {
      if (!q) return true;
      const nome = (e.nome_fantasia ?? "").toLowerCase();
      const cod = String(e.codigo_erp);
      return nome.includes(q) || cod.includes(q);
    });
  }, [empresas, empresaQuery]);

  // -------- Command Palette --------
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

  // -------- Acessos (CRUD) --------
  const [openAcessos, setOpenAcessos] = React.useState(false);
  const {
    data: acessos,
    loading: loadingAcessos,
    fetchAcessos,
    addAcesso,
    updateAcesso,
    toggleAtivo,
  } = useAcessos(empresaAtualCodigo ?? null);

  React.useEffect(() => {
    if (openAcessos) fetchAcessos();
  }, [openAcessos, fetchAcessos]);

  const [novo, setNovo] = React.useState<{
    sistema: string;
    usuario: string;
    senha: string;
    url: string;
  }>({
    sistema: "",
    usuario: "",
    senha: "",
    url: "",
  });

  const [editingId, setEditingId] = React.useState<string | number | null>(null);
  const [editRow, setEditRow] = React.useState<{
    sistema: string;
    usuario: string;
    senha: string;
    url: string;
  }>({
    sistema: "",
    usuario: "",
    senha: "",
    url: "",
  });

  const initials = initialsFromName(user.name);
  const env = (process.env.NEXT_PUBLIC_APP_ENV || "").toUpperCase();
  const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;

  return (
    <div className="sticky top-0 z-40 border-b bg-background shadow-md">
      <div className="flex h-14 items-center justify-between gap-2 px-3 md:px-6">
        {/* Esquerda: logo o mais à esquerda possível */}
        <div className="flex items-center gap-2">
          {/* LOGO FIXA */}
          <a
            href="/"
            className="relative h-9 w-[140px] items-center justify-start md:flex"
            title="Depaula BPO"
          >
            <Image
              src="https://jhjwxjixgjhueyupkvoz.supabase.co/storage/v1/object/public/logos-empresas/logoDepaulaBPO.jpg"
              alt="Depaula BPO"
              fill
              className="object-contain"
              priority
            />
          </a>

          {/* Ícone do app */}
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-card">
            <LayoutGrid className="h-4 w-4 text-indigo-500" />
          </div>

          {/* Nome da empresa + seta (dropdown) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="hidden h-9 items-center gap-2 sm:flex"
                title="Selecionar empresa"
              >
                {/* Logo atual da empresa (otimista) */}
                {empresaUI.logo_url ? (
                  <span className="relative h-6 w-6 overflow-hidden rounded">
                    <Image
                      src={empresaUI.logo_url}
                      alt={empresaUI.nome_fantasia ?? "Logo"}
                      fill
                      className="object-contain"
                    />
                  </span>
                ) : null}
                <div className="min-w-0 text-left">
                  <div className="truncate text-sm font-semibold">
                    {empresaUI.nome_fantasia ?? "Empresa"}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {empresaUI.cpf_cnpj ?? ""}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              className="w-[520px]"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="px-2 pt-2">
                <Input
                  autoFocus
                  placeholder="Buscar empresa (código ou nome)"
                  value={empresaQuery}
                  onChange={(e) => setEmpresaQuery(e.target.value)}
                  inputMode="text"
                  onKeyDown={(e) => {
                    // evita que o typeahead do Radix capture a tecla
                    e.stopPropagation();
                  }}
                />
              </div>
              <DropdownMenuLabel className="mt-1">Selecionar empresa</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {empresasFiltradas.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Nenhuma empresa encontrada.
                </div>
              ) : (
                empresasFiltradas.map((e) => (
                  <DropdownMenuItem
                    key={e.codigo_erp}
                    onClick={() => selectEmpresa(e.codigo_erp)}
                    className={`gap-2 ${e.codigo_erp === empresaAtualCodigo ? "bg-accent" : ""}`}
                  >
                    {/* Logo na lista */}
                    {e.logo_url ? (
                      <span className="relative h-6 w-6 overflow-hidden rounded">
                        <Image
                          src={e.logo_url}
                          alt={e.nome_fantasia ?? "Logo"}
                          fill
                          className="object-contain"
                        />
                      </span>
                    ) : (
                      <span className="h-6 w-6 rounded bg-muted" />
                    )}
                    <span className="font-mono">{e.codigo_erp}</span> —{" "}
                    <span className="truncate">{e.nome_fantasia ?? "Empresa"}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Botão Acessos (abre dialog CRUD) */}
          <Dialog open={openAcessos} onOpenChange={setOpenAcessos}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="h-9">
                Acessos
              </Button>
            </DialogTrigger>
            {/* +40% de largura: 48rem * 1.4 = 80.2rem */}
            <DialogContent className="w-[90vw] max-w-[1200px]">
              <DialogHeader>
                <DialogTitle>
                  Acessos — {empresaUI.nome_fantasia ?? `Empresa ${empresaAtualCodigo ?? ""}`}
                </DialogTitle>
                <DialogDescription>
                  Gerencie credenciais e links da empresa (copiar/colar, adicionar, editar, desativar).
                </DialogDescription>
              </DialogHeader>

              {/* Novo acesso */}
              <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <Input
                  placeholder="Sistema"
                  value={novo.sistema}
                  onChange={(e) => setNovo((s) => ({ ...s, sistema: e.target.value }))}
                />
                <Input
                  placeholder="Usuário"
                  value={novo.usuario}
                  onChange={(e) => setNovo((s) => ({ ...s, usuario: e.target.value }))}
                />
                <Input
                  placeholder="Senha"
                  value={novo.senha}
                  onChange={(e) => setNovo((s) => ({ ...s, senha: e.target.value }))}
                />
                <Input
                  placeholder="URL"
                  value={novo.url}
                  onChange={(e) => setNovo((s) => ({ ...s, url: e.target.value }))}
                />
                <Button
                  onClick={async () => {
                    if (!novo.sistema?.trim()) return;
                    await addAcesso({
                      sistema: novo.sistema || "",
                      usuario: novo.usuario || "",
                      senha: novo.senha || "",
                      url: novo.url || "",
                    });
                    setNovo({ sistema: "", usuario: "", senha: "", url: "" });
                  }}
                >
                  Adicionar
                </Button>
              </div>

              <div className="max-h-[120vh] overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr className="text-left">
                      <th className="px-3 py-2">Sistema</th>
                      <th className="px-3 py-2">Usuário</th>
                      <th className="px-3 py-2">Senha</th>
                      <th className="px-3 py-2">URL</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingAcessos ? (
                      <tr>
                        <td className="px-3 py-3 text-muted-foreground" colSpan={6}>
                          Carregando acessos...
                        </td>
                      </tr>
                    ) : acessos.length === 0 ? (
                      <tr>
                        <td className="px-3 py-3 text-muted-foreground" colSpan={6}>
                          Nenhum acesso encontrado.
                        </td>
                      </tr>
                    ) : (
                      acessos.map((a) => {
                        const isEditing = editingId === a.id;
                        return (
                          <tr key={a.id} className="border-t">
                            <td className="px-3 py-2 align-top">
                              {isEditing ? (
                                <Input
                                  value={editRow.sistema}
                                  onChange={(e) =>
                                    setEditRow((r) => ({ ...r, sistema: e.target.value }))
                                  }
                                />
                              ) : (
                                a.sistema ?? "-"
                              )}
                            </td>
                            <td className="px-3 py-2 align-top break-all">
                              {isEditing ? (
                                <Input
                                  value={editRow.usuario}
                                  onChange={(e) =>
                                    setEditRow((r) => ({ ...r, usuario: e.target.value }))
                                  }
                                />
                              ) : (
                                a.usuario ?? "-"
                              )}
                            </td>
                            <td className="px-3 py-2 align-top break-all">
                              {isEditing ? (
                                <Input
                                  value={editRow.senha}
                                  onChange={(e) =>
                                    setEditRow((r) => ({ ...r, senha: e.target.value }))
                                  }
                                />
                              ) : (
                                a.senha ?? "-"
                              )}
                            </td>
                            <td className="px-3 py-2 align-top break-all">
                              {isEditing ? (
                                <Input
                                  value={editRow.url}
                                  onChange={(e) =>
                                    setEditRow((r) => ({ ...r, url: e.target.value }))
                                  }
                                />
                              ) : a.url ? (
                                <a
                                  href={a.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 underline"
                                  title={a.url}
                                >
                                  abrir <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-3 py-2 align-top">
                              {a.ativo ? (
                                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                                  Ativo
                                </span>
                              ) : (
                                <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700">
                                  Inativo
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 align-top">
                              <div className="flex flex-wrap items-center justify-end gap-1">
                                {/* Copiar linha */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    navigator.clipboard.writeText(
                                      [
                                        `Sistema: ${a.sistema ?? "-"}`,
                                        `Usuário: ${a.usuario ?? "-"}`,
                                        `Senha: ${a.senha ?? "-"}`,
                                        `URL: ${a.url ?? "-"}`,
                                      ].join(" | ")
                                    )
                                  }
                                  title="Copiar linha"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>

                                {/* Editar / Salvar / Cancelar */}
                                {!isEditing ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingId(a.id);
                                      setEditRow({
                                        sistema: a.sistema ?? "",
                                        usuario: a.usuario ?? "",
                                        senha: a.senha ?? "",
                                        url: a.url ?? "",
                                      });
                                    }}
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={async () => {
                                        await updateAcesso(a.id, editRow);
                                        setEditingId(null);
                                      }}
                                      title="Salvar"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setEditingId(null)}
                                      title="Cancelar"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}

                                {/* (Des)ativar */}
                                <Button
                                  variant={a.ativo ? "destructive" : "outline"}
                                  size="sm"
                                  onClick={() => toggleAtivo(a.id, !a.ativo)}
                                  title={a.ativo ? "Desativar" : "Reativar"}
                                >
                                  <Power className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Centro: Command Bar */}
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
          {/* Novo registro */}
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

          {/* Notificações */}
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

          {/* Badges */}
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
                <CommandItem key={`cp-${t.id}`} onSelect={() => router.push(`/contas-pagar/${t.id}`)}>
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
