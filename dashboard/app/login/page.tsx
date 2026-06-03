import LoginForm from './LoginForm'

// Sem isto, /login é pré-renderizada estática e o Next emite
// `Cache-Control: s-maxage=31536000` — a borda do Railway cacheava esse HTML
// por ~1 ano e servia o shell ANTIGO (com os chunks JS antigos do dashboard, de
// antes da correção de busca) pra todo mundo que entrava, inclusive em aba
// anônima. `headers()` no next.config NÃO resolve: o Next sobrescreve o
// Cache-Control de páginas estáticas. `force-dynamic` faz a página ser servida
// com `no-store` (igual a `/`), então a borda nunca mais cacheia o login antigo.
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return <LoginForm />
}
