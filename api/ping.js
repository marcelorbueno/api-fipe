export default function handler(req, res) {
  res.status(200).json({
    status: 'pong',
    timestamp: new Date().toISOString(),
    platform: 'vercel',
    method: req.method,
    url: req.url
  })
}