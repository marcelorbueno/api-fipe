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
import { AuthHelper } from '../helpers/auth-helper'
import { prisma } from '@/lib/prisma'

describe('FIPE Routes', () => {
  let server: FastifyInstance
  let authTokens: { accessToken: string; refreshToken: string }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-super-secure'
    server = await createTestServer()
  })

  beforeEach(async () => {
    // Limpar dados antes de cada teste
    await prisma.refreshToken.deleteMany()
    await prisma.user.deleteMany()

    // Criar usuário autenticado para os testes
    const { tokens } = await AuthHelper.createAuthenticatedUser(server)
    authTokens = tokens
  })

  afterAll(async () => {
    await closeTestServer(server)
  })

  describe('GET /fipe/vehicle-types', () => {
    test('should return available vehicle types', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/vehicle-types',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
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
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /fipe/:vehicleType/brands', () => {
    test('should return brands for cars when API is available', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/cars/brands',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body)
        expect(Array.isArray(body)).toBe(true)

        if (body.length > 0) {
          expect(body[0]).toHaveProperty('code')
          expect(body[0]).toHaveProperty('name')
        }
      } else {
        // Se a API externa falhou, apenas verificar que não é erro de
        // autenticação
        expect(response.statusCode).not.toBe(401)
        expect(response.statusCode).not.toBe(403)
      }
    })

    test('should fail with invalid vehicle type', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/invalid/brands',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error')
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
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        if (response.statusCode === 200) {
          const body = JSON.parse(response.body)
          expect(Array.isArray(body)).toBe(true)

          if (body.length > 0) {
            expect(body[0]).toHaveProperty('code')
            expect(body[0]).toHaveProperty('name')
          }
        } else {
        // Se falhou, verificar que não é erro de validação local
          expect(response.statusCode).not.toBe(401)
          expect(response.statusCode).not.toBe(403)
        }
      })

    test('should fail with invalid brand ID', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/cars/brands/invalid/models',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('GET /fipe/:vehicleType/brands/:brandId/models/:modelId/years',
    () => {
      test('should return years for valid model when API is available',
        async () => {
          const response = await server.inject({
            method: 'GET',
            url: '/fipe/cars/brands/21/models/7541/years', // Fiat MOBI
            headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
          })

          if (response.statusCode === 200) {
            const body = JSON.parse(response.body)
            expect(Array.isArray(body)).toBe(true)

            if (body.length > 0) {
              expect(body[0]).toHaveProperty('code')
              expect(body[0]).toHaveProperty('name')
            }
          } else {
            expect(response.statusCode).not.toBe(401)
            expect(response.statusCode).not.toBe(403)
          }
        })
    })

  describe(
    'GET /fipe/:vehicleType/brands/:brandId/models/:modelId/years/:yearId',
    () => {
      test('should return vehicle details when API is available', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/fipe/cars/brands/21/models/7541/years/2017-5',
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        if (response.statusCode === 200) {
          const body = JSON.parse(response.body)

          // Verificar se tem wrapper "data" ou propriedades diretas
          const data = body.data || body

          expect(data).toHaveProperty('brand')
          expect(data).toHaveProperty('model')
          expect(data).toHaveProperty('modelYear')
          expect(data).toHaveProperty('fuel')
          expect(data).toHaveProperty('fuelAcronym')
          expect(data).toHaveProperty('price')
          expect(data).toHaveProperty('codeFipe')
          expect(data).toHaveProperty('referenceMonth')
          expect(data).toHaveProperty('vehicleType')

          // Verificar tipos básicos
          expect(typeof data.brand).toBe('string')
          expect(typeof data.model).toBe('string')
          expect(typeof data.price).toBe('string')
        } else {
        // Se API externa falhou, apenas verificar que não é erro local
          expect(response.statusCode).not.toBe(401)
          expect(response.statusCode).not.toBe(403)
        }
      })

      test('should fail with invalid parameters', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/fipe/cars/brands/invalid/models/invalid/years/invalid',
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        // Aceitar tanto 400 (validação local) quanto 500 (erro da API externa)
        expect([400, 500]).toContain(response.statusCode)
      })
    })

  describe('GET /fipe/references', () => {
    test('should return reference months when API is available', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/references',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body)
        expect(Array.isArray(body)).toBe(true)

        if (body.length > 0) {
          expect(body[0]).toHaveProperty('code')
          expect(body[0]).toHaveProperty('month')
        }
      } else {
        expect(response.statusCode).not.toBe(401)
        expect(response.statusCode).not.toBe(403)
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
    })

    test('should handle invalid endpoints', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/nonexistent',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(response.statusCode).toBe(404)
    })
  })

  // Testes específicos para casos de API externa indisponível
  describe('External API Resilience', () => {
    test('should gracefully handle FIPE API timeout', async () => {
      // Este teste pode ocasionalmente falhar se a API FIPE estiver lenta
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/cars/brands',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      // Se timeout, deve retornar erro apropriado
      if (response.statusCode === 408) {
        const body = JSON.parse(response.body)
        expect(body).toHaveProperty('error')
        expect(body.error).toMatch(/timeout|tempo/i)
      }
    })

    test('should handle FIPE API unavailability', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/cars/brands',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      // Se API externa está down, deve retornar erro apropriado
      if (response.statusCode === 500) {
        const body = JSON.parse(response.body)
        expect(body).toHaveProperty('error')
      }
    })
  })
})
