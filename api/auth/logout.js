import { z } from 'zod'
import { db } from '../../lib/database.js'

const logoutSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token é obrigatório'),
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { refresh_token } = logoutSchema.parse(req.body)

    // Remover refresh token do banco
    await db.deleteRefreshToken(refresh_token)

    return res.status(200).json({
      message: 'Logout realizado com sucesso',
    })

  } catch (error) {
    console.error('❌ Logout error:', error)

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