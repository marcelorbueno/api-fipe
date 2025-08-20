// src/tests/setup/test-server.ts - ATUALIZADO
import Fastify, { FastifyInstance } from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'
import { authenticate } from '../../middleware/auth'
import { healthRoutes } from '../../routes/health'
import { authRoutes } from '../../routes/auth'
import { fipeRoutes } from '../../routes/fipe'
import { usersRoutes } from '../../routes/users'
import { vehiclesRoutes } from '../../routes/vehicles'
import { patrimonyRoutes } from '../../routes/patrimony'

export async function createTestServer(): Promise<FastifyInstance> {
  // Criar nova instância do Fastify para testes
  const testApp = Fastify({
    logger: false, // Desabilitar logs durante os testes
  })

  try {
    // Registrar CORS
    await testApp.register(fastifyCors, { origin: '*' })

    // Registrar JWT com secret de teste
    await testApp.register(fastifyJwt, {
      secret:
        process.env.JWT_SECRET ||
        'test-jwt-secret-key-for-testing-only-super-secure',
    })

    // Adicionar método authenticate
    testApp.decorate('authenticate', authenticate)

    // Registrar todas as rotas atualizadas
    await testApp.register(healthRoutes)
    await testApp.register(authRoutes)
    await testApp.register(fipeRoutes)
    await testApp.register(usersRoutes)
    await testApp.register(vehiclesRoutes)
    await testApp.register(patrimonyRoutes)

    // Aguardar o servidor estar pronto
    await testApp.ready()

    console.log('✅ Servidor de teste configurado com sucesso')

    return testApp
  } catch (error) {
    console.error('❌ Erro ao configurar servidor de teste:', error)
    throw error
  }
}

export async function closeTestServer(
  server: FastifyInstance | null,
): Promise<void> {
  try {
    if (server) {
      await server.close()
      console.log('🔒 Servidor de teste fechado')
    }
  } catch (error) {
    console.error('❌ Erro ao fechar servidor de teste:', error)
  }
}
