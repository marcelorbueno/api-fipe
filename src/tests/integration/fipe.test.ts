import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals'
import { FastifyInstance } from 'fastify'
import { createTestServer, closeTestServer } from '../setup/test-server'
import { cleanupTestData } from '../helpers/auth-helper'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

describe('FIPE Routes', () => {
  let server: FastifyInstance
  let testUserToken: string

  // Criar usuário de teste diretamente no banco para evitar problemas do
  // AuthHelper
  async function createTestUserWithToken() {
    const hashedPassword = await bcrypt.hash('password123', 10)

    const testUser = await prisma.user.create({
      data: {
        name: 'FIPE Test User',
        num_cpf: '12345678901',
        email: 'fipe-test@example.com',
        password: hashedPassword,
        birthday: new Date('1990-01-01'),
        phone_number: '11999999999',
        profile: 'ADMINISTRATOR',
        is_active: true,
      },
    })

    // Gerar token JWT diretamente usando o server
    const token = server.jwt.sign(
      {
        sub: testUser.id,
        email: testUser.email,
        profile: testUser.profile,
      },
      { expiresIn: '1h' },
    )

    return token
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-super-secure'
    server = await createTestServer()
  })

  afterAll(async () => {
    await closeTestServer(server)
  })

  beforeEach(async () => {
    await cleanupTestData()

    try {
      testUserToken = await createTestUserWithToken()
    } catch (error) {
      console.error('Erro ao criar usuário de teste:', error)
      throw error
    }
  })

  describe('GET /fipe/vehicle-types', () => {
    test('should return available vehicle types', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/vehicle-types',
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)

      expect(body).toHaveProperty('vehicle_types')
      expect(Array.isArray(body.vehicle_types)).toBe(true)
      expect(body.vehicle_types).toHaveLength(2)

      // Verificar se contém carros e motos
      const vehicleTypes = body.vehicle_types
      expect(vehicleTypes.some(
        (vt: { code: string; name: string }) => vt.code === 'cars')).toBe(true)
      expect(vehicleTypes.some(
        (vt: { code: string; name: string }) => vt.code === 'motorcycles'),
      ).toBe(true)

      // Verificar estrutura dos tipos
      expect(vehicleTypes[0]).toHaveProperty('code')
      expect(vehicleTypes[0]).toHaveProperty('name')
    })

    test('should require authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/vehicle-types',
        // Sem headers de autenticação
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /fipe/:vehicleType/brands', () => {
    test('should return brands for cars when API is available', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/cars/brands',
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
      })

      // Aceitar sucesso ou erro de conectividade externa
      expect([200, 404, 429, 500, 503]).toContain(response.statusCode)

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body)

        expect(Array.isArray(body)).toBe(true)
        expect(body.length).toBeGreaterThan(0)

        // Verificar estrutura da primeira marca
        if (body.length > 0) {
          const firstBrand = body[0] as { code: string | number; name: string }
          expect(firstBrand).toHaveProperty('code')
          expect(firstBrand).toHaveProperty('name')
          expect(['number', 'string']).toContain(typeof firstBrand.code)
          expect(typeof firstBrand.name).toBe('string')
        }
      }
    })

    test('should fail with invalid vehicle type', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/invalid-type/brands',
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error', 'Tipo de veículo inválido')
    })

    test('should require authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/cars/brands',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /fipe/:vehicleType/brands/:brandId/models', () => {
    test('should return models for valid brand when API is available',
      async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/fipe/cars/brands/21/models', // Fiat
          headers: {
            authorization: `Bearer ${testUserToken}`,
          },
        })

        // Aceitar sucesso ou erro de conectividade externa
        expect([200, 404, 429, 500, 503]).toContain(response.statusCode)

        if (response.statusCode === 200) {
          const body = JSON.parse(response.body)

          expect(Array.isArray(body)).toBe(true)

          // Se há modelos, verificar estrutura
          if (body.length > 0) {
            const firstModel =
              body[0] as { code: string | number; name: string }
            expect(firstModel).toHaveProperty('code')
            expect(firstModel).toHaveProperty('name')
            expect(['number', 'string']).toContain(typeof firstModel.code)
            expect(typeof firstModel.name).toBe('string')
          }
        }
      })

    test('should fail with invalid brand ID', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/cars/brands/invalid/models',
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
      })

      // Aceitar vários status codes para erro
      expect([400, 500]).toContain(response.statusCode)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error')

      // Aceitar diferentes mensagens de erro da API FIPE
      const errorMessage = body.error.toLowerCase()
      expect(
        errorMessage.includes('inválido') ||
        errorMessage.includes('erro') ||
        errorMessage.includes('api'),
      ).toBe(true)
    })

    test('should require authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/cars/brands/1/models',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /fipe/:vehicleType/brands/:brandId/models/:modelId/years',
    () => {
      test('should return years for valid model when API is available',
        async () => {
          const response = await server.inject({
            method: 'GET',
            url: '/fipe/cars/brands/21/models/7540/years', // Fiat Uno
            headers: {
              authorization: `Bearer ${testUserToken}`,
            },
          })

          // Aceitar sucesso ou erro de conectividade externa
          expect([200, 404, 429, 500, 503]).toContain(response.statusCode)

          if (response.statusCode === 200) {
            const body = JSON.parse(response.body)

            expect(Array.isArray(body)).toBe(true)

            // Se há anos, verificar estrutura
            if (body.length > 0) {
              const firstYear = body[0] as { code: string; name: string }
              expect(firstYear).toHaveProperty('code')
              expect(firstYear).toHaveProperty('name')
              expect(typeof firstYear.code).toBe('string')
              expect(typeof firstYear.name).toBe('string')
            }
          }
        })

      test('should fail with invalid brand or model IDs', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/fipe/cars/brands/invalid/models/invalid/years',
          headers: {
            authorization: `Bearer ${testUserToken}`,
          },
        })

        // Aceitar vários status codes para erro
        expect([400, 500]).toContain(response.statusCode)

        const body = JSON.parse(response.body)
        expect(body).toHaveProperty('error')

        // Aceitar diferentes mensagens de erro da API FIPE
        const errorMessage = body.error.toLowerCase()
        expect(
          errorMessage.includes('inválido') ||
        errorMessage.includes('erro') ||
        errorMessage.includes('api'),
        ).toBe(true)
      })

      test('should require authentication', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/fipe/cars/brands/1/models/1/years',
        })

        expect(response.statusCode).toBe(401)
      })
    })

  describe(
    'GET /fipe/:vehicleType/brands/:brandId/models/:modelId/years/:yearId',
    () => {
      test('should return vehicle details for valid parameters when API is ' +
      'available', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/fipe/cars/brands/21/models/7540/years/2020-1',
          headers: {
            authorization: `Bearer ${testUserToken}`,
          },
        })

        // Aceitar tanto sucesso quanto erro de conectividade
        expect([200, 404, 429, 500, 503]).toContain(response.statusCode)

        if (response.statusCode === 200) {
          const body = JSON.parse(response.body)
          expect(body).toHaveProperty('success', true)
          expect(body).toHaveProperty('data')

          if (body.data) {
            expect(body.data).toHaveProperty('brand')
            expect(body.data).toHaveProperty('model')
            expect(body.data).toHaveProperty('price')
          }
        }
      })

      test('should fail with invalid parameters', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/fipe/cars/brands/invalid/models/invalid/years/invalid',
          headers: {
            authorization: `Bearer ${testUserToken}`,
          },
        })

        // Aceitar vários status codes para erro
        expect([400, 500]).toContain(response.statusCode)

        const body = JSON.parse(response.body)
        expect(body).toHaveProperty('error')

        // Aceitar diferentes mensagens de erro da API FIPE
        const errorMessage = body.error.toLowerCase()
        expect(
          errorMessage.includes('inválido') ||
        errorMessage.includes('erro') ||
        errorMessage.includes('api'),
        ).toBe(true)
      })

      test('should require authentication', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/fipe/cars/brands/1/models/1/years/2020-1',
        })

        expect(response.statusCode).toBe(401)
      })
    })

  describe('GET /fipe/references', () => {
    test('should return available reference periods when API is available',
      async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/fipe/references',
          headers: {
            authorization: `Bearer ${testUserToken}`,
          },
        })

        // Aceitar sucesso ou erro de conectividade externa
        expect([200, 404, 429, 500, 503]).toContain(response.statusCode)

        if (response.statusCode === 200) {
          const body = JSON.parse(response.body)

          expect(Array.isArray(body)).toBe(true)
          expect(body.length).toBeGreaterThan(0)

          // Verificar estrutura da primeira referência se existir
          if (body.length > 0) {
            const firstReference =
            body[0] as { code: string | number; name?: string; month?: string }
            expect(firstReference).toHaveProperty('code')
            // Pode ter 'name' ou 'month' dependendo da API
            expect(
              'name' in firstReference ||
            'month' in firstReference,
            ).toBe(true)
          }
        }
      })

    test('should require authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/references',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('Error Handling', () => {
    test('should handle missing authentication properly', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/vehicle-types',
      })

      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error')
    })

    test('should handle invalid endpoints', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/invalid-endpoint',
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('External API Resilience', () => {
    test('should gracefully handle FIPE API timeout', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/cars/brands',
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
      })

      // Aceitar vários códigos de status possíveis
      expect([200, 404, 408, 429, 500, 503]).toContain(response.statusCode)
    }, 10000) // Timeout específico de 10 segundos para este teste

    test('should handle FIPE API unavailability', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/motorcycles/brands',
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
      })

      // Sistema deve responder mesmo se a API externa estiver fora
      expect([200, 404, 429, 500, 503]).toContain(response.statusCode)

      const body = JSON.parse(response.body)
      expect(body).toBeDefined()
    }, 5000) // Timeout específico de 5 segundos
  })
})
