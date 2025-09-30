// src/components/layout/UserMenu.tsx
"use client";

import * as React from "react";
import Link from "next/link";

type Props = {
  name?: string;
  avatarUrl?: string | null;
  onLogout?: () => void;
  loginHref?: string;
  // opcional: links extras no menu
  items?: Array<{ label: string; href: string }>;
};

export default function UserMenu({
  name = "Usuário",
  avatarUrl = null,
  onLogout,
  loginHref = "/login",
  items = [
    { label: "Perfil", href: "/perfil" },
    { label: "Preferências", href: "/configuracoes" },
  ],
}: Props) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  // fecha ao clicar fora
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // fecha com Esc
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleLogoutClick = () => {
    if (onLogout) onLogout();
    else window.location.href = loginHref;
  };

  return (
    <div ref={ref} className="ml-auto relative flex items-center gap-3">
      <div className="hidden sm:flex flex-col items-end leading-tight">
        <span className="text-sm font-medium">{name}</span>
        <span className="text-[11px] text-muted-foreground">Logado</span>
      </div>

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center gap-2 rounded-lg border px-2 py-1.5 hover:bg-gray-50"
        title="Abrir menu do usuário"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="h-9 w-9 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white font-semibold">
            {getInitials(name)}
          </div>
        )}
        <svg className="h-4 w-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M6 9l6 6 6-6" strokeWidth="2" />
        </svg>
      </button>

      {/* Dropdown */}
      <div
        className={`${
          open ? "opacity-100 visible" : "opacity-0 invisible"
        } transition-opacity duration-150 absolute right-0 top-full mt-2 w-56 rounded-2xl border bg-white shadow-xl p-2 z-[100]`}
        role="menu"
      >
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="block rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            role="menuitem"
          >
            {it.label}
          </Link>
        ))}

        <button
          onClick={handleLogoutClick}
          className="mt-1 w-full text-left rounded-xl px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
          role="menuitem"
          aria-label="Sair"
          title="Sair"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

function getInitials(fullName?: string) {
  if (!fullName) return "U";
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}
