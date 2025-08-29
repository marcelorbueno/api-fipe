import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} não encontrado`, 404, 'NOT_FOUND')
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
  }
}

export function handleError(error: unknown, reply: FastifyReply) {
  console.error('❌ Error:', error)

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
      ...(error instanceof ValidationError && { details: error.details }),
    })
  }

  if (error instanceof z.ZodError) {
    return reply.status(400).send({
      error: 'Dados inválidos',
      code: 'VALIDATION_ERROR',
      details: error.errors,
    })
  }

  return reply.status(500).send({
    error: 'Erro interno do servidor',
    code: 'INTERNAL_ERROR',
  })
}

export function asyncHandler(
  handler: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      return await handler(req, reply)
    } catch (error) {
      handleError(error, reply)
    }
  }
}
