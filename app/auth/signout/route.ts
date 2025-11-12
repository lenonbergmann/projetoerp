// app/auth/signout/route.ts
import { NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/serverClient";

export async function POST() {
  const supabase = createServerComponentClient();
  await supabase.auth.signOut();

  // redireciona para /login
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
}
