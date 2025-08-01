import { FastifyReply } from 'fastify'

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
  }
}
