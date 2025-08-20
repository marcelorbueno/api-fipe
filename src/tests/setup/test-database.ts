import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import path from 'path'

// Carregar explicitamente o .env.test
const envTestPath = path.resolve(process.cwd(), '.env.test')
dotenv.config({ path: envTestPath })

// Determinar URL do banco de teste
const getTestDatabaseUrl = (): string => {
  // Primeira prioridade: TEST_DATABASE_URL do .env.test
  if (process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL
  }

  // Segunda prioridade: DATABASE_URL do .env.test
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  // Fallback padrão
  return 'postgresql://fipe:senha123@localhost:5432/fipe_test_db'
}

const testDatabaseUrl = getTestDatabaseUrl()

console.log('🗄️ Usando banco de teste:', testDatabaseUrl.split('@')[1])

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: testDatabaseUrl,
    },
  },
  log: ['error'], // Apenas erros em testes
})

/**
 * Limpar todos os dados de teste
 */
export async function cleanupAllTestData(): Promise<void> {
  try {
    // Ordem importante para respeitar foreign keys
    await prisma.vehicleOwnership.deleteMany()
    await prisma.fipeCache.deleteMany()
    await prisma.vehicle.deleteMany()
    await prisma.refreshToken.deleteMany()
    await prisma.user.deleteMany()

    console.log('🧹 Dados de teste limpos')
  } catch (error) {
    console.error('❌ Erro ao limpar dados de teste:', error)
    throw error
  }
}

// Setup único de conexão
let isConnected = false

export async function ensureTestDatabaseConnection(): Promise<void> {
  if (!isConnected) {
    try {
      await prisma.$connect()
      console.log(
        '📋 Conectado ao banco de teste:', testDatabaseUrl.split('@')[1])
      isConnected = true
    } catch (error) {
      console.error('❌ Erro ao conectar ao banco de teste:', error)
      throw error
    }
  }
}

export async function disconnectTestDatabase(): Promise<void> {
  if (isConnected) {
    try {
      await prisma.$disconnect()
      console.log('🔒 Desconectado do banco de teste')
      isConnected = false
    } catch (error) {
      console.error('❌ Erro ao desconectar do banco de teste:', error)
    }
  }
}

// Setup global apenas se necessário
if (process.env.NODE_ENV === 'test') {
  // Hook de limpeza global no final de todos os testes
  process.on('beforeExit', async () => {
    await disconnectTestDatabase()
  })
}
