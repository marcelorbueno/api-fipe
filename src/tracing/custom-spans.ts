import { FastifyRequest } from 'fastify'
import { tracingEnabled } from './tracer'

export interface SpanContext {
  operation: string
  attributes?: Record<string, string | number | boolean>
  request?: FastifyRequest
}

// Função auxiliar para extrair ID do usuário de forma type-safe
function getUserId(request: FastifyRequest): string {
  // Usando type assertion de forma mais segura
  const userRequest = request as FastifyRequest & {
    user?: { id?: string }
  }
  return userRequest.user?.id || 'anonymous'
}

/**
 * Wrapper para criar spans customizados (modo simplificado)
 */
export async function withSpan<T>(
  spanContext: SpanContext,
  fn: () => Promise<T>,
): Promise<T> {
  const { operation, attributes = {}, request } = spanContext
  const startTime = Date.now()

  if (tracingEnabled) {
    console.log(`🔍 [TRACE] Starting: ${operation}`, {
      attributes,
      user: request
        ? getUserId(request)
        : undefined,
    })
  }

  try {
    const result = await fn()
    const duration = Date.now() - startTime

    if (tracingEnabled) {
      console.log(`✅ [TRACE] Completed: ${operation} (${duration}ms)`)
    }

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    if (tracingEnabled) {
      console.log(`❌ [TRACE] Failed: ${operation} (${duration}ms)`, {
        error: error instanceof Error
          ? error.message
          : String(error),
      })
    }

    throw error
  }
}

/**
 * Wrapper específico para operações de banco de dados
 */
export async function withDatabaseSpan<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>,
  request?: FastifyRequest,
): Promise<T> {
  return withSpan({
    operation: `db.${operation}`,
    attributes: {
      'db.operation': operation,
      'db.table': table,
      'db.system': 'postgresql',
    },
    request,
  }, fn)
}

/**
 * Wrapper específico para chamadas de API externa
 */
export async function withExternalApiSpan<T>(
  service: string,
  endpoint: string,
  fn: () => Promise<T>,
  request?: FastifyRequest,
): Promise<T> {
  return withSpan({
    operation: `external.${service}`,
    attributes: {
      'external.service': service,
      'external.endpoint': endpoint,
      'span.kind': 'client',
    },
    request,
  }, fn)
}

/**
 * Wrapper específico para operações de cache
 */
export async function withCacheSpan<T>(
  operation: 'get' | 'set' | 'delete' | 'clear',
  key: string,
  fn: () => Promise<T>,
  request?: FastifyRequest,
): Promise<T> {
  return withSpan({
    operation: `cache.${operation}`,
    attributes: {
      'cache.operation': operation,
      'cache.key': key,
      'cache.system': 'memory',
    },
    request,
  }, fn)
}

/**
 * Adicionar contexto de usuário (modo simplificado)
 */
export function addUserContextToCurrentSpan(
  userId: string,
  userProfile?: string,
) {
  if (tracingEnabled) {
    console.log('🔍 [TRACE] User context:', { userId, userProfile })
  }
}

/**
 * Adicionar métricas de performance (modo simplificado)
 */
export function addPerformanceMetrics(metrics: {
  duration?: number
  memory_usage?: number
  cpu_usage?: number
  custom_metrics?: Record<string, number>
}) {
  if (tracingEnabled) {
    console.log('📊 [TRACE] Performance metrics:', metrics)
  }
}
