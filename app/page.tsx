export default function Home() {
  // Renderizar directamente en lugar de redirect para evitar errores
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
    return null
  }
  return null
}

