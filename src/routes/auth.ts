import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { env } from '@/env'

const prisma = new PrismaClient()

// Interface local que sobrescreve a tipagem padrão
interface AuthenticatedRequest extends FastifyRequest {
  user: {
    email: string
    profile?: 'ADMINISTRATOR' | 'PARTNER' | 'INVESTOR'
    sub?: string
  }
}

// Schemas de validação
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const refreshSchema = z.object({
  refreshToken: z.string(),
})

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/login - Login do usuário
  app.post('/auth/login', async (
    req: FastifyRequest<{ Body: z.infer<typeof loginSchema> }>,
    res,
  ) => {
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
        return res.status(401).send({ error: 'Credenciais inválidas' })
      }

      // Verificar senha
      const isPasswordValid = await bcrypt.compare(password, user.password)
      if (!isPasswordValid) {
        return res.status(401).send({ error: 'Credenciais inválidas' })
      }

      // Gerar tokens
      const accessToken = app.jwt.sign(
        {
          sub: user.id,
          email: user.email,
          profile: user.profile,
        },
        { expiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN },
      )

      const refreshToken = randomUUID()

      // Salvar refresh token no banco
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          user_id: user.id,
          expires_at: new Date(
            Date.now() + env.JWT_REFRESH_TOKEN_EXPIRES_DAYS *
            24 * 60 * 60 * 1000, // 7 dias por default
          ),
        },
      })

      return res.send({
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
      return res.status(400).send({
        error: 'Erro no login',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // POST /auth/refresh - Renovar token
  app.post('/auth/refresh', async (
    req: FastifyRequest<{ Body: z.infer<typeof refreshSchema> }>,
    res,
  ) => {
    try {
      const { refreshToken } = refreshSchema.parse(req.body)

      // Buscar refresh token
      const tokenData = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      })

      if (!tokenData || tokenData.expires_at < new Date()) {
        return res.status(401).send({
          error:
          'Refresh token inválido ou expirado',
        })
      }

      if (!tokenData.user.is_active) {
        return res.status(401).send({ error: 'Usuário inativo' })
      }

      // Gerar novo access token
      const accessToken = app.jwt.sign(
        {
          sub: tokenData.user.id,
          email: tokenData.user.email,
          profile: tokenData.user.profile,
        },
        { expiresIn: '15m' },
      )

      return res.send({
        access_token: accessToken,
        user: {
          id: tokenData.user.id,
          name: tokenData.user.name,
          email: tokenData.user.email,
          profile: tokenData.user.profile,
        },
      })
    } catch (error) {
      return res.status(400).send({
        error: 'Erro ao renovar token',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // POST /auth/logout - Logout
  app.post('/auth/logout', async (
    req: FastifyRequest<{ Body: z.infer<typeof refreshSchema> }>,
    res,
  ) => {
    try {
      const { refreshToken } = refreshSchema.parse(req.body)

      // Remover refresh token
      await prisma.refreshToken.delete({
        where: { token: refreshToken },
      })

      return res.send({ message: 'Logout realizado com sucesso' })
    } catch (error) {
      return res.status(400).send({
        error: 'Erro no logout',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // GET /auth/me - Dados do usuário logado
  app.get('/auth/me', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest

    if (!authRequest.user || !authRequest.user.email) {
      return reply.status(401).send({ error: 'Usuário não autenticado' })
    }

    // Buscar por EMAIL em vez de ID
    const userData = await prisma.user.findUnique({
      where: { email: authRequest.user.email },
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

    if (!userData) {
      return reply.status(404).send({ error: 'Usuário não encontrado' })
    }

    return reply.send({ user: userData })
  })
}
