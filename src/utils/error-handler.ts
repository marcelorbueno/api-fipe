import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { Logger } from './logger'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details)
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

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Não autorizado') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acesso negado') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Erro interno do servidor', details?: unknown) {
    super(message, 500, 'INTERNAL_ERROR', details)
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(
      message || `Erro no serviço externo: ${service}`,
      503,
      'EXTERNAL_SERVICE_ERROR',
    )
  }
}

interface ErrorResponse {
  error: string
  code: string
  details?: unknown
  timestamp: string
  path?: string
}

export function logError(error: unknown, request?: FastifyRequest) {
  if (error instanceof Error) {
    const errorData = error instanceof AppError
      ? {
          statusCode: error.statusCode,
          code: error.code,
          details: error.details,
        }
      : undefined

    Logger.error(
      'Application error occurred',
      error,
      request,
      errorData,
    )
  } else {
    Logger.error(
      'Unknown error occurred',
      new Error(String(error)),
      request,
      { originalError: error },
    )
  }
}

export function handleError(
  error: unknown,
  reply: FastifyReply,
  request?: FastifyRequest,
) {
  logError(error, request)

  const timestamp = new Date().toISOString()
  const path = request?.url

  if (error instanceof AppError) {
    const response: ErrorResponse = {
      error: error.message,
      code: error.code || 'APP_ERROR',
      timestamp,
    }

    if (path) {
      response.path = path
    }

    if (error.details) {
      response.details = error.details
    }

    return reply.status(error.statusCode).send(response)
  }

  if (error instanceof z.ZodError) {
    const response: ErrorResponse = {
      error: 'Dados inválidos',
      code: 'VALIDATION_ERROR',
      details: error.errors,
      timestamp,
    }

    if (path) {
      response.path = path
    }

    return reply.status(400).send(response)
  }

  // Erro genérico - não expor detalhes em produção
  const response: ErrorResponse = {
    error: 'Erro interno do servidor',
    code: 'INTERNAL_ERROR',
    timestamp,
  }

  if (path) {
    response.path = path
  }

  return reply.status(500).send(response)
}

export function asyncHandler(
  handler: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      return await handler(req, reply)
    } catch (error) {
      handleError(error, reply, req)
    }
  }
}
