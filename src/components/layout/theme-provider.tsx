"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps as NextThemesProviderProps,
} from "next-themes";

/**
 * Wrapper do next-themes que aceita as mesmas props do provider original.
 * Mantém defaults sensatos e permite sobrescrever via props.
 */
type Props = Partial<NextThemesProviderProps> & { children: React.ReactNode };

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = true,
  ...rest
}: Props) {
  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      {...rest}
    >
      {children}
    </NextThemesProvider>
  );
}
