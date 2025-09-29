import { prisma } from '../../lib/prisma.js'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const refreshSchema = z.object({
  refreshToken: z.string(),
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { refreshToken } = refreshSchema.parse(req.body)

    // Buscar refresh token
    const tokenData = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    })

    if (!tokenData || tokenData.expires_at < new Date()) {
      return res.status(401).json({
        error: 'Refresh token inválido ou expirado',
      })
    }

    if (!tokenData.user.is_active) {
      return res.status(401).json({ error: 'Usuário inativo' })
    }

    // Gerar novo access token
    const accessToken = jwt.sign(
      {
        sub: tokenData.user.id,
        email: tokenData.user.email,
        profile: tokenData.user.profile,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '1h' }
    )

    return res.status(200).json({
      access_token: accessToken,
      user: {
        id: tokenData.user.id,
        name: tokenData.user.name,
        email: tokenData.user.email,
        profile: tokenData.user.profile,
      },
    })

  } catch (error) {
    console.error('❌ Token refresh error:', error)
    return res.status(400).json({
      error: 'Erro ao renovar token',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    })
  } finally {
    await prisma.$disconnect()
  }
}