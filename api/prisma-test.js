import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req, res) {
  try {
    console.log('🔍 Testing Prisma + Neon connection...')

    // Test basic connection with Prisma
    const userCount = await prisma.user.count()
    const vehicleCount = await prisma.vehicle.count()

    // Test query with Prisma
    const users = await prisma.user.findMany({
      take: 1,
      select: {
        id: true,
        name: true,
        email: true,
        profile: true,
        created_at: true
      }
    })

    await prisma.$disconnect()

    res.status(200).json({
      status: 'success',
      message: 'Prisma + Neon connection successful',
      timestamp: new Date().toISOString(),
      data: {
        user_count: userCount,
        vehicle_count: vehicleCount,
        sample_user: users[0] || null
      }
    })

  } catch (error) {
    console.error('❌ Prisma test error:', error)

    await prisma.$disconnect()

    res.status(500).json({
      status: 'error',
      message: 'Prisma + Neon connection failed',
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN'
      }
    })
  }
}