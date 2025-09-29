import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('🩺 Health check requested on Vercel')

    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: 'production',
      platform: 'vercel',
      version: '1.0.0',
      method: req.method,
      url: req.url
    }

    console.log('✅ Health check successful')
    res.status(200).json(healthData)
  } catch (error) {
    console.error('❌ Health check error:', error)
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Service temporarily unavailable',
      platform: 'vercel'
    })
  }
}