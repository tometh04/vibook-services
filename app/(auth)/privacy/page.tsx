import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-800">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">Política de Privacidad</CardTitle>
          <CardDescription>
            Última actualización: {new Date().toLocaleDateString('es-AR')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            La política de privacidad está en desarrollo. Por favor, contacta a soporte para más información.
          </p>
          <Link href="/signup" className="text-primary hover:underline">
            Volver al registro
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
