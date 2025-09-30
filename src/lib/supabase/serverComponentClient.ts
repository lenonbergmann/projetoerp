// src/lib/supabase/serverComponentClient.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createServerComponentClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const store = await cookies();
          return store.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            const store = await cookies();
            store.set({ name, value, ...options });
          } catch {
            // só é permitido setar cookie em Server Action ou Route Handler
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            const store = await cookies();
            store.set({ name, value: "", ...options });
          } catch {
            // idem acima
          }
        },
      },
    }
  );
}
