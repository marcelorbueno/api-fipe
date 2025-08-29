import { env } from '@/env'
import { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'
import { TokenBlacklistService } from '../services/token-blacklist-service'

interface JWTPayload {
  sub: string,
  email: string
  profile?: 'ADMINISTRATOR' | 'PARTNER' | 'INVESTOR'
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const authHeader = request.headers.authorization

    if (!authHeader) {
      return reply.status(401).send({
        error: 'Token de acesso requerido',
      })
    }

    const token = authHeader.replace('Bearer ', '')

    if (!token) {
      return reply.status(401).send({
        error: 'Token de acesso inválido',
      })
    }

    // Verificar se o token está na blacklist
    const isBlacklisted = await TokenBlacklistService.isTokenBlacklisted(token)

    if (isBlacklisted) {
      return reply.status(401).send({
        error: 'Token de acesso revogado',
      })
    }

    const JWT_SECRET =
      process.env.JWT_SECRET || env.JWT_SECRET || 'your-secret-key'

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload

    request.user = {
      userId: decoded.sub,
      email: decoded.email,
      profile: decoded.profile,
    }
  } catch {
    return reply.status(401).send({
      error: 'Token de acesso inválido ou expirado',
    })
  }
}
