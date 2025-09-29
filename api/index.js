export default function handler(req, res) {
  res.status(200).json({
    message: '🚀 API BMC FIPE Minimal - Working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    status: 'success'
  })
}