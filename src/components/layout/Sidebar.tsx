"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { MENU } from "./menu";

type MenuItem = {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  // Novo opcional para submenus:
  children?: Array<{ href: string; label: string }>;
};

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  // helper: ativo para item "simples" (sem children)
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // helper: ativo para grupo (se qualquer filho estiver ativo)
  const isGroupActive = (children: NonNullable<MenuItem["children"]>) =>
    children.some((c) => isActive(c.href));

  // estado de acordeões: abre grupo automaticamente se a rota atual estiver dentro dele
  const initialOpen: Record<string, boolean> = React.useMemo(() => {
    const acc: Record<string, boolean> = {};
    (MENU as MenuItem[]).forEach((item) => {
      if (item.children?.length) {
        acc[item.href] = isGroupActive(item.children);
      }
    });
    return acc;
  }, [pathname]);

  const [open, setOpen] = React.useState<Record<string, boolean>>(initialOpen);

  React.useEffect(() => {
    // sincroniza ao navegar
    const next: Record<string, boolean> = {};
    (MENU as MenuItem[]).forEach((item) => {
      if (item.children?.length) {
        next[item.href] = isGroupActive(item.children);
      }
    });
    setOpen((prev) => ({ ...prev, ...next }));
  }, [pathname]);

  return (
    <aside className="h-full w-72 shrink-0 border-r bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="px-4 py-4">
        <div className="mb-4">
          <Link href="/" className="block" onClick={onNavigate}>
            <div className="text-xl font-extrabold tracking-tight">
              DEPAULA <span className="text-indigo-600">BPO</span>
            </div>
            <div className="text-xs text-muted-foreground">Sistema financeiro</div>
          </Link>
        </div>

        <nav className="space-y-1">
          {(MENU as MenuItem[]).map((item) => {
            // Caso 1: item SEM children (comportamento igual ao anterior)
            if (!item.children || item.children.length === 0) {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={[
                    "group flex items-center justify-between rounded-lg px-3 py-2 text-sm transition",
                    active
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                      : "hover:bg-gray-50 text-gray-700",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-2">
                    {/* {item.icon ? <item.icon className="h-4 w-4 opacity-70" /> : null} */}
                    {item.label}
                  </span>
                  <svg
                    className={[
                      "h-4 w-4 transition-transform opacity-40",
                      active ? "translate-x-0" : "-translate-x-1 group-hover:translate-x-0",
                    ].join(" ")}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M9 18l6-6-6-6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              );
            }

            // Caso 2: item COM children (ex.: Cadastro)
            const groupOpen = !!open[item.href];
            const groupActive = isGroupActive(item.children);
            return (
              <div key={item.href} className="rounded-lg">
                <button
                  type="button"
                  aria-expanded={groupOpen}
                  onClick={() => setOpen((prev) => ({ ...prev, [item.href]: !prev[item.href] }))}
                  className={[
                    "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                    groupActive
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                      : "hover:bg-gray-50 text-gray-700",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-2">
                    {/* {item.icon ? <item.icon className="h-4 w-4 opacity-70" /> : null} */}
                    {item.label}
                  </span>
                  <svg
                    className={[
                      "h-4 w-4 opacity-60 transition-transform",
                      groupOpen ? "rotate-90" : "",
                    ].join(" ")}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M9 6l6 6-6 6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {/* Submenu */}
                {groupOpen && (
                  <div className="mt-1 space-y-1 pl-2">
                    {item.children.map((child) => {
                      const active = isActive(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onNavigate}
                          className={[
                            "block rounded-md px-3 py-2 text-sm transition",
                            active
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              : "hover:bg-gray-50 text-gray-700",
                          ].join(" ")}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
