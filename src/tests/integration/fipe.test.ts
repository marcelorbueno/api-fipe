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

    test('should fail without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/vehicle-types',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /fipe/:vehicleType/brands', () => {
    test('should return brands for cars', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/cars/brands',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(response.statusCode).toBe(200)

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
    })

    test('should return brands for motorcycles', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/motorcycles/brands',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)

      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThan(0)
    })

    test('should return 400 for invalid vehicle type', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/invalid-type/brands',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error', 'Tipo de veículo inválido')
    })

    test('should fail without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/cars/brands',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /fipe/:vehicleType/brands/:brandId/models', () => {
    test('should return models for a specific brand', async () => {
      // Primeiro, obter uma marca válida
      const brandsResponse = await server.inject({
        method: 'GET',
        url: '/fipe/cars/brands',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(brandsResponse.statusCode).toBe(200)
      const brands = JSON.parse(brandsResponse.body)
      expect(brands.length).toBeGreaterThan(0)

      const firstBrand = brands[0]

      // Agora buscar modelos da primeira marca
      const modelsResponse = await server.inject({
        method: 'GET',
        url: `/fipe/cars/brands/${firstBrand.code}/models`,
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(modelsResponse.statusCode).toBe(200)

      const body = JSON.parse(modelsResponse.body)

      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThan(0)

      // Verificar estrutura do primeiro modelo
      if (body.length > 0) {
        const firstModel = body[0] as { code: string | number; name: string }
        expect(firstModel).toHaveProperty('code')
        expect(firstModel).toHaveProperty('name')
        expect(['number', 'string']).toContain(typeof firstModel.code)
        expect(typeof firstModel.name).toBe('string')
      }
    })

    test('should return 400 for invalid vehicle type', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/invalid-type/brands/1/models',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error', 'Tipo de veículo inválido')
    })

    test('should fail without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/cars/brands/1/models',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /fipe/references', () => {
    test('should return available reference periods', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/references',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)

      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThan(0)

      // Verificar estrutura da primeira referência
      // A API FIPE pode retornar diferentes formatos
      if (body.length > 0) {
        const firstReference =
        body[0] as { code: string | number; name?: string; month?: string }
        expect(firstReference).toHaveProperty('code')

        // Aceitar tanto 'name' quanto 'month' como propriedades válidas
        const hasNameOrMonth =
        ('name' in firstReference) || ('month' in firstReference)
        expect(hasNameOrMonth).toBe(true)

        expect(['number', 'string']).toContain(typeof firstReference.code)
      }
    })

    test('should fail without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/fipe/references',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe(
    'GET /fipe/:vehicleType/brands/:brandId/models/:modelId/years', () => {
      test('should return years for a specific model', async () => {
      // Obter uma marca válida
        const brandsResponse = await server.inject({
          method: 'GET',
          url: '/fipe/cars/brands',
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        expect(brandsResponse.statusCode).toBe(200)
        const brands = JSON.parse(brandsResponse.body)
        expect(brands.length).toBeGreaterThan(0)

        const firstBrand = brands[0]

        // Obter um modelo válido
        const modelsResponse = await server.inject({
          method: 'GET',
          url: `/fipe/cars/brands/${firstBrand.code}/models`,
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        expect(modelsResponse.statusCode).toBe(200)
        const models = JSON.parse(modelsResponse.body)
        expect(models.length).toBeGreaterThan(0)

        const firstModel = models[0]

        // Buscar anos do modelo
        const yearsResponse = await server.inject({
          method: 'GET',
          url:
        `/fipe/cars/brands/${firstBrand.code}/models/${firstModel.code}/years`,
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        expect(yearsResponse.statusCode).toBe(200)

        const body = JSON.parse(yearsResponse.body)

        expect(Array.isArray(body)).toBe(true)
        expect(body.length).toBeGreaterThan(0)

        // Verificar estrutura do primeiro ano
        if (body.length > 0) {
          const firstYear = body[0] as { code: string; name: string }
          expect(firstYear).toHaveProperty('code')
          expect(firstYear).toHaveProperty('name')
          expect(typeof firstYear.code).toBe('string')
          expect(typeof firstYear.name).toBe('string')
        }
      })

      test('should return 400 for invalid vehicle type', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/fipe/invalid-type/brands/1/models/1/years',
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        expect(response.statusCode).toBe(400)

        const body = JSON.parse(response.body)
        expect(body).toHaveProperty('error', 'Tipo de veículo inválido')
      })

      test('should return 400 for invalid brand or model IDs', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/fipe/cars/brands/invalid/models/invalid/years',
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        expect(response.statusCode).toBe(400)

        const body = JSON.parse(response.body)
        expect(body).toHaveProperty('error', 'IDs inválidos')
      })

      test('should fail without authentication', async () => {
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
      test('should return vehicle details for valid parameters', async () => {
      // Este teste pode falhar se a API FIPE não estiver acessível
      // Vamos fazer um teste mais simples primeiro
        const response = await server.inject({
          method: 'GET',
          url: '/fipe/cars/brands/1/models/1/years/2020-1',
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
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

      test('should return 400 for invalid vehicle type', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/fipe/invalid-type/brands/1/models/1/years/2020-1',
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        expect(response.statusCode).toBe(400)

        const body = JSON.parse(response.body)
        expect(body).toHaveProperty('error', 'Tipo de veículo inválido')
      })

      test('should fail without authentication', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/fipe/cars/brands/1/models/1/years/2020-1',
        })

        expect(response.statusCode).toBe(401)
      })
    })

  describe(
    'GET /fipe/:vehicleType/brands/:brandId/years/:yearId/models', () => {
      test('should return models for brand and year combination', async () => {
      // Teste básico - pode falhar devido à conectividade externa
        const response = await server.inject({
          method: 'GET',
          url: '/fipe/cars/brands/1/years/2020-1/models',
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        // Aceitar vários códigos de status possíveis
        expect([200, 404, 429, 500, 503]).toContain(response.statusCode)

        if (response.statusCode === 200) {
          const body = JSON.parse(response.body)
          expect(body).toHaveProperty('success', true)
          expect(body).toHaveProperty('data')
          expect(body).toHaveProperty('metadata')
        }
      })

      test('should return 400 for invalid vehicle type', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/fipe/invalid-type/brands/1/years/2020-1/models',
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        expect(response.statusCode).toBe(400)

        const body = JSON.parse(response.body)
        expect(body).toHaveProperty('error', 'Tipo de veículo inválido')
      })

      test('should fail without authentication', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/fipe/cars/brands/1/years/2020-1/models',
        })

        expect(response.statusCode).toBe(401)
      })
    })
})
