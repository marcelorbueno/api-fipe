export default function handler(req, res) {
  res.status(200).json({
    status: 'OK',
    service: 'API BMC FIPE',
    timestamp: new Date().toISOString(),
    uptime: 'serverless',
    version: '1.0.0-minimal'
  })
}