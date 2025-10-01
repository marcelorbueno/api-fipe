import 'fastify'
import '@fastify/jwt'

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string
      email: string
      profile?: 'ADMINISTRATOR' | 'PARTNER' | 'INVESTOR'
    }
  }

  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>
    jwt: {
      sign: (payload: object, options?: { expiresIn?: string }) => string
      verify: (token: string) => object
    }
  }

  interface FastifySchema {
    tags?: string[]
    summary?: string
    description?: string
    security?: Array<Record<string, string[]>>
  }
}
