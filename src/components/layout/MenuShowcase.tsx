// src/components/layout/MenuShowcase.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { MenuItem } from "./menu";
import { cn } from "@/lib/utils";

/**
 * Mapa opcional para imagens (fallback).
 * Chaves aceitas por ordem de prioridade: id -> href -> label.
 * Ex.: { faturamento: "/img/menu/faturamento.svg", "/faturamento": "...", "Faturamento": "..." }
 */
export type ImageMap = Record<string, string>;

type Props<T extends MenuItem = MenuItem> = {
  items: T[];
  images?: ImageMap;
  className?: string;
  /** Quantos filhos exibir como "chips" no hover */
  maxChildrenChips?: number;
};

/**
 * Grade de cards com imagem. No estado normal mostra apenas a imagem + rótulo discreto.
 * No hover/focus, revela descrição e atalhos (children) e dá um leve zoom na imagem.
 */
export default function MenuShowcase<T extends MenuItem = MenuItem>({
  items,
  images = {},
  className,
  maxChildrenChips = 3,
}: Props<T>) {
  // Apenas itens de 1º nível com href ou filhos
  const topLevel = React.useMemo(
    () => items.filter((it) => it.href || (it.children && it.children.length)),
    [items]
  );

  return (
    <div
      className={cn(
        "grid auto-rows-[1fr] gap-5",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className
      )}
    >
      {topLevel.map((item, idx) => (
        <Card<T>
          key={keyFor(item, idx)}
          item={item}
          imageSrc={imageFor(item, images)}
          maxChildrenChips={maxChildrenChips}
          priority={idx < 2} // pré-carrega as 2 primeiras para melhorar LCP
        />
      ))}
    </div>
  );
}

/* --------------------------------- Helpers -------------------------------- */

function keyFor<T extends MenuItem>(item: T, idx: number) {
  // aceita id se existir; senão href; senão label+idx
  const anyItem = item as unknown as { id?: string };
  return anyItem?.id ?? item.href ?? `${item.label}-${idx}`;
}

function imageFor<T extends MenuItem>(item: T, images: ImageMap): string | undefined {
  // tenta usar imageSrc se existir; senão busca por id/href/label no mapa
  const anyItem = item as unknown as { id?: string; imageSrc?: string };
  return (
    anyItem.imageSrc ??
    (anyItem.id ? images[anyItem.id] : undefined) ??
    (item.href ? images[item.href] : undefined) ??
    images[item.label]
  );
}

function descriptionOf<T extends MenuItem>(item: T): string | undefined {
  const anyItem = item as unknown as { description?: string };
  return anyItem.description;
}

/* ---------------------------------- Card ---------------------------------- */

function Card<T extends MenuItem>({
  item,
  imageSrc,
  priority,
  maxChildrenChips,
}: {
  item: T;
  imageSrc?: string;
  priority?: boolean;
  maxChildrenChips: number;
}) {
  const hasChildren = !!item.children?.length;
  const desc = descriptionOf(item);
  const Icon = (item as any).icon as
    | React.ComponentType<React.SVGProps<SVGSVGElement>>
    | undefined;

  const content = (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-sm",
        "transition-all duration-300",
        "hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg",
        "focus-within:ring-2 focus-within:ring-primary/40 focus-within:ring-offset-1 focus-within:ring-offset-background"
      )}
      title={desc}
    >
      {/* Imagem / capa */}
      <div className="relative aspect-[16/9]">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={item.label}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-110 group-focus-within:scale-110"
            priority={priority}
          />
        ) : (
          // Fallback visual quando não houver imagem
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-sky-500 to-violet-600" />
        )}

        {/* Rótulo discreto (default) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-black/45 px-3 py-1 text-white backdrop-blur-sm">
            {Icon ? <Icon className="h-4 w-4" /> : null}
            <span className="text-sm font-medium">{item.label}</span>
          </div>
        </div>

        {/* Máscara para leitura no hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100" />
      </div>

      {/* Conteúdo expandido (hover/focus) */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-4 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0">
        <div className="pointer-events-auto rounded-2xl bg-background/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-start gap-2">
            {Icon ? <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" /> : null}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{item.label}</div>
              {desc ? (
                <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                  {desc}
                </p>
              ) : null}
            </div>
          </div>

          {/* Chips de filhos */}
          {hasChildren ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.children!.slice(0, maxChildrenChips).map((c, i) =>
                c.href ? (
                  <Link
                    key={keyFor(c as T, i)}
                    href={c.href}
                    className={chipClass}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="truncate">{c.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                  </Link>
                ) : (
                  <span
                    key={keyFor(c as T, i)}
                    className={chipDisabledClass}
                    aria-disabled
                  >
                    {c.label}
                  </span>
                )
              )}
              {item.children!.length > maxChildrenChips && item.href && (
                <Link
                  href={item.href}
                  className={chipGhostClass}
                  onClick={(e) => e.stopPropagation()}
                >
                  Ver todos
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  // Card clicável se houver href
  return item.href ? (
    <Link
      href={item.href}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={desc ? `${item.label} — ${desc}` : item.label}
    >
      {content}
    </Link>
  ) : (
    <div className="focus-visible:outline-none">{content}</div>
  );
}

/* --------------------------------- Styles --------------------------------- */

const baseChip =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition";

const chipClass = cn(
  baseChip,
  "border-border/70 bg-background/90 text-foreground/80 hover:bg-muted hover:text-foreground"
);

const chipGhostClass = cn(
  baseChip,
  "border-transparent bg-muted/70 text-foreground/80 hover:bg-muted"
);

const chipDisabledClass = cn(
  baseChip,
  "border-dashed border-border/60 bg-background/70 text-muted-foreground cursor-default"
);
