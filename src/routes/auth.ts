import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { prisma } from '../lib/prisma'
import { TokenBlacklistService } from '../services/token-blacklist-service'

// Interface local que sobrescreve a tipagem padrão
interface AuthenticatedRequest extends FastifyRequest {
  user: {
    email: string
    profile?: 'ADMINISTRATOR' | 'PARTNER' | 'INVESTOR'
    sub?: string
  }
}

// Interface para JWT decodificado
interface DecodedJWT {
  sub?: string
  email?: string
  profile?: 'ADMINISTRATOR' | 'PARTNER' | 'INVESTOR'
  exp?: number
  iat?: number
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
  app.post('/auth/login', {
    schema: {
      tags: ['Autenticação'],
      summary: 'Fazer login na aplicação',
      description: 'Autentica um usuário e retorna tokens de acesso e refresh',
    },
  }, async (
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
        { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '1h' },
      )

      const refreshToken = randomUUID()

      // Salvar refresh token no banco
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          user_id: user.id,
          expires_at: new Date(
            Date.now() + (
              Number(process.env.JWT_REFRESH_TOKEN_EXPIRES_DAYS) || 7) *
              24 * 60 * 60 * 1000,
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
  app.post('/auth/refresh', {
    schema: {
      tags: ['Autenticação'],
      summary: 'Renovar token de acesso',
      description: 'Gera um novo token de acesso usando o refresh token',
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: {
            type: 'string',
            description: 'Token de renovação',
          },
        },
      },
      response: {
        200: {
          description: 'Token renovado com sucesso',
          type: 'object',
          properties: {
            access_token: {
              type: 'string',
              description: 'Novo token de acesso JWT',
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'ID do usuário' },
                name: { type: 'string', description: 'Nome do usuário' },
                email: { type: 'string', description: 'Email do usuário' },
                profile: {
                  type: 'string',
                  enum: ['ADMINISTRATOR', 'PARTNER', 'INVESTOR'],
                  description: 'Perfil do usuário',
                },
              },
            },
          },
        },
        401: {
          description: 'Refresh token inválido ou expirado',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        400: {
          description: 'Erro de validação',
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'string' },
          },
        },
      },
    },
  }, async (
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
  app.post('/auth/logout', {
    schema: {
      tags: ['Autenticação'],
      summary: 'Fazer logout da aplicação',
      description:
        'Invalida o refresh token e adiciona o access token à blacklist',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: {
            type: 'string',
            description: 'Token de renovação a ser invalidado',
          },
        },
      },
      response: {
        200: {
          description: 'Logout realizado com sucesso',
          type: 'object',
          properties: {
            message: {
              type: 'string',
            },
          },
        },
        400: {
          description: 'Erro no logout',
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'string' },
          },
        },
      },
    },
  }, async (
    req: FastifyRequest<{ Body: z.infer<typeof refreshSchema> }>,
    res,
  ) => {
    try {
      const { refreshToken } = refreshSchema.parse(req.body)

      // Extrair access token do header
      const authHeader = req.headers.authorization
      const accessToken = authHeader?.replace('Bearer ', '')

      // Remover refresh token
      await prisma.refreshToken.delete({
        where: { token: refreshToken },
      })

      // Adicionar access token à blacklist se fornecido
      if (accessToken) {
        try {
          // Decodificar token para obter expiração
          const decoded = jwt.decode(accessToken) as DecodedJWT
          const expiresAt = decoded?.exp
            ? new Date(decoded.exp * 1000)
            : new Date(Date.now() + 24 * 60 * 60 * 1000) // Default: 24h

          const success = await TokenBlacklistService.addTokenToBlacklist(
            accessToken,
            expiresAt,
          )

          if (success) {
            console.log(
              '✅ Token adicionado à blacklist - logout efetivo imediato',
            )
          }
        } catch (tokenError) {
          console.warn('Erro ao adicionar token à blacklist:', tokenError)
        }
      }

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
    schema: {
      tags: ['Autenticação'],
      summary: 'Obter dados do usuário logado',
      description: 'Retorna as informações do usuário autenticado',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Dados do usuário',
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'ID do usuário' },
                name: { type: 'string', description: 'Nome do usuário' },
                email: { type: 'string', description: 'Email do usuário' },
                profile: {
                  type: 'string',
                  enum: ['ADMINISTRATOR', 'PARTNER', 'INVESTOR'],
                  description: 'Perfil do usuário',
                },
                phone_number: {
                  type: 'string',
                  description: 'Telefone do usuário',
                },
                is_active: {
                  type: 'boolean',
                  description: 'Se o usuário está ativo',
                },
                created_at: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Data de criação',
                },
              },
            },
          },
        },
        401: {
          description: 'Usuário não autenticado',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        404: {
          description: 'Usuário não encontrado',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
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

  // GET /auth/blacklist/stats - Estatísticas da blacklist (Admin only)
  app.get('/auth/blacklist/stats', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest

    // Apenas administradores podem ver estatísticas
    if (authRequest.user?.profile !== 'ADMINISTRATOR') {
      return reply.status(403).send({
        error: 'Acesso negado - apenas administradores',
      })
    }

    try {
      const stats = await TokenBlacklistService.getBlacklistStats()
      return reply.send({
        blacklist: stats,
        message: 'Estatísticas da blacklist de tokens',
      })
    } catch (error) {
      return reply.status(500).send({
        error: 'Erro ao obter estatísticas da blacklist',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // POST /auth/blacklist/cleanup - Limpeza manual da blacklist (Admin only)
  app.post('/auth/blacklist/cleanup', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest

    // Apenas administradores podem fazer limpeza
    if (authRequest.user?.profile !== 'ADMINISTRATOR') {
      return reply.status(403).send({
        error: 'Acesso negado - apenas administradores',
      })
    }

    try {
      const result = await TokenBlacklistService.cleanupExpiredTokens()
      return reply.send({
        cleanup: result,
        message: `Limpeza concluída: ${result.deleted} tokens removidos`,
      })
    } catch (error) {
      return reply.status(500).send({
        error: 'Erro na limpeza da blacklist',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })
}
