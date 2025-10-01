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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    console.log('🔍 Testing Prisma on Netlify...')

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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        message: '🎉 Prisma working on Netlify!',
        platform: 'Netlify Functions',
        timestamp: new Date().toISOString(),
        data: {
          user_count: userCount,
          sample_user: users[0] || null,
          prisma_version: '6.13.0'
        }
      })
    }

  } catch (error) {
    console.error('❌ Prisma Netlify test error:', error)

    await prisma.$disconnect()

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'Prisma test failed on Netlify',
        platform: 'Netlify Functions',
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          code: error.code || 'UNKNOWN'
        }
      })
    }
  }
}