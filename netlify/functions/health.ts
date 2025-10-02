import type { Handler } from '@netlify/functions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const handler: Handler = async () => {
  console.log('🩺 Health check requested')

  try {
    // Test database connection
    let dbStatus = 'disconnected'
    let dbError: string | null = null

    try {
      await prisma.$queryRaw`SELECT 1`
      dbStatus = 'connected'
      console.log('✅ Database health check passed')
    } catch (error) {
      dbStatus = 'error'
      dbError = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Database health check failed:', error)
    }

    // Build health data
    const healthData = {
      status: dbStatus === 'connected' ? 'OK' : 'DEGRADED',
      service: 'API BMC FIPE',
      platform: 'Netlify Functions',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'production',
      version: '1.0.0-netlify',
      services: {
        database: dbStatus,
        api: 'running',
      },
      ...(dbError && { database_error: dbError }),
    }

    console.log(`✅ Health check executado - Ambiente: ${healthData.environment}`)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: JSON.stringify(healthData),
    }
  } catch (error) {
    console.error('❌ Erro no health check:', error)

    return {
      statusCode: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: JSON.stringify({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        error: 'Service temporarily unavailable',
      }),
    }
  }
}
