// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Rotas que exigem login
const PROTECTED_PREFIXES = ["/dashboard"];

export async function middleware(req: NextRequest) {
  // sempre crie uma resposta regravável p/ setar cookies
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // em middleware, escrevemos cookies na resposta
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Exemplo de proteção: bloqueia acesso às rotas /dashboard* se não logado
  const isProtected = PROTECTED_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p));
  if (isProtected) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Pode opcionalmente redirecionar usuário logado que acessa /login
  if (req.nextUrl.pathname === "/login") {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // já logado → manda escolher empresa
      return NextResponse.redirect(new URL("/selecionar-empresa", req.url));
    }
  }

  return res;
}

export const config = {
  // ajuste os matchers conforme sua necessidade
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets).*)"],
};
