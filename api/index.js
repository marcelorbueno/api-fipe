export default function handler(req, res) {
  res.status(200).json({
    message: 'API BMC FIPE - Vercel deployment successful!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    platform: 'vercel',
    status: 'running',
    endpoints: ['/api/health', '/api/ping'],
    note: 'Use /api/health or /api/ping for testing'
  })
}