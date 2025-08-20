import { beforeAll, afterAll } from '@jest/globals'
import { PrismaClient } from '@prisma/client'

// Usar banco de teste separado
const testDatabaseUrl = process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL?.replace('/fipe_db', '/fipe_test_db') ||
  'postgresql://fipe:senha123@localhost:5432/fipe_test_db'

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: testDatabaseUrl,
    },
  },
  log: process.env.NODE_ENV === 'test'
    ? []
    : ['error'],
})

// Configurar hooks globais do Jest
beforeAll(async () => {
  try {
    // Conectar ao banco de teste
    await prisma.$connect()
    console.log('📋 Conectado ao banco de teste')
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de teste:', error)
    throw error
  }
})

afterAll(async () => {
  try {
    // Limpar dados e desconectar
    await cleanupAllTestData()
    await prisma.$disconnect()
    console.log('🔒 Desconectado do banco de teste')
  } catch (error) {
    console.error('❌ Erro ao desconectar do banco de teste:', error)
  }
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
  } catch (error) {
    console.error('❌ Erro ao limpar dados de teste:', error)
    throw error
  }
}
