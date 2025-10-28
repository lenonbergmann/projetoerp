"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  buildMenu,
  isActive as isActiveByMatch,
  type MenuItem,
  type AppRole,
  type FeatureFlag,
  ALL_FLAGS,
} from "./menu";
import { ChevronRight } from "lucide-react";

type Props = {
  role: AppRole;
  enabledFlags?: FeatureFlag[];
  empresaCodigoERP?: string | number | null;
  onNavigate?: () => void;
};

/**
 * Sidebar "rail" (w-14) apenas com ícones. Ao passar o mouse em cada item,
 * abre um painel flutuante com rótulo, descrição e subitens.
 */
export default function SidebarHover({
  role,
  enabledFlags = ALL_FLAGS,
  empresaCodigoERP = null,
  onNavigate,
}: Props) {
  const pathname = usePathname();
  const items = React.useMemo<MenuItem[]>(
    () => buildMenu({ role, enabledFlags, empresaCodigoERP }),
    [role, enabledFlags, empresaCodigoERP]
  );

  // Para acessibilidade/teclado: qual item está "abrindo" o flyout
  const [openKey, setOpenKey] = React.useState<string | null>(null);

  // Fecha flyout ao navegar
  React.useEffect(() => {
    setOpenKey(null);
  }, [pathname]);

  return (
    <aside
      className="
        group/sidebar relative z-30
        h-full w-14 shrink-0 border-r bg-white/85 backdrop-blur
        supports-[backdrop-filter]:bg-white/60 dark:bg-black/20
      "
      aria-label="Menu principal"
    >
      {/* trilho vertical */}
      <nav className="flex h-full flex-col items-stretch py-3">
        {/* espaço para branding compacto (opcional) */}
        <div className="mb-2 flex items-center justify-center">
          <Link
            href="/"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-card text-base font-bold"
            title="Início"
            aria-label="Início"
            onClick={onNavigate}
          >
            DB
          </Link>
        </div>

        {/* itens */}
        <ul className="flex-1 space-y-1 px-1">
          {items.map((item, idx) => (
            <RailItem
              key={item.id ?? idx}
              item={item}
              pathname={pathname}
              openKey={openKey}
              setOpenKey={setOpenKey}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </nav>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/*                                RailItem                                     */
/* -------------------------------------------------------------------------- */

function RailItem({
  item,
  pathname,
  openKey,
  setOpenKey,
  onNavigate,
}: {
  item: MenuItem;
  pathname: string;
  openKey: string | null;
  setOpenKey: (k: string | null) => void;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const active = item.href ? isRouteActive(pathname, item) : hasActiveChild(pathname, item);

  const baseBtn =
    "relative flex h-10 w-10 items-center justify-center rounded-lg border bg-card hover:bg-accent hover:text-accent-foreground transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

  // chave única do item p/ hover/focus
  const k = item.id ?? item.href ?? item.label;

  const button = (
    <button
      type="button"
      className={[
        baseBtn,
        active
          ? "border-indigo-300 text-indigo-700 dark:text-indigo-300 bg-indigo-50/60"
          : "text-foreground/80",
      ].join(" ")}
      aria-haspopup="dialog"
      aria-expanded={openKey === k}
      onMouseEnter={() => setOpenKey(k)}
      onFocus={() => setOpenKey(k)}
      onMouseLeave={() => setOpenKey(null)}
      onBlur={(e) => {
        // se o foco saiu para fora do item + flyout, fecha
        if (!e.currentTarget.closest("[data-rail-item]")?.contains(e.relatedTarget as Node)) {
          setOpenKey(null);
        }
      }}
      title={item.label}
      data-testid={`rail-btn-${k}`}
    >
      {/* indicador active (esquerda) */}
      <span
        className={[
          "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-full",
          active ? "bg-indigo-500" : "bg-transparent",
        ].join(" ")}
        aria-hidden
      />
      {Icon ? <Icon className="h-5 w-5" /> : <span className="h-5 w-5" />}
    </button>
  );

  // Sem filhos e com href: ícone clica direto
  if (!item.children?.length && item.href) {
    return (
      <li
        className="relative"
        data-rail-item
        onMouseEnter={() => setOpenKey(k)}
        onMouseLeave={() => setOpenKey(null)}
      >
        <Link href={item.href} className="block" onClick={onNavigate} aria-label={item.label}>
          {button}
        </Link>
        <Flyout
          show={openKey === k}
          item={item}
          align="left"
          onPointerEnter={() => setOpenKey(k)}
          onPointerLeave={() => setOpenKey(null)}
          onNavigate={onNavigate}
        />
      </li>
    );
  }

  // Com filhos OU sem href: botão abre flyout
  return (
    <li
      className="relative"
      data-rail-item
      onMouseEnter={() => setOpenKey(k)}
      onMouseLeave={() => setOpenKey(null)}
    >
      {button}
      <Flyout
        show={openKey === k}
        item={item}
        align="left"
        onPointerEnter={() => setOpenKey(k)}
        onPointerLeave={() => setOpenKey(null)}
        onNavigate={onNavigate}
      />
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Flyout                                    */
/* -------------------------------------------------------------------------- */

function Flyout({
  show,
  item,
  align = "left",
  onPointerEnter,
  onPointerLeave,
  onNavigate,
}: {
  show: boolean;
  item: MenuItem;
  align?: "left" | "right";
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <div
      className={[
        "pointer-events-none absolute top-0",
        align === "left" ? "left-[3.25rem]" : "right-[3.25rem]",
        "z-40 min-w-60 max-w-80 opacity-0 transition",
        show ? "pointer-events-auto translate-x-0 opacity-100" : "translate-x-1 opacity-0",
      ].join(" ")}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      role="dialog"
      aria-label={item.label}
    >
      <div className="rounded-xl border bg-popover shadow-xl ring-1 ring-black/5 backdrop-blur supports-[backdrop-filter]:bg-popover/80">
        {/* Cabeçalho do flyout */}
        <div className="flex items-start gap-3 border-b px-3 py-2">
          {Icon ? <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" /> : null}
          <div className="min-w-0">
            <div className="truncate font-semibold">{item.label}</div>
            {item.description ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {item.description}
              </p>
            ) : null}
          </div>
          {/* seta indicativa */}
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/60" aria-hidden />
        </div>

        {/* Corpo: link principal e/ou filhos */}
        <div className="p-2">
          {/* Link principal (se houver) */}
          {item.href ? (
            <Link
              href={item.href}
              onClick={onNavigate}
              className="mb-1 flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              Ir para {item.label}
            </Link>
          ) : null}

          {/* Subitens */}
          {item.children?.length ? (
            <div className="mt-1 space-y-1">
              {item.children.map((c) =>
                c.href ? (
                  <Link
                    key={c.id ?? c.href}
                    href={c.href}
                    onClick={onNavigate}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    title={c.description}
                  >
                    <span className="truncate">{c.label}</span>
                  </Link>
                ) : (
                  <div
                    key={c.id ?? c.label}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground"
                    title={c.description}
                  >
                    {c.label}
                  </div>
                )
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Utils                                     */
/* -------------------------------------------------------------------------- */

function isRouteActive(pathname: string, item: MenuItem) {
  // Respeita a estratégia 'match' definida no item + fallback por prefixo
  if (isActiveByMatch(pathname, item)) return true;
  return item.href ? pathname === item.href || pathname.startsWith(item.href + "/") : false;
}

function hasActiveChild(pathname: string, item: MenuItem) {
  return !!item.children?.some((c) => isRouteActive(pathname, c));
}
