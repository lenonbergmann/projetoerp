"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { MenuItem } from "./menu";

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
      className={[
        "grid gap-4",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
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
  const Icon = (item as any).icon as React.ComponentType<
    React.SVGProps<SVGSVGElement>
  > | undefined;

  const Inner = (
    <div
      className="group relative overflow-hidden rounded-2xl border bg-card shadow-sm focus-within:ring-2 focus-within:ring-primary/50"
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
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-600" />
        )}

        {/* Rótulo discreto (default) */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-4 pointer-events-none">
          <div className="inline-flex items-center gap-2 rounded-full bg-black/45 px-3 py-1 text-white backdrop-blur-sm">
            {Icon ? <Icon className="h-4 w-4" /> : null}
            <span className="text-sm font-medium">{item.label}</span>
          </div>
        </div>

        {/* Máscara para leitura no hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100" />
      </div>

      {/* Conteúdo expandido (hover/focus) */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0">
        <div className="rounded-2xl bg-background/90 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="flex items-start gap-2">
            {Icon ? <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" /> : null}
            <div className="min-w-0">
              <div className="truncate font-semibold">{item.label}</div>
              {desc ? (
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{desc}</p>
              ) : null}
            </div>
          </div>

          {/* Chips de filhos */}
          {hasChildren ? (
            <div className="mt-3 flex flex-wrap gap-2">
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
                  <span key={keyFor(c as T, i)} className={chipClass} aria-disabled>
                    {c.label}
                  </span>
                )
              )}
              {item.children!.length > maxChildrenChips && item.href && (
                <Link href={item.href} className={chipGhostClass}>
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
    <Link href={item.href} className="block focus:outline-none">
      {Inner}
    </Link>
  ) : (
    <div className="focus:outline-none">{Inner}</div>
  );
}

/* --------------------------------- Styles --------------------------------- */

const chipClass =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium text-foreground/80 hover:bg-muted hover:text-foreground transition";

const chipGhostClass =
  "inline-flex items-center gap-1.5 rounded-full border border-transparent bg-muted/60 px-2.5 py-1 text-[11px] font-medium hover:bg-muted transition";
