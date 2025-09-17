import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify'
import { logError } from '../utils/error-handler'

export async function errorMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction,
) {
  // Hook para capturar erros não tratados
  reply.hijack()

  const originalSend = reply.send.bind(reply)

  reply.send = function (payload: unknown) {
    if (reply.statusCode >= 400 && reply.statusCode < 600) {
      logError(
        new Error(`HTTP ${reply.statusCode}: ${JSON.stringify(payload)}`),
        request,
      )
    }
    return originalSend(payload)
  }

  done()
}

// Hook para capturar promises rejeitadas não tratadas
export function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error)
    process.exit(1)
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
    process.exit(1)
  })
}
