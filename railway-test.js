// Ultra-minimal server for Railway debugging
console.log('🚀 Railway Test: Starting...')
console.log('📍 Process PID:', process.pid)
console.log('🔧 Node version:', process.version)
console.log('🌍 Environment:', process.env.NODE_ENV || 'development')
console.log('🚪 Port:', process.env.PORT || 3001)

const http = require('http')

const server = http.createServer((req, res) => {
  console.log(`📨 Request: ${req.method} ${req.url}`)

  res.writeHead(200, { 'Content-Type': 'application/json' })

  if (req.url === '/ping' || req.url === '/health') {
    res.end(JSON.stringify({
      status: 'OK',
      timestamp: new Date().toISOString(),
      message: 'Railway test server responding',
      uptime: process.uptime()
    }))
  } else {
    res.end(JSON.stringify({
      message: 'Railway test server running',
      endpoints: ['/ping', '/health']
    }))
  }
})

const PORT = process.env.PORT || 3001
const HOST = '0.0.0.0'

server.listen(PORT, HOST, () => {
  console.log(`✅ Railway test server listening on ${HOST}:${PORT}`)
  console.log(`🔍 Health endpoint: http://${HOST}:${PORT}/health`)

  // Log server status every 30 seconds
  setInterval(() => {
    console.log(`💓 Server alive - uptime: ${Math.floor(process.uptime())}s`)
  }, 30000)
})

server.on('error', (error) => {
  console.error('❌ Server error:', error)
  process.exit(1)
})

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})