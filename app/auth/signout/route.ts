import { createServerComponentClient } from "@/lib/supabase/serverComponentClient"; // Importação atualizada
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers"; // Adicionar importação de cookies

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const cookieStore = cookies(); // Obter cookieStore
  const supabase = createServerComponentClient(cookieStore); // Uso atualizado

  await supabase.auth.signOut();

  return NextResponse.redirect(`${requestUrl.origin}/login`, { status: 302 });
}
