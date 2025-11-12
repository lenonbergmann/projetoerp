// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mantém checks úteis em dev
  reactStrictMode: true,

  // 🚀 NEW (Next 16): ativa o modelo de Cache Components / "use cache"
  // Permite cachear Server Components/funcões e usar cacheLife/cacheTag/updateTag
  // Veja: docs "cacheComponents" + diretiva 'use cache'
  cacheComponents: true,

  // 🚀 NEW: habilita o React Compiler (auto-memoization) — teste no seu projeto
  // Ganhos em tabelas/listas/dashboards pesados
  reactCompiler: true,

  // Otimizador de imagens do Next (libera domínios externos)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },            // Supabase Storage
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // Avatares Google (OAuth)
      { protocol: "https", hostname: "files.manuscdn.com" },        // Seu CDN
      // adicione outros hosts se precisar
    ],
  },

  // ✅ MIGRAÇÃO: experimental.turbo → turbopack (Next 16)
  // Se você usava experimental.turbo, mova regras para este bloco.
  // Obs.: a maioria dos projetos NÃO precisa declarar nada aqui.
  turbopack: {
    // Exemplo (mantenho vazio, como no seu rules:{} original):
    // rules: {
    //   '*.svg': { loaders: ['@svgr/webpack'], as: '*.js' }
    // },
  },

  // ⚡ Cache em disco do Turbopack (acelera builds/next dev)
  // Sugestão: ligar em dev; para build, ative quando testar estabilidade
  experimental: {
    turbopackFileSystemCacheForDev: true,
    // turbopackFileSystemCacheForBuild: false, // ative depois se quiser
  },

  // (opcional) Para deploys em Docker/VMs, útil gerar bundle enxuto:
  // output: 'standalone',
};

export default nextConfig;
