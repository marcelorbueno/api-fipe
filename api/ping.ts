import { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'pong',
    timestamp: new Date().toISOString(),
    platform: 'vercel',
    method: req.method,
    url: req.url
  })
}