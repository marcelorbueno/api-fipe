import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.status(200).json({
      message: 'API BMC Test Endpoint Working!',
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Test handler error:', error)
    res.status(500).json({ error: 'Test handler failed', details: error })
  }
}