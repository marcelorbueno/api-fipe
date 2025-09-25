import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Super simple response to test if the basic handler works
    res.status(200).json({
      message: 'API BMC is working!',
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
      environment: 'production'
    })
  } catch (error) {
    console.error('Handler error:', error)
    res.status(500).json({ error: 'Handler failed', details: error })
  }
}