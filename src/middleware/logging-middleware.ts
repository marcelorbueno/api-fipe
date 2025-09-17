import { FastifyReply, FastifyRequest } from 'fastify'
import { Logger } from '../utils/logger'

export async function requestLoggingMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log da requisição
  Logger.request(request, 'Incoming request')

  // Armazenar timestamp no request para usar posteriormente
  ;(request as any).startTime = Date.now()
}

export async function securityLoggingMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log eventos de segurança relevantes
  const authHeader = request.headers.authorization
  const userAgent = request.headers['user-agent']
  const ip = request.ip

  // Detectar tentativas suspeitas
  if (authHeader && !authHeader.startsWith('Bearer ')) {
    Logger.warn('Invalid authorization header format', {
      authHeader: authHeader.substring(0, 20) + '...',
      userAgent,
      ip
    }, request)
  }

  // Log de tentativas de acesso a endpoints protegidos sem auth
  if (request.url.startsWith('/vehicles') ||
      request.url.startsWith('/users') ||
      request.url.startsWith('/patrimony')) {
    if (!authHeader) {
      Logger.warn('Unauthenticated access attempt to protected endpoint', {
        endpoint: request.url,
        userAgent,
        ip
      }, request)
    }
  }
}