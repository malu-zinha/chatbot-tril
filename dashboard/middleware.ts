import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { InvalidCredentialError, readCredential } from '@/lib/secrets'

/**
 * Protege todo o dashboard atrás do login.
 * - Sem sessão e fora de /login -> redireciona pra /login.
 * - Logado tentando abrir /login -> manda pra home.
 * - /api/* não é redirecionado (os route handlers fazem a própria checagem
 *   e respondem 401, em vez de devolver HTML de redirect).
 */
export async function middleware(request: NextRequest) {
  let url = ''
  let key = ''
  try {
    url = readCredential('NEXT_PUBLIC_SUPABASE_URL')
    key = readCredential('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  } catch (error) {
    // Credencial malformada. A mensagem do InvalidCredentialError nunca inclui
    // o valor; qualquer outra coisa não é logada, para não arriscar vazamento.
    console.error(
      error instanceof InvalidCredentialError
        ? `[middleware] ${error.message}`
        : '[middleware] Credencial Supabase inválida.'
    )
    return NextResponse.next({ request })
  }

  // Sem env configurado (ex.: dev sem .env.local) -> não bloqueia, pra não
  // derrubar o ambiente. Em produção as variáveis estão sempre setadas.
  if (!url || !key) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isLoginRoute = pathname.startsWith('/login')
  const isApiRoute = pathname.startsWith('/api')

  if (!user && !isLoginRoute && !isApiRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  if (user && isLoginRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas, exceto estáticos do Next e imagens.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
