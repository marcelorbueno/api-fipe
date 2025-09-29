import { prisma } from '../../lib/prisma.js'
import jwt from 'jsonwebtoken'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    // Verificar authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de acesso requerido' })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verificar e decodificar JWT
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (jwtError) {
      return res.status(401).json({ error: 'Token inválido ou expirado' })
    }

    // Buscar usuário por email
    const userData = await prisma.user.findUnique({
      where: { email: decoded.email },
      select: {
        id: true,
        name: true,
        email: true,
        profile: true,
        phone_number: true,
        is_active: true,
        created_at: true,
      },
    })

    if (!userData || !userData.is_active) {
      return res.status(404).json({ error: 'Usuário não encontrado ou inativo' })
    }

    return res.status(200).json({ user: userData })

  } catch (error) {
    console.error('❌ Auth me error:', error)
    return res.status(500).json({
      error: 'Erro ao buscar dados do usuário',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    })
  } finally {
    await prisma.$disconnect()
  }
}