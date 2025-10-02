import { FastifyInstance, FastifyReply } from 'fastify'
import { env } from '../env'
import { prisma } from '../lib/prisma'

export async function healthRoutes(app: FastifyInstance) {
  // Simple health check without database dependency for Railway
  app.get('/health', async (_, reply: FastifyReply) => {
    console.log('🩺 Health check requested')

    if (process.env.NODE_ENV === 'production') {
      // Simple health check for production to avoid blocking Railway
      return reply.send({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: '1.0.0',
        message: 'Service is running'
      })
    }

    try {
      // Test database connection
      let dbStatus = 'disconnected'
      let dbError = null

      try {
        await prisma.$queryRaw`SELECT 1`
        dbStatus = 'connected'
        console.log('✅ Database health check passed')
      } catch (error) {
        dbStatus = 'error'
        dbError = error instanceof Error ? error.message : 'Unknown error'
        console.error('❌ Database health check failed:', error)
      }

      // Dados básicos (sempre disponíveis)
      const healthData = {
        status: dbStatus === 'connected' ? 'OK' : 'DEGRADED',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: env.NODE_ENV,
        version: '1.0.0',
        services: {
          database: dbStatus,
          api: 'running',
        },
        ...(dbError && { database_error: dbError }),
      }

      // ⚠️ Informações detalhadas apenas em desenvolvimento
      if (process.env.NODE_ENV !== 'production') {
        Object.assign(healthData, {
          details: {
            memory: process.memoryUsage(),
            pid: process.pid,
            node_version: process.version,
            platform: process.platform,
            cpu_usage: process.cpuUsage(),
          },
        })
      }

      console.log(`✅ Health check executado - Ambiente: ${env.NODE_ENV}`)

      return reply.send(healthData)
    } catch (error) {
      console.error('❌ Erro no health check:', error)

      return reply.status(503).send({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        error: 'Service temporarily unavailable',
      })
    }
  })

  // Ultra-simple ping endpoint for Railway connectivity testing
  app.get('/ping', async (_, reply: FastifyReply) => {
    console.log('🏓 Ping requested')
    return reply.send({ status: 'pong', timestamp: new Date().toISOString() })
  })
}
