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
} as const;

/* ============================== Tipagens ============================== */

/** Chaves das rotas estáticas (derivado do objeto acima). */
type StaticRouteKeys = "home" | "login" | "selecionarEmpresa" | "dashboardRoot";

/** Conjunto de rotas estáticas conhecidas. */
export type KnownStaticRoutes = typeof routes[StaticRouteKeys];

/** Template literal para rota dinâmica de dashboard. */
export type DashboardRoute = `/dashboard/${string}`;

/** União de todas as rotas válidas. */
export type AppRoutes = KnownStaticRoutes | DashboardRoute;

/* ============================== Predicados ============================ */

/** Checa se o path é uma rota estática conhecida. */
export function isKnownStaticRoute(path: string): path is KnownStaticRoutes {
  const p = normalizePath(path);
  return (
    p === routes.home ||
    p === routes.login ||
    p === routes.selecionarEmpresa ||
    p === routes.dashboardRoot
  );
}

/** Checa se o path é uma rota de dashboard válida (/dashboard/:empresaId). */
export function isDashboardRoute(path: string): path is DashboardRoute {
  return ROUTE_PATTERNS.dashboard.test(normalizePath(path));
}

/** Checa se o path é uma AppRoute válida (estática ou dinâmica). */
export function isAppRoute(path: string): path is AppRoutes {
  return isKnownStaticRoute(path) || isDashboardRoute(path);
}

/* ============================== Extractors ============================ */

/** Tenta extrair o empresaId de /dashboard/:empresaId. Retorna null se não casar. */
export function getEmpresaIdFromPath(path: string): string | null {
  const p = normalizePath(path);
  const m = ROUTE_PATTERNS.dashboard.exec(p);
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

/* ============================== Builders ============================== */

/** Atalho para construir rota de dashboard com query params opcionais. */
export function dashboardUrl(
  empresaId: string | number,
  query?: Record<string, string | number | boolean | null | undefined>
): string {
  return withQuery(routes.dashboard(empresaId), query);
}

/** Garante que qualquer string que represente rota vire uma AppRoute tipada (ou lança). */
export function assertAppRoute(path: string): AppRoutes {
  const p = normalizePath(path);
  if (!isAppRoute(p)) {
    throw new Error(`Path "${path}" não corresponde a nenhuma AppRoute conhecida.`);
  }
  return p;
}

/* ============================== Conveniências ========================= */

/** Lista simples de rotas estáticas (útil p/ menus, sitemap, etc.). */
export const STATIC_ROUTES: KnownStaticRoutes[] = [
  routes.home,
  routes.login,
  routes.selecionarEmpresa,
  routes.dashboardRoot,
];

/** Alias em CAPS (opcional, caso goste desse estilo). */
export const ROUTES = routes;
