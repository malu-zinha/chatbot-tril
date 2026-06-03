import DashboardClient from '@/components/DashboardClient'

// Mesmo motivo de `/login`: sem isto, `/inicio` é estática e fica cacheada por
// ~1 ano na borda do Railway, servindo o bundle antigo. `force-dynamic` ->
// `no-store`, como já é em `/` (app/page.tsx).
export const dynamic = 'force-dynamic'

export default function InicioPage() {
  return <DashboardClient />
}
