// src/lib/supabase/browser.ts
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

function env(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const v = process.env[name];
  if (!v) throw new Error(`[supabase] Variável ${name} ausente em .env.local`);
  return v;
}

let client: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (client) return client;
  client = createBrowserClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: true },
  }) as unknown as SupabaseClient; // coerção segura: createBrowserClient retorna SupabaseClient
  return client;
}
