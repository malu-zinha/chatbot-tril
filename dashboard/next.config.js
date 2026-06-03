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
}

module.exports = nextConfig

