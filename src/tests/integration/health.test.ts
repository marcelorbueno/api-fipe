import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { FastifyInstance } from 'fastify'
import { createTestServer, closeTestServer } from '../setup/test-server'

describe('Health Routes', () => {
  let server: FastifyInstance

  beforeAll(async () => {
    server = await createTestServer()
  })

  afterAll(async () => {
    await closeTestServer(server)
  })

  describe('GET /health', () => {
    test('should return health status successfully', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)

      // Verificar estrutura básica da resposta
      expect(body).toHaveProperty('status', 'OK')
      expect(body).toHaveProperty('timestamp')
      expect(body).toHaveProperty('uptime')
      expect(body).toHaveProperty('environment')
      expect(body).toHaveProperty('version', '1.0.0')
      expect(body).toHaveProperty('services')

      // Verificar serviços
      expect(body.services).toHaveProperty('database', 'connected')
      expect(body.services).toHaveProperty('api', 'running')

      // Verificar se timestamp é uma data válida
      expect(new Date(body.timestamp)).toBeInstanceOf(Date)

      // Verificar se uptime é um número
      expect(typeof body.uptime).toBe('number')
      expect(body.uptime).toBeGreaterThan(0)
    })

    test(
      'should include development details when NODE_ENV is development',
      async () => {
      // Salvar NODE_ENV original
        const originalNodeEnv = process.env.NODE_ENV

        // Definir como development
        process.env.NODE_ENV = 'development'

        const response = await server.inject({
          method: 'GET',
          url: '/health',
        })

        expect(response.statusCode).toBe(200)

        const body = JSON.parse(response.body)

        // Em desenvolvimento, deve incluir detalhes extras
        expect(body).toHaveProperty('details')
        expect(body).toHaveProperty('proxy')

        if (body.details) {
          expect(body.details).toHaveProperty('memory')
          expect(body.details).toHaveProperty('pid')
          expect(body.details).toHaveProperty('node_version')
          expect(body.details).toHaveProperty('platform')
          expect(body.details).toHaveProperty('cpu_usage')
        }

        if (body.proxy) {
          expect(body.proxy).toHaveProperty('http_proxy')
          expect(body.proxy).toHaveProperty('https_proxy')
          expect(body.proxy).toHaveProperty('connectivity_test')
        }

        // Restaurar NODE_ENV original
        process.env.NODE_ENV = originalNodeEnv
      })

    test(
      'should not include development details when NODE_ENV is production',
      async () => {
      // Salvar NODE_ENV original
        const originalNodeEnv = process.env.NODE_ENV

        // Definir como production
        process.env.NODE_ENV = 'production'

        const response = await server.inject({
          method: 'GET',
          url: '/health',
        })

        expect(response.statusCode).toBe(200)

        const body = JSON.parse(response.body)

        // Em produção, não deve incluir detalhes extras
        expect(body).not.toHaveProperty('details')
        expect(body).not.toHaveProperty('proxy')

        // Restaurar NODE_ENV original
        process.env.NODE_ENV = originalNodeEnv
      })

    test('should have correct response headers', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toContain('application/json')
    })

    test('should handle health check in reasonable time', async () => {
      const startTime = Date.now()

      const response = await server.inject({
        method: 'GET',
        url: '/health',
      })

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.statusCode).toBe(200)

      // Health check deve responder em menos de 5 segundos
      expect(responseTime).toBeLessThan(5000)
    })
  })
})
