// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/serverClient";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  const DEFAULT_REDIRECT = "/selecionar-empresa";

  // opcional: permitir ?next=/algum-caminho interno
  const nextParam = url.searchParams.get("next") ?? url.searchParams.get("redirect");
  const hasSafeNext =
    typeof nextParam === "string" &&
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//");

  const redirectTo = hasSafeNext ? nextParam! : DEFAULT_REDIRECT;

  try {
    if (code) {
      const supabase = createServerComponentClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[auth/callback] exchangeCodeForSession error:", error.message);
      }
    } else {
      console.warn("[auth/callback] Missing ?code param");
    }
  } catch (err) {
    console.error("[auth/callback] Unexpected error:", err);
  }

  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
