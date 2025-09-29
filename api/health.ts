import { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'production',
    platform: 'vercel',
    version: '1.0.0',
    uptime: 'serverless',
    message: 'API BMC FIPE is healthy'
  })
}