// src/lib/routes.ts

/* ============================================================================
 * Rotas tipadas + helpers
 * - Mantém compatibilidade com sua API atual (routes.dashboard(id), etc.)
 * - Adiciona validações, matchers e builders de URL com query params
 * - Evita erros comuns (paths sem "/" inicial, dashboard sem id, etc.)
 * ========================================================================== */

/** Normaliza path para sempre iniciar com "/" e remover repetidos. */
function normalizePath(path: string): `/${string}` {
  const p = path.trim();
  if (!p.startsWith("/")) return ("/" + p) as `/${string}`;
  return ("/" + p.replace(/^\/+/, "")) as `/${string}`;
}

/** Constrói URL com query params de forma segura. */
export function withQuery(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
): string {
  const base = normalizePath(path);
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Padrões (regex) de rotas dinâmicas que precisamos reconhecer. */
const ROUTE_PATTERNS = {
  dashboard: /^\/dashboard\/([^/]+)$/,
  clientesBpo: /^\/cadastro\/clientes-bpo\/([^/]+)$/, // /cadastro/clientes-bpo/:codigo_erp
} as const;

/** Define as rotas estáticas e os geradores dinâmicos (builders). */
export const routes = {
  home: "/" as const,
  login: "/login" as const,
  selecionarEmpresa: "/selecionar-empresa" as const,
  dashboardRoot: "/dashboard" as const,

  /** Rota dinâmica do dashboard. Aceita string ou number. */
  dashboard: (empresaId: string | number): DashboardRoute =>
    (`/dashboard/${String(empresaId)}` as const),

  /** Cadastros – Clientes BPO */
  cadastrosRoot: "/cadastro" as const,                         // opcional, útil p/ menu/sitemap
  clientesBpoRoot: "/cadastro/clientes-bpo" as const,          // listagem
  clientesBpoNovo: "/cadastro/clientes-bpo/novo" as const,     // criação
  clientesBpo: (codigoErp: string | number): ClientesBpoRoute =>
    (`/cadastro/clientes-bpo/${String(codigoErp)}` as const),  // edição
} as const;

/* ============================== Tipagens ============================== */

/** Chaves das rotas estáticas (derivado do objeto acima). */
type StaticRouteKeys =
  | "home"
  | "login"
  | "selecionarEmpresa"
  | "dashboardRoot"
  | "cadastrosRoot"
  | "clientesBpoRoot"
  | "clientesBpoNovo";

/** Conjunto de rotas estáticas conhecidas. */
export type KnownStaticRoutes = typeof routes[StaticRouteKeys];

/** Template literal para rotas dinâmicas. */
export type DashboardRoute = `/dashboard/${string}`;
export type ClientesBpoRoute = `/cadastro/clientes-bpo/${string}`;

/** União de todas as rotas válidas. */
export type AppRoutes = KnownStaticRoutes | DashboardRoute | ClientesBpoRoute;

/* ============================== Predicados ============================ */

/** Checa se o path é uma rota estática conhecida. */
export function isKnownStaticRoute(path: string): path is KnownStaticRoutes {
  const p = normalizePath(path);
  return (
    p === routes.home ||
    p === routes.login ||
    p === routes.selecionarEmpresa ||
    p === routes.dashboardRoot ||
    p === routes.cadastrosRoot ||
    p === routes.clientesBpoRoot ||
    p === routes.clientesBpoNovo
  );
}

/** Checa se o path é uma rota de dashboard válida (/dashboard/:empresaId). */
export function isDashboardRoute(path: string): path is DashboardRoute {
  return ROUTE_PATTERNS.dashboard.test(normalizePath(path));
}

/** Checa se o path é uma rota de clientes-bpo válida (/cadastro/clientes-bpo/:codigo_erp). */
export function isClientesBpoRoute(path: string): path is ClientesBpoRoute {
  return ROUTE_PATTERNS.clientesBpo.test(normalizePath(path));
}

/** Checa se o path é uma AppRoute válida (estática ou dinâmica). */
export function isAppRoute(path: string): path is AppRoutes {
  return isKnownStaticRoute(path) || isDashboardRoute(path) || isClientesBpoRoute(path);
}

/* ============================== Extractors ============================ */

/** Tenta extrair o empresaId de /dashboard/:empresaId. Retorna null se não casar. */
export function getEmpresaIdFromPath(path: string): string | null {
  const p = normalizePath(path);
  const m = ROUTE_PATTERNS.dashboard.exec(p);
  return m ? m[1] : null;
}

/** Tenta extrair o codigo_erp de /cadastro/clientes-bpo/:codigo_erp. Retorna null se não casar. */
export function getCodigoErpFromPath(path: string): string | null {
  const p = normalizePath(path);
  const m = ROUTE_PATTERNS.clientesBpo.exec(p);
  return m ? m[1] : null;
}

/** Versão "segura": lança erro se não for uma rota de dashboard válida. */
export function requireEmpresaId(path: string): string {
  const id = getEmpresaIdFromPath(path);
  if (!id) {
    throw new Error(`Path "${path}" não é uma rota válida de dashboard (/dashboard/:empresaId).`);
  }
  return id;
}

/** Versão "segura": lança erro se não for uma rota de clientes-bpo válida. */
export function requireCodigoErp(path: string): string {
  const id = getCodigoErpFromPath(path);
  if (!id) {
    throw new Error(
      `Path "${path}" não é uma rota válida de clientes-bpo (/cadastro/clientes-bpo/:codigo_erp).`
    );
  }
  return id;
}

/* ============================== Builders ============================== */

/** Atalho para construir rota de dashboard com query params opcionais. */
export function dashboardUrl(
  empresaId: string | number,
  query?: Record<string, string | number | boolean | null | undefined>
): string {
  return withQuery(routes.dashboard(empresaId), query);
}

/** Atalho para construir rota de edição de cliente BPO com query params opcionais. */
export function clientesBpoUrl(
  codigoErp: string | number,
  query?: Record<string, string | number | boolean | null | undefined>
): string {
  return withQuery(routes.clientesBpo(codigoErp), query);
}

/* ============================== Conveniências ========================= */

/** Lista simples de rotas estáticas (útil p/ menus, sitemap, etc.). */
export const STATIC_ROUTES: KnownStaticRoutes[] = [
  routes.home,
  routes.login,
  routes.selecionarEmpresa,
  routes.dashboardRoot,
  routes.cadastrosRoot,
  routes.clientesBpoRoot,
  routes.clientesBpoNovo,
];

/** Alias em CAPS (opcional, caso goste desse estilo). */
export const ROUTES = routes;
