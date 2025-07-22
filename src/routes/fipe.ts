import { FastifyInstance, FastifyRequest } from 'fastify'
// import { Prisma, PrismaClient } from '@prisma/client'

interface FipeQuery {
  emailUsuario?: string;
  search?: string;
}

// const prisma = new PrismaClient()

export async function fipeRoutes(app: FastifyInstance) {
  // Listar protocolos
  app.get('/fipe', async (
    req: FastifyRequest<{ Querystring: FipeQuery }>, res) => {
    return res.send({ msg: 'Hello World' })
  })
}
