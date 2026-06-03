/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  // Railway monta `.next/cache` como volume persistente. O cache de build do
  // webpack nesse volume vinha servindo módulos compilados ANTIGOS (ex.:
  // ProjetosTable velho), mesmo com o código novo no commit. Desligar o cache
  // do webpack força compilação do zero a cada deploy -> sempre o código atual.
  webpack: (config) => {
    config.cache = false
    return config
  },
  // A borda do Railway estava cacheando o HTML das páginas por 1 ano
  // (cache-control: s-maxage=31536000) e servindo versões ANTIGAS — que
  // referenciam o JS antigo, trazendo de volta o ProjetosTable bugado.
  // `no-store` nas páginas (mas NÃO nos assets /_next/static, que são
  // versionados por hash e devem continuar cacheados) impede esse cache.
  async headers() {
    return [
      {
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
        ],
      },
    ]
  },
}

module.exports = nextConfig

