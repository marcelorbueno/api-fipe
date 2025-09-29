const fastify = require('fastify')({ logger: true })

// Minimal test server
fastify.get('/ping', async (request, reply) => {
  return { status: 'pong', timestamp: new Date().toISOString() }
})

fastify.get('/health', async (request, reply) => {
  return { status: 'OK', timestamp: new Date().toISOString() }
})

const start = async () => {
  try {
    const PORT = process.env.PORT || 3001
    console.log('🚀 Starting minimal test server on port', PORT)
    await fastify.listen({ port: Number(PORT), host: '0.0.0.0' })
    console.log('✅ Minimal server started successfully')
  } catch (err) {
    console.error('❌ Error starting server:', err)
    process.exit(1)
  }
}

start()