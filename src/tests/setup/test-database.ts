import dotenv from 'dotenv'
import path from 'path'

// Carregar explicitamente o .env.test
const envTestPath = path.resolve(process.cwd(), '.env.test')
dotenv.config({ path: envTestPath })

// Re-exportar o prisma do lib (que já tem a lógica de ambiente)
export { prisma } from '../../lib/prisma'

/**
 * Limpar todos os dados de teste
 */
export async function cleanupAllTestData(): Promise<void> {
  const { prisma } = await import('../../lib/prisma')

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
