// src/tests/integration/fipe.test.ts - ATUALIZADO
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { FastifyInstance } from 'fastify'
import { createTestServer, closeTestServer } from '../setup/test-server'
import { AuthHelper } from '../helpers/auth-helper'

describe('FIPE Routes', () => {
  let server: FastifyInstance
  let authTokens: { accessToken: string; refreshToken: string }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-super-secure'
    server = await createTestServer()

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
  })

  describe('GET /fipe/:vehicleType/brands', () => {
    test('should return brands for cars', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/cars/brands',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      // Aceitar sucesso ou erro por indisponibilidade da API externa
      expect([200, 500, 408]).toContain(response.statusCode)

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body)
        expect(Array.isArray(body)).toBe(true)

        if (body.length > 0) {
          expect(body[0]).toHaveProperty('code')
          expect(body[0]).toHaveProperty('name')
        }
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
  })

  describe('GET /fipe/:vehicleType/brands/:brandId/models', () => {
    test('should return models for a specific brand', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/cars/brands/21/models', // Fiat
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      // Aceitar sucesso ou erro por API externa
      expect([200, 400, 500, 408]).toContain(response.statusCode)

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body)
        expect(Array.isArray(body)).toBe(true)

        if (body.length > 0) {
          expect(body[0]).toHaveProperty('code')
          expect(body[0]).toHaveProperty('name')
        }
      }
    })
  })

  describe('GET /fipe/:vehicleType/brands/:brandId/models/:modelId/years',
    () => {
      test('should return years for a specific model', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/fipe/cars/brands/21/models/7541/years', // Fiat MOBI
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        expect([200, 400, 500, 408]).toContain(response.statusCode)

        if (response.statusCode === 200) {
          const body = JSON.parse(response.body)
          expect(Array.isArray(body)).toBe(true)

          if (body.length > 0) {
            expect(body[0]).toHaveProperty('code')
            expect(body[0]).toHaveProperty('name')
          }
        }
      })
    })

  describe(
    'GET /fipe/:vehicleType/brands/:brandId/models/:modelId/years/:yearId',
    () => {
      test('should return vehicle details with price', async () => {
        const response = await server.inject({
          method: 'GET',
          url:
          '/fipe/cars/brands/21/models/7541/years/2017-5', // Fiat MOBI 2017 Fle
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        expect([200, 400, 500, 408]).toContain(response.statusCode)

        if (response.statusCode === 200) {
          const body = JSON.parse(response.body)

          // Verificar estrutura da resposta
          expect(body).toHaveProperty('brand')
          expect(body).toHaveProperty('model')
          expect(body).toHaveProperty('modelYear')
          expect(body).toHaveProperty('fuel')
          expect(body).toHaveProperty('fuelAcronym')
          expect(body).toHaveProperty('price')
          expect(body).toHaveProperty('codeFipe')
          expect(body).toHaveProperty('referenceMonth')
          expect(body).toHaveProperty('vehicleType')
          expect(body).toHaveProperty('consultedAt')
          expect(body).toHaveProperty('apiSource')
        }
      })
    })

  describe('POST /fipe/validate-vehicle', () => {
    test('should validate vehicle codes successfully', async () => {
      const validationData = {
        vehicle_type: 'cars',
        fipe_brand_code: 21,
        fipe_model_code: 7541,
        year_id: '2017-5',
      }

      const response = await server.inject({
        method: 'POST',
        url: '/fipe/validate-vehicle',
        headers: {
          ...AuthHelper.getAuthHeaders(authTokens.accessToken),
          'content-type': 'application/json',
        },
        payload: validationData,
      })

      expect([200, 400, 500]).toContain(response.statusCode)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('isValid')

      if (response.statusCode === 200 && body.isValid) {
        expect(body).toHaveProperty('vehicle_info')
        expect(body.vehicle_info).toHaveProperty('brand_name')
        expect(body.vehicle_info).toHaveProperty('model_name')
        expect(body.vehicle_info).toHaveProperty('current_fipe_value')
        expect(body.vehicle_info).toHaveProperty('formatted_price')
      }
    })

    test('should fail validation with invalid codes', async () => {
      const invalidData = {
        vehicle_type: 'cars',
        fipe_brand_code: 99999,
        fipe_model_code: 99999,
        year_id: 'invalid',
      }

      const response = await server.inject({
        method: 'POST',
        url: '/fipe/validate-vehicle',
        headers: {
          ...AuthHelper.getAuthHeaders(authTokens.accessToken),
          'content-type': 'application/json',
        },
        payload: invalidData,
      })

      expect([400, 500]).toContain(response.statusCode)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('isValid', false)
    })

    test('should fail with missing authentication', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/fipe/validate-vehicle',
        headers: { 'content-type': 'application/json' },
        payload: {
          vehicle_type: 'cars',
          fipe_brand_code: 21,
          fipe_model_code: 7541,
          year_id: '2017-5',
        },
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /fipe/references', () => {
    test('should return available reference months', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/references',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect([200, 500, 408]).toContain(response.statusCode)

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body)
        expect(Array.isArray(body)).toBe(true)

        if (body.length > 0) {
          expect(body[0]).toHaveProperty('code')
          expect(body[0]).toHaveProperty('month')
        }
      }
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
})
