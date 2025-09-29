import { prisma } from '../lib/prisma.js'

export default async function handler(req, res) {
  try {
    console.log('🔌 Testing Prisma database connection...')

    // Test basic database connection
    await prisma.$connect()
    console.log('✅ Connected to database')

    // Test query
    const result = await prisma.$queryRaw`SELECT 1 as test, NOW() as current_time`
    console.log('✅ Query executed successfully:', result)

    // Get database info
    const userCount = await prisma.user.count()
    const vehicleCount = await prisma.vehicle.count()
    const fipeCacheCount = await prisma.fipeCache.count()

    res.status(200).json({
      status: 'success',
      message: 'Prisma database connection successful',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        users: userCount,
        vehicles: vehicleCount,
        fipe_cache: fipeCacheCount
      },
      test_query: result[0]
    })

  } catch (error) {
    console.error('❌ Prisma database error:', error)

    res.status(500).json({
      status: 'error',
      message: 'Prisma database connection failed',
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN'
      }
    })
  } finally {
    await prisma.$disconnect()
  }
}