import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'minimal',
})

export const handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' })
    }
  }

  try {
    console.log('🧹 Starting database reset...')

    // Delete all data in reverse dependency order
    console.log('Deleting vehicle_ownerships...')
    await prisma.vehicleOwnership.deleteMany()

    console.log('Deleting vehicles...')
    await prisma.vehicle.deleteMany()

    console.log('Deleting fipe_cache...')
    await prisma.fipeCache.deleteMany()

    console.log('Deleting refresh_tokens...')
    await prisma.refreshToken.deleteMany()

    console.log('Deleting users...')
    await prisma.user.deleteMany()

    await prisma.$disconnect()

    console.log('✅ Database reset completed successfully!')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        message: 'Database reset completed successfully',
        timestamp: new Date().toISOString(),
        tables_cleared: [
          'vehicle_ownerships',
          'vehicles',
          'fipe_cache',
          'refresh_tokens',
          'users'
        ]
      })
    }

  } catch (error) {
    console.error('❌ Database reset error:', error)
    await prisma.$disconnect()

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'Database reset failed',
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          code: error.code || 'UNKNOWN'
        }
      })
    }
  }
}