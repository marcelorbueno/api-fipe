import { prisma } from '../../lib/prisma.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { email, password } = loginSchema.parse(req.body)

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        profile: true,
        is_active: true,
        name: true,
      },
    })

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    // Gerar tokens
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        profile: user.profile,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '1h' }
    )

    const refreshToken = randomUUID()

    // Salvar refresh token no banco
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        user_id: user.id,
        expires_at: new Date(
          Date.now() + (Number(process.env.JWT_REFRESH_TOKEN_EXPIRES_DAYS) || 7) * 24 * 60 * 60 * 1000
        ),
      },
    })

    return res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile: user.profile,
      },
    })

  } catch (error) {
    console.error('❌ Login error:', error)
    return res.status(400).json({
      error: 'Erro no login',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    })
  } finally {
    await prisma.$disconnect()
  }
}