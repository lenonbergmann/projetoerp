// src/lib/supabase/clientComponentClient.ts
'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Cria um único cliente no browser e reaproveita entre renders.
 * Em dev, se faltar env, apenas avisa no console (não dá throw).
 */
export function createClientComponentClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if ((!url || !anon) && process.env.NODE_ENV !== 'production') {
    console.warn(
      '[supabase] Faltou NEXT_PUBLIC_SUPABASE_URL/ANON_KEY no .env.local. ' +
      'O Next carrega envs no start; pare e rode `npm run dev` novamente após criar/alterar.'
    );
  }

  _client = createBrowserClient(url!, anon!);
  return _client;
}
