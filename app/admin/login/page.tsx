import { AdminLoginForm } from './AdminLoginForm'

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const params = await searchParams
  const redirectTo = params.redirect || '/admin/dashboard'

  return <AdminLoginForm redirectTo={redirectTo} />
}
