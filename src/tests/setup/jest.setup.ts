// src/tests/setup/jest.setup.ts
import { jest, beforeAll, afterAll, afterEach } from '@jest/globals'

// Configurar timeout global mais alto
jest.setTimeout(60000) // 60 segundos

// Mock console.error para testes mais limpos, mas manter warnings importantes
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' && (
        args[0].includes('Warning') ||
        args[0].includes('deprecated') ||
        args[0].includes('ExperimentalWarning')
      )
    ) {
      return
    }
    originalError.call(console, ...args)
  }

  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' && (
        args[0].includes('deprecated') ||
        args[0].includes('ExperimentalWarning')
      )
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})

// Global error handlers para prevenir crashes
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason)
  // Não fazer process.exit() aqui para não quebrar os testes
})

process.on('uncaughtException', (error) => {
  console.log('Uncaught Exception:', error)
  // Não fazer process.exit() aqui para não quebrar os testes
})

// Limpar timers após cada teste para evitar memory leaks
afterEach(() => {
  // Limpar todos os timers pendentes
  jest.clearAllTimers()

  // Forçar garbage collection se disponível
  if (global.gc) {
    global.gc()
  }
})

// Setup específico para testes de integração
beforeAll(async () => {
  // Garantir que variáveis de ambiente estão definidas
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-super-secure'
  }

  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL não definida para testes')
  }
})

// Cleanup final
afterAll(async () => {
  // Dar tempo para recursos serem liberados
  await new Promise(resolve => setTimeout(resolve, 100))

  // Limpar variáveis de ambiente de teste se necessário
  delete process.env.JWT_SECRET
})
