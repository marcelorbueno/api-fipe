import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('🏓 Ping requested on Vercel')

  res.status(200).json({
    status: 'pong',
    timestamp: new Date().toISOString(),
    platform: 'vercel',
    method: req.method,
    url: req.url
  })
}