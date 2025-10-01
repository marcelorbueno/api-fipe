import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'minimal',
})

// Schemas
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

// Helper functions
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      profile: user.profile,
    },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '1h' }
  )
}

const generateRefreshToken = () => {
  return require('crypto').randomBytes(32).toString('hex')
}

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret')
  } catch (error) {
    throw new Error('Token inválido')
  }
}

// Route handlers
const handleLogin = async (body) => {
  const { email, password } = loginSchema.parse(JSON.parse(body))

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      name: true,
      profile: true,
      is_active: true
    }
  })

  if (!user || !user.is_active) {
    throw new Error('Credenciais inválidas')
  }

  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) {
    throw new Error('Credenciais inválidas')
  }

  const accessToken = generateAccessToken(user)
  const refreshToken = generateRefreshToken()

  // Create refresh token with 7 days expiration
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      user_id: user.id,
      expires_at: expiresAt
    }
  })

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      profile: user.profile,
    },
  }
}

const handleMe = async (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token de acesso requerido')
  }

  const token = authHeader.replace('Bearer ', '')
  const decoded = verifyToken(token)

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    select: {
      id: true,
      name: true,
      email: true,
      profile: true,
      is_active: true
    }
  })

  if (!user || !user.is_active) {
    throw new Error('Usuário não encontrado ou inativo')
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      profile: user.profile,
    }
  }
}

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

  const path = event.path
  const method = event.httpMethod

  try {
    let result

    if (path.includes('/login') && method === 'POST') {
      result = await handleLogin(event.body)
    } else if (path.includes('/me') && method === 'GET') {
      result = await handleMe(event.headers.authorization)
    } else {
      await prisma.$disconnect()
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Endpoint não encontrado' })
      }
    }

    await prisma.$disconnect()

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    }

  } catch (error) {
    console.error('❌ Auth error:', error)
    await prisma.$disconnect()

    let statusCode = 500
    if (error.message.includes('Credenciais inválidas') ||
        error.message.includes('Token') ||
        error.message.includes('não encontrado')) {
      statusCode = 401
    } else if (error instanceof z.ZodError) {
      statusCode = 400
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: error.message || 'Erro interno do servidor',
        details: error instanceof z.ZodError ? error.errors : undefined
      })
    }
  }
}