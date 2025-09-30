// src/lib/routes.ts

// 1) Objeto com rotas estáticas e geradores de rotas dinâmicas
export const routes = {
  home: "/" as const,
  login: "/login" as const,
  selecionarEmpresa: "/selecionar-empresa" as const,
  dashboardRoot: "/dashboard" as const,

  // 🔧 Tipar o retorno como DashboardRoute
  dashboard: (empresaId: string | number): DashboardRoute =>
    `/dashboard/${String(empresaId)}` as DashboardRoute,
} as const;

// 2) Tipo com as rotas ESTÁTICAS (derivado do objeto acima)
type StaticRouteKeys = "home" | "login" | "selecionarEmpresa" | "dashboardRoot";
export type KnownStaticRoutes = typeof routes[StaticRouteKeys];

// 3) Tipo com a rota DINÂMICA (template literal)
export type DashboardRoute = `/dashboard/${string}`;

// 4) Tipo final: todas as rotas válidas
export type AppRoutes = KnownStaticRoutes | DashboardRoute;

// 5) Guard opcional: checa se uma string é uma AppRoute
export function isAppRoute(path: string): path is AppRoutes {
  if (
    path === routes.home ||
    path === routes.login ||
    path === routes.selecionarEmpresa ||
    path === routes.dashboardRoot
  ) {
    return true;
  }
  return /^\/dashboard\/[^/]+$/.test(path);
}
