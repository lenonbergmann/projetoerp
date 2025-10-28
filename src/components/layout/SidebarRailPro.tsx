"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  buildMenu,
  isActive as isActiveMatch,
  type MenuItem,
  type AppRole,
  type FeatureFlag,
  ALL_FLAGS,
} from "./menu";
import { ChevronRight, PanelRightOpen, PanelRightClose } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

type Props = {
  role: AppRole;
  enabledFlags?: FeatureFlag[];
  empresaCodigoERP?: string | number | null;
  onNavigate?: () => void;

  /** evita sobrepor o header fixo (px) */
  topOffset?: number;

  /** deslocamento do texto quando colapsa (px) */
  gutter?: number;
  railGutter?: number;

  /** largura só-ícones (px) */
  collapsedWidth?: number;

  /**
   * Largura expandida:
   *  - número em px (ex.: 280)
   *  - "auto" => calcula com base no maior label
   */
  expandWidth?: number | "auto";

  /** limite mínimo/máximo quando expandWidth="auto" */
  autoMin?: number;
  autoMax?: number;

  /** começa aberto? */
  defaultExpanded?: boolean;
};

/* -------------------------------------------------------------------------- */
/*                               SidebarRailPro                               */
/* -------------------------------------------------------------------------- */

export default function SidebarRailPro({
  role,
  enabledFlags = ALL_FLAGS,
  empresaCodigoERP = null,
  onNavigate,

  topOffset = 56,
  gutter: gutterProp = 10,
  railGutter,
  collapsedWidth = 64,

  // 👇 agora aceita "auto"
  expandWidth = "auto",
  autoMin = 168,   // largura mínima confortável
  autoMax = 320,   // trava superior (caso labels muito longos)

  defaultExpanded = true,
}: Props) {
  const pathname = usePathname();
  const items = React.useMemo<MenuItem[]>(
    () => buildMenu({ role, enabledFlags, empresaCodigoERP }),
    [role, enabledFlags, empresaCodigoERP]
  );

  const gutter = typeof railGutter === "number" ? railGutter : gutterProp;

  /* ----------------------- estado expandido/colapsado ---------------------- */
  const [expanded, setExpanded] = React.useState<boolean>(defaultExpanded);
  React.useEffect(() => {
    try {
      const v = localStorage.getItem("sidebar_expanded");
      if (v === "true" || v === "false") setExpanded(v === "true");
      else setExpanded(defaultExpanded);
    } catch {
      setExpanded(defaultExpanded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const showMenu = React.useCallback(() => {
    setExpanded(true);
    try { localStorage.setItem("sidebar_expanded", "true"); } catch {}
  }, []);
  const hideMenu = React.useCallback(() => {
    setExpanded(false);
    try { localStorage.setItem("sidebar_expanded", "false"); } catch {}
  }, []);
  const toggleMenu = React.useCallback(() => (expanded ? hideMenu() : showMenu()), [expanded, hideMenu, showMenu]);

  /* --------------------------- largura automática -------------------------- */
  // medidor invisível para calcular a largura ideal quando expandido
  const measurerRef = React.useRef<HTMLDivElement | null>(null);
  const [autoWidth, setAutoWidth] = React.useState<number>(typeof expandWidth === "number" ? expandWidth : autoMin);

  const recomputeAutoWidth = React.useCallback(() => {
    if (expandWidth !== "auto") return;
    const root = measurerRef.current;
    if (!root) return;

    // mede o maior rótulo renderizado com mesma tipografia e espaçamentos do item
    // Fórmula da largura final:
    //   width = (paddingX item) * 2 + ícone (quadrado) + gap ícone-texto + larguraLabel + gap label-chevron + possível chevron + margens internas do container
    // Constantes (alinhadas às classes abaixo):
    const ITEM_PAD_X = 8;             // px-2
    const ICON_SQUARE = 40;           // h-10 w-10
    const GAP_ICON_TEXT = 8;          // gap-2 entre ícone e label
    const GAP_LABEL_CHEVRON = 6;      // pequeno espaço para chevron ou fim
    const CONTAINER_PADDING_X = 8;    // padding do <ul> (px-2)
    const SAFETY = 6;                 // margem de segurança

    let maxLabel = 0;
    const spans = root.querySelectorAll("[data-measure=label]") as NodeListOf<HTMLSpanElement>;
    spans.forEach((s) => {
      const w = Math.ceil(s.offsetWidth);
      if (w > maxLabel) maxLabel = w;
    });

    // considera a presença do chevron (nem todos têm, mas deixa espaço mínimo)
    const chevronWidth = 16; // h-4 w-4
    const width =
      CONTAINER_PADDING_X * 2 +
      ITEM_PAD_X * 2 +
      ICON_SQUARE +
      GAP_ICON_TEXT +
      maxLabel +
      GAP_LABEL_CHEVRON +
      chevronWidth +
      SAFETY;

    const clamped = Math.max(autoMin, Math.min(width, autoMax));
    setAutoWidth(clamped);
  }, [expandWidth, autoMin, autoMax]);

  // recalcula ao montar, ao trocar itens e no resize
  React.useEffect(() => {
    recomputeAutoWidth();
    if (expandWidth !== "auto") return;
    const onResize = () => recomputeAutoWidth();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [items, recomputeAutoWidth, expandWidth]);

  /* -------------------------- submenus (expandido) ------------------------- */
  const [open, setOpen] = React.useState<Record<string, boolean>>({});
  React.useEffect(() => {
    const next: Record<string, boolean> = {};
    items.forEach((it) => {
      if (it.children?.length) next[it.id] = it.children.some((c) => isRouteActive(pathname, c));
    });
    setOpen(next);
  }, [pathname, items]);

  /* ----------------------- flyout para colapsado --------------------------- */
  const [hovered, setHovered] = React.useState<string | null>(null);
  const closeTimer = React.useRef<number | null>(null);
  const cancelClose = React.useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);
  const scheduleClose = React.useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setHovered(null), 160);
  }, [cancelClose]);

  /* ------------------------- CSS vars (push layout) ------------------------ */
  const expandedWidthPx = typeof expandWidth === "number" ? expandWidth : autoWidth;

  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--sidebar-width", expanded ? `${expandedWidthPx}px` : `${collapsedWidth}px`);
    root.style.setProperty("--sidebar-top", `${topOffset}px`);
  }, [expanded, expandedWidthPx, collapsedWidth, topOffset]);

  /* --------------------------------- UI ----------------------------------- */
  const width = expanded ? expandedWidthPx : collapsedWidth;

  return (
    <>
      {/* Medidor invisível (fora da tela) */}
      {expandWidth === "auto" && (
        <div
          aria-hidden
          ref={measurerRef}
          style={{ position: "absolute", visibility: "hidden", pointerEvents: "none", left: -99999, top: 0 }}
          className="text-sm font-medium"
        >
          {items.map((it) => (
            <div key={it.id} className="px-2 py-2">
              <span data-measure="label" className="inline-block whitespace-nowrap">
                {it.label}
              </span>
              {it.children?.map((c) => (
                <div key={c.id} className="px-2 py-1.5">
                  <span data-measure="label" className="inline-block whitespace-nowrap">
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Barra lateral única (colapsa/expande) */}
      <aside
        className="fixed left-0 z-40 border-r bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-black/20"
        style={{
          top: topOffset,
          width,
          height: `calc(100dvh - ${topOffset}px)`,
        }}
        aria-label="Menu principal"
      >
        <nav className="flex h-full flex-col" role="navigation">
          {/* Lista */}
          <ul className="flex-1 overflow-auto px-2 py-3">
            {items.map((item) => (
              <NodeRow
                key={item.id}
                item={item}
                pathname={pathname}
                expanded={expanded}
                open={open[item.id] ?? false}
                setOpen={(v) => setOpen((p) => ({ ...p, [item.id]: v }))}
                onNavigate={onNavigate}
                // Histerese de hover: não fecha instantaneamente
                onHoverEnter={() => { setHovered(item.id); cancelClose(); }}
                onHoverLeave={() => scheduleClose()}
                gutter={gutter}
              />
            ))}
          </ul>

          {/* Rodapé com toggle */}
          <div className="border-t p-2">
            <button
              type="button"
              onClick={toggleMenu}
              className={[
                "w-full rounded-lg border px-2 py-2 text-sm shadow-sm transition",
                "hover:bg-muted hover:text-foreground",
                "inline-flex items-center justify-center gap-2",
              ].join(" ")}
              title={expanded ? "Ocultar menu" : "Mostrar menu"}
              aria-pressed={expanded}
            >
              {expanded ? (
                <>
                  <PanelRightClose className="h-4 w-4" />
                  <span className="font-medium">Ocultar menu</span>
                </>
              ) : (
                <>
                  <PanelRightOpen className="h-4 w-4" />
                  <span className="sr-only">Mostrar menu</span>
                </>
              )}
            </button>
          </div>
        </nav>
      </aside>

      {/* Bridge invisível para atravessar o mouse sem fechar (quando colapsado) */}
      {!expanded && hovered && (
        <div
          className="fixed z-40"
          style={{
            top: topOffset,
            left: collapsedWidth - 4, // cobre possíveis 1px de borda/blur
            width: 6,
            height: `calc(100dvh - ${topOffset}px)`,
          }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}

      {/* Flyout do submenu quando COLAPSADO */}
      {!expanded && hovered && (
        <Flyout
          anchorLeft={collapsedWidth}
          topOffset={topOffset}
          item={items.find((i) => i.id === hovered)!}
          pathname={pathname}
          onNavigate={() => {
            onNavigate?.();
            setHovered(null);
            cancelClose();
          }}
          onEnter={cancelClose}
          onLeave={scheduleClose}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Rows                                      */
/* -------------------------------------------------------------------------- */

function NodeRow({
  item,
  pathname,
  expanded,
  open,
  setOpen,
  onNavigate,
  onHoverEnter,
  onHoverLeave,
  gutter,
}: {
  item: MenuItem;
  pathname: string;
  expanded: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  onNavigate?: () => void;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  gutter: number;
}) {
  const Icon = item.icon;
  const hasChildren = !!item.children?.length;
  const active = hasChildren ? hasActiveChild(pathname, item) : isRouteActive(pathname, item);

  // Ícone (mesmo tamanho nos dois estados)
  const IconSquare = (
    <span
      className={[
        "inline-grid h-10 w-10 place-items-center rounded-xl ring-1 ring-border bg-card",
        active ? "text-indigo-700 bg-indigo-50/60 dark:text-indigo-300" : "",
      ].join(" ")}
      aria-hidden
    >
      {Icon ? <Icon className="h-5 w-5" /> : <span className="h-5 w-5" />}
    </span>
  );

  // Linha base
  const Base = (
    <div
      className={[
        "group relative flex items-center gap-2 rounded-xl px-2 py-2 text-sm transition",
        active
          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
          : "hover:bg-gray-50 text-gray-700 dark:hover:bg-white/5 dark:text-gray-200",
      ].join(" ")}
      title={item.description}
    >
      {IconSquare}
      {/* Título (desliza para trás do ícone ao colapsar) */}
      <span
        className={[
          "min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ease-out",
          expanded ? "max-w-[220px] opacity-100" : "max-w-0 opacity-0",
        ].join(" ")}
        style={{ marginLeft: expanded ? 0 : -gutter }}
      >
        <span className="block truncate font-medium">{item.label}</span>
      </span>
      {hasChildren && (
        <ChevronRight
          className={[
            "ml-auto h-4 w-4 shrink-0 opacity-70 transition-transform",
            expanded && open ? "rotate-90" : "",
            expanded ? "opacity-70" : "opacity-0",
          ].join(" ")}
        />
      )}
    </div>
  );

  if (expanded) {
    // Expandido: acordeão
    if (!hasChildren) {
      return (
        <li>
          {item.href ? (
            <Link href={item.href} onClick={onNavigate} className="block">{Base}</Link>
          ) : (
            Base
          )}
        </li>
      );
    }
    return (
      <li>
        <button
          type="button"
          className="w-full text-left"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          {Base}
        </button>
        <div
          className={[
            "overflow-hidden pl-3",
            open ? "max-h-96" : "max-h-0",
            "transition-[max-height] duration-200 ease-in-out",
          ].join(" ")}
        >
          <ul className="my-1 space-y-1">
            {item.children!.map((c) => {
              const cActive = isRouteActive(pathname, c);
              return c.href ? (
                <li key={c.id}>
                  <Link
                    href={c.href}
                    onClick={onNavigate}
                    className={[
                      "block rounded-md px-2 py-1.5 text-sm",
                      cActive
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-900/30"
                        : "hover:bg-muted text-foreground/90",
                    ].join(" ")}
                    title={c.description}
                  >
                    {c.label}
                  </Link>
                </li>
              ) : (
                <li key={c.id} className="rounded-md px-2 py-1.5 text-sm text-muted-foreground">
                  {c.label}
                </li>
              );
            })}
          </ul>
        </div>
      </li>
    );
  }

  // Colapsado: só ícone; abre flyout com histerese
  return (
    <li
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      onFocus={onHoverEnter}
      onBlur={onHoverLeave}
    >
      {item.href ? (
        <Link href={item.href} onClick={onNavigate} className="block">
          {Base}
        </Link>
      ) : (
        Base
      )}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Flyout                                   */
/* -------------------------------------------------------------------------- */

function Flyout({
  anchorLeft,
  topOffset,
  item,
  pathname,
  onNavigate,
  onEnter,
  onLeave,
}: {
  anchorLeft: number; // left da barra colapsada
  topOffset: number;
  item: MenuItem;
  pathname: string;
  onNavigate: () => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  if (!item.children?.length) return null;

  return (
    <div
      className="fixed z-50"  // acima da barra
      style={{
        top: topOffset + 8,
        left: anchorLeft - 1,           // encosta no menu (sem gap)
        maxHeight: `calc(100dvh - ${topOffset + 16}px)`,
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="m-1 max-w-[280px] overflow-auto rounded-2xl border bg-popover/95 p-2 shadow-xl ring-1 ring-black/5 backdrop-blur supports-[backdrop-filter]:bg-popover/80">
        <div className="mb-1 px-2 text-xs font-semibold text-muted-foreground">{item.label}</div>
        <ul className="space-y-1">
          {item.children.map((c) => {
            const cActive = isRouteActive(pathname, c);
            return c.href ? (
              <li key={c.id}>
                <Link
                  href={c.href}
                  onClick={onNavigate}
                  className={[
                    "block rounded-md px-2 py-1.5 text-sm",
                    cActive
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-900/30"
                      : "hover:bg-muted text-foreground/90",
                  ].join(" ")}
                >
                  {c.label}
                </Link>
              </li>
            ) : (
              <li key={c.id} className="rounded-md px-2 py-1.5 text-sm text-muted-foreground">
                {c.label}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

function isRouteActive(pathname: string, item: MenuItem) {
  if (isActiveMatch(pathname, item)) return true;
  return item.href ? pathname === item.href || pathname.startsWith(item.href + "/") : false;
}
function hasActiveChild(pathname: string, item: MenuItem) {
  return !!item.children?.some((c) => isRouteActive(pathname, c));
}
