import { redirect } from 'next/navigation'
import { getOwnerOrNull } from '@/lib/supabaseServer'
import AdminClient from '@/components/AdminClient'

export const dynamic = 'force-dynamic'

/**
 * Painel admin — só o owner ativo acessa. Não-owners (ou deslogados) são
 * mandados pra home. A segurança real fica nas rotas /api/admin (service_role);
 * essa checagem aqui é só pra UX.
 */
export default async function AdminPage() {
  const owner = await getOwnerOrNull()
  if (!owner) {
    redirect('/')
  }

  return <AdminClient ownerId={owner.id} ownerEmail={owner.email ?? ''} />
}
