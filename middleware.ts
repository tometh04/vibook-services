import { NextResponse, type NextRequest } from 'next/server'

// MIDDLEWARE TEMPORALMENTE DESHABILITADO PARA DEBUG
// Si el error 500 persiste sin middleware, entonces el problema está en otra parte
export function middleware(req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Matcher vacío efectivamente deshabilita el middleware
    // Esto nos permite verificar si el problema está en el middleware o en otra parte
  ],
}
