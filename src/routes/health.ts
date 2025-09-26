import { FastifyInstance, FastifyReply } from 'fastify'
import axios from '../config/axios'
import { env } from '../env'
import { prisma } from '../lib/prisma'

export async function healthRoutes(app: FastifyInstance) {
  // 🔍 Health Check - Teste de conexão
  app.get('/health', async (_, reply: FastifyReply) => {
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
        try {
          console.log('🔧 [DEV] Testando configurações de proxy...')
          console.log('HTTP_PROXY:', env.HTTP_PROXY)
          console.log('HTTPS_PROXY:', env.HTTPS_PROXY)

          // Teste de conectividade externa
          const connectivityTest = await axios.get('https://httpbin.org/ip')

          // Adicionar informações detalhadas
          Object.assign(healthData, {
            details: {
              memory: process.memoryUsage(),
              pid: process.pid,
              node_version: process.version,
              platform: process.platform,
              cpu_usage: process.cpuUsage(),
            },
            proxy: {
              http_proxy: env.HTTP_PROXY || 'não configurado',
              https_proxy: env.HTTPS_PROXY || 'não configurado',
              connectivity_test: {
                status: 'success',
                external_ip: connectivityTest.data,
                message: 'Conectividade externa OK',
              },
            },
          })

          console.log('✅ Teste de conectividade OK:', connectivityTest.data)
        } catch (connectivityError) {
          console.error('❌ Teste de conectividade falhou:', connectivityError)

          // Mesmo com erro de conectividade, incluir informações de proxy
          Object.assign(healthData, {
            details: {
              memory: process.memoryUsage(),
              pid: process.pid,
              node_version: process.version,
              platform: process.platform,
              cpu_usage: process.cpuUsage(),
            },
            proxy: {
              http_proxy: env.HTTP_PROXY || 'não configurado',
              https_proxy: env.HTTPS_PROXY || 'não configurado',
              connectivity_test: {
                status: 'error',
                message: 'Falha no teste de conectividade externa',
                error: connectivityError instanceof Error
                  ? connectivityError.message
                  : 'Erro desconhecido',
              },
            },
          })
        }
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
}
