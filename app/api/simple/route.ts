export const runtime = 'nodejs'

export async function GET() {
  return Response.json({ message: 'OK', timestamp: new Date().toISOString() })
}
