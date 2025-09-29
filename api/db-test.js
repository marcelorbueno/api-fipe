import { prisma } from '../lib/prisma.js'

export default async function handler(req, res) {
  try {
    console.log('🔌 Testing database connection...')

    // Test basic database connection
    await prisma.$connect()
    console.log('✅ Connected to database')

    // Test query
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Query executed successfully:', result)

    // Get database info
    const userCount = await prisma.user.count()
    const vehicleCount = await prisma.vehicle.count()

    res.status(200).json({
      status: 'success',
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        users: userCount,
        vehicles: vehicleCount
      },
      test_query: result
    })

  } catch (error) {
    console.error('❌ Database error:', error)

    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
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