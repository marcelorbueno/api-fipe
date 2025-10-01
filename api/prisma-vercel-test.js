import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req, res) {
  try {
    console.log('🔍 Testing Prisma with official Vercel setup...')

    // Test basic connection
    const userCount = await prisma.user.count()

    // Test a simple query
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
      message: 'Prisma working with official Vercel setup!',
      timestamp: new Date().toISOString(),
      data: {
        user_count: userCount,
        sample_user: users[0] || null,
        prisma_version: process.env.npm_package_dependencies_prisma || 'unknown'
      }
    })

  } catch (error) {
    console.error('❌ Prisma Vercel test error:', error)

    await prisma.$disconnect()

    res.status(500).json({
      status: 'error',
      message: 'Prisma test failed',
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    })
  }
}