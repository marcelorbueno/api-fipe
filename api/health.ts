export default function handler(req: any, res: any) {
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