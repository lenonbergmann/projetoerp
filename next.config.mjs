// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Otimizador de imagens do Next (libera domínios externos)
  images: {
    // Se quiser liberar só seu projeto Supabase, troque "**.supabase.co" por "jhjwxjixgjhueyupkvoz.supabase.co"
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },          // Supabase Storage (logos/arquivos)
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // Avatares Google (OAuth)
      { protocol: "https", hostname: "files.manuscdn.com" },        // Seu CDN de logos/imagens
      // adicione outros hosts externos aqui se precisar (ex.: "avatars.githubusercontent.com", "cdn.jsdelivr.net", etc.)
    ],
  },

  // Mantém pages/app estáveis com Turbopack no dev (Next 15)
  experimental: {
    turbo: {
      rules: {}, // placeholder para futuras regras (se precisar transpilar algo específico)
    },
  },
};

export default nextConfig;
