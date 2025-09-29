import { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    message: 'API BMC FIPE - Vercel deployment successful!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    platform: 'vercel',
    status: 'running'
  })
}