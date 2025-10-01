import { z } from 'zod'
import { db } from '../../lib/database.js'
import { authService } from '../../lib/auth.js'

const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token é obrigatório'),
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { refresh_token } = refreshSchema.parse(req.body)

    // Buscar refresh token
    const tokenData = await db.findRefreshToken(refresh_token)
    if (!tokenData) {
      return res.status(401).json({
        error: 'Refresh token inválido ou expirado',
      })
    }

    if (!tokenData.is_active) {
      return res.status(401).json({ error: 'Usuário inativo' })
    }

    // Gerar novo access token
    const accessToken = authService.generateAccessToken({
      id: tokenData.user_id,
      email: tokenData.email,
      profile: tokenData.profile,
    })

    return res.status(200).json({
      access_token: accessToken,
      expires_in: 3600, // 1 hora em segundos
      user: {
        id: tokenData.user_id,
        name: tokenData.name,
        email: tokenData.email,
        profile: tokenData.profile,
      },
    })

  } catch (error) {
    console.error('❌ Token refresh error:', error)

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.errors,
      })
    }

    return res.status(500).json({
      error: 'Erro interno do servidor',
    })
  }
}