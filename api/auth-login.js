import { z } from 'zod'
import { db } from '../../lib/database.js'
import { authService } from '../../lib/auth.js'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { email, password } = loginSchema.parse(req.body)

    // Buscar usuário
    const user = await db.findUser(email)
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Usuário inativo' })
    }

    // Verificar senha
    const isPasswordValid = await authService.verifyPassword(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    // Gerar tokens
    const accessToken = authService.generateAccessToken(user)
    const refreshToken = authService.generateRefreshToken()
    const refreshTokenExpires = authService.getRefreshTokenExpiration()

    // Salvar refresh token
    await db.createRefreshToken(user.id, refreshToken, refreshTokenExpires)

    return res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600, // 1 hora em segundos
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile: user.profile,
      },
    })

  } catch (error) {
    console.error('❌ Login error:', error)

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