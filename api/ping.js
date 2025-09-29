export default function handler(req, res) {
  res.status(200).json({
    status: 'pong',
    timestamp: new Date().toISOString(),
    server: 'vercel-serverless'
  })
}