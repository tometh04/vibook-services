// Layout vacío para /admin/login - no requiere autenticación
export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
