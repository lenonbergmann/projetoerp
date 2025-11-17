// src/components/providers/ThemeProvider.tsx
"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps as NextThemesProviderProps,
} from "next-themes";

/**
 * Temas suportados pela aplicação.
 * (Adicione aqui se criar temas customizados: "corporate", etc.)
 */
export type AppTheme = "light" | "dark" | "system";

/**
 * Wrapper do next-themes com defaults pensados para app SaaS:
 * - Usa `class` para alternar temas (compatível com Tailwind)
 * - Respeita o tema do sistema por padrão
 * - Desabilita animações bruscas ao trocar de tema
 * - Usa um storageKey próprio para evitar conflitos com outros projetos
 */
type Props = Omit<NextThemesProviderProps, "defaultTheme"> & {
  children: React.ReactNode;
  defaultTheme?: AppTheme;
};

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = true,
  storageKey = "depaula-bpo-theme", // ajuste o prefixo se quiser
  ...rest
}: Props) {
  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      storageKey={storageKey}
      {...rest}
    >
      {children}
    </NextThemesProvider>
  );
}
