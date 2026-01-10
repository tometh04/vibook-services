import { NextResponse } from "next/server"

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ 
    message: 'Test endpoint works!',
    timestamp: new Date().toISOString()
  })
}
