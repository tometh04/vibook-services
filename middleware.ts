// Middleware vacío para evitar que Next.js busque uno
// No hacer nada, solo pasar las requests

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
