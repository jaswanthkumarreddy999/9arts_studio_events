import { getSession } from '@/lib/auth'
import AdminDashboard from './AdminDashboard'

export default async function AdminPage() {
  const session = await getSession()
  if (!session) return null

  return <AdminDashboard adminName={session.name} />
}
