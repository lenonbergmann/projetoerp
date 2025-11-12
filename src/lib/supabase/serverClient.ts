// src/lib/supabase/serverClient.ts
import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function env(
  name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
) {
  const v = process.env[name];
  if (!v) throw new Error(`Faltou ${name} no .env.local`);
  return v;
}

/**
 * Compatível com Next 16.
 * - Usa await cookies() porque pode ser Promise<ReadonlyRequestCookies>
 * - Em Server Actions/Route Handlers, cookies() expõe .set(); aqui usamos
 *   detecção de recurso (set?.) para não quebrar em Server Components.
 */
export function createServerComponentClient(): SupabaseClient {
  return createServerClient(
    env('NEXT_PUBLIC_SUPABASE_URL'),
    env('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        async get(name: string) {
          const store = await cookies();
          return store.get(name)?.value ?? undefined;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            const store = await cookies();
            // Cast leve para acessar .set quando disponível (Route Handler/Server Action)
            const mutable = store as unknown as {
              set?: (args: { name: string; value: string } & CookieOptions) => void;
            };
            mutable.set?.({ name, value, ...options });
          } catch {
            // Em Server Components puros, não é permitido setar cookie.
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            const store = await cookies();
            const mutable = store as unknown as {
              set?: (args: { name: string; value: string } & CookieOptions) => void;
            };
            // MaxAge=0 apaga o cookie quando o ambiente permitir mutação
            mutable.set?.({ name, value: '', ...options, maxAge: 0 });
          } catch {
            // Em Server Components puros, não é permitido remover cookie.
          }
        },
      },
    }
  );
}
