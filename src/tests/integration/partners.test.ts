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
import { AuthHelper, cleanupTestData } from '../helpers/auth-helper'
import { prisma } from '../setup/test-database'

describe('Partners Routes', () => {
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

  beforeEach(async () => {
    // Limpar dados antes de cada teste
    await cleanupTestData()

    // Recriar usuário autenticado se necessário
    const { tokens } = await AuthHelper.createAuthenticatedUser(server)
    authTokens = tokens
  })

  describe('GET /partners', () => {
    test('should return empty list when no partners exist', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/partners',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)

      expect(body).toHaveProperty('data')
      expect(body.data).toEqual([])
      expect(body).toHaveProperty('pagination')
      expect(body.pagination).toHaveProperty('page', 1)
      expect(body.pagination).toHaveProperty('limit', 10)
      expect(body.pagination).toHaveProperty('total', 0)
      expect(body.pagination).toHaveProperty('pages', 0)
    })

    test('should return partners list when partners exist', async () => {
      // Criar partners de teste
      await prisma.partner.create({
        data: {
          name: 'Partner One',
          num_cpf: '12345678901',
          email: 'partner1@test.com',
          birthday: new Date('1990-01-01'),
          phone_number: '11999999999',
          is_active: true,
        },
      })

      await prisma.partner.create({
        data: {
          name: 'Partner Two',
          num_cpf: '98765432109',
          email: 'partner2@test.com',
          birthday: new Date('1985-05-15'),
          phone_number: '11888888888',
          is_active: true,
        },
      })

      const response = await server.inject({
        method: 'GET',
        url: '/partners',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)

      expect(body).toHaveProperty('data')
      expect(body.data).toHaveLength(2)
      expect(body).toHaveProperty('pagination')
      expect(body.pagination.total).toBe(2)

      // Verificar estrutura dos partners
      expect(body.data[0]).toHaveProperty('id')
      expect(body.data[0]).toHaveProperty('name')
      expect(body.data[0]).toHaveProperty('email')
      expect(body.data[0]).toHaveProperty('phone_number')
      expect(body.data[0]).toHaveProperty('is_active')
      expect(body.data[0]).toHaveProperty('vehicle_count')

      // Não deve expor dados sensíveis
      expect(body.data[0]).not.toHaveProperty('num_cpf')
    })

    test('should support pagination', async () => {
      // Criar 15 partners para testar paginação
      const partners = []
      for (let i = 1; i <= 15; i++) {
        partners.push({
          name: `Partner ${i}`,
          num_cpf: String(i).padStart(11, '0'),
          email: `partner${i}@test.com`,
          birthday: new Date('1990-01-01'),
          phone_number: '11999999999',
          is_active: true,
        })
      }

      await prisma.partner.createMany({ data: partners })

      // Primeira página
      const page1Response = await server.inject({
        method: 'GET',
        url: '/partners?page=1&limit=10',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(page1Response.statusCode).toBe(200)

      const page1Body = JSON.parse(page1Response.body)
      expect(page1Body.data).toHaveLength(10)
      expect(page1Body.pagination.page).toBe(1)
      expect(page1Body.pagination.total).toBe(15)
      expect(page1Body.pagination.pages).toBe(2)

      // Segunda página
      const page2Response = await server.inject({
        method: 'GET',
        url: '/partners?page=2&limit=10',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(page2Response.statusCode).toBe(200)

      const page2Body = JSON.parse(page2Response.body)
      expect(page2Body.data).toHaveLength(5)
      expect(page2Body.pagination.page).toBe(2)
    })

    test('should filter by active status', async () => {
      // Criar partners ativos e inativos
      await prisma.partner.createMany({
        data: [
          {
            name: 'Active Partner',
            num_cpf: '11111111111',
            email: 'active@test.com',
            birthday: new Date('1990-01-01'),
            phone_number: '11999999999',
            is_active: true,
          },
          {
            name: 'Inactive Partner',
            num_cpf: '22222222222',
            email: 'inactive@test.com',
            birthday: new Date('1990-01-01'),
            phone_number: '11888888888',
            is_active: false,
          },
        ],
      })

      // Testar filtro por ativos
      const activeResponse = await server.inject({
        method: 'GET',
        url: '/partners?active=true',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(activeResponse.statusCode).toBe(200)
      const activeBody = JSON.parse(activeResponse.body)
      expect(activeBody.data).toHaveLength(1)
      expect(activeBody.data[0].name).toBe('Active Partner')
      expect(activeBody.data[0].is_active).toBe(true)

      // Testar filtro por inativos
      const inactiveResponse = await server.inject({
        method: 'GET',
        url: '/partners?active=false',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(inactiveResponse.statusCode).toBe(200)
      const inactiveBody = JSON.parse(inactiveResponse.body)
      expect(inactiveBody.data).toHaveLength(1)
      expect(inactiveBody.data[0].name).toBe('Inactive Partner')
      expect(inactiveBody.data[0].is_active).toBe(false)

      // Testar sem filtro (deve retornar ambos)
      const allResponse = await server.inject({
        method: 'GET',
        url: '/partners',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(allResponse.statusCode).toBe(200)
      const allBody = JSON.parse(allResponse.body)
      expect(allBody.data).toHaveLength(2)
    })

    test('should fail without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/partners',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /partners/:id', () => {
    let testPartner: { id: string; name: string; email: string }

    beforeEach(async () => {
      testPartner = await prisma.partner.create({
        data: {
          name: 'Test Partner',
          num_cpf: '12345678901',
          email: 'test@partner.com',
          birthday: new Date('1990-01-01'),
          phone_number: '11999999999',
          is_active: true,
        },
      })
    })

    test('should return partner details when partner exists', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/partners/${testPartner.id}`,
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)

      expect(body).toHaveProperty('data')
      expect(body.data).toHaveProperty('id', testPartner.id)
      expect(body.data).toHaveProperty('name', 'Test Partner')
      expect(body.data).toHaveProperty('email', 'test@partner.com')
      expect(body.data).toHaveProperty('vehicle_ownerships')
      expect(Array.isArray(body.data.vehicle_ownerships)).toBe(true)
    })

    test('should return 404 when partner does not exist', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000'

      const response = await server.inject({
        method: 'GET',
        url: `/partners/${nonExistentId}`,
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(response.statusCode).toBe(404)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error', 'Proprietário não encontrado')
    })

    test('should return 400 with invalid UUID', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/partners/invalid-uuid',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(response.statusCode).toBe(400)
    })

    test('should fail without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/partners/${testPartner.id}`,
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /partners/stats', () => {
    beforeEach(async () => {
      // Criar dados de teste para estatísticas
      const partner1 = await prisma.partner.create({
        data: {
          name: 'Active Partner 1',
          num_cpf: '11111111111',
          email: 'active1@test.com',
          birthday: new Date('1990-01-01'),
          phone_number: '11999999999',
          is_active: true,
        },
      })

      await prisma.partner.create({
        data: {
          name: 'Active Partner 2',
          num_cpf: '22222222222',
          email: 'active2@test.com',
          birthday: new Date('1990-01-01'),
          phone_number: '11888888888',
          is_active: true,
        },
      })

      await prisma.partner.create({
        data: {
          name: 'Inactive Partner',
          num_cpf: '33333333333',
          email: 'inactive@test.com',
          birthday: new Date('1990-01-01'),
          phone_number: '11777777777',
          is_active: false,
        },
      })

      // Criar veículo e ownership para teste
      const vehicle = await prisma.vehicle.create({
        data: {
          license_plate: 'ABC1234',
          renavam: '12345678901',
          fipe_brand_code: 1,
          fipe_model_code: 1,
          year: '2020',
          fuel_type: 'Gasolina',
          vehicle_type: 'cars',
        },
      })

      await prisma.vehicleOwnership.create({
        data: {
          vehicle_id: vehicle.id,
          partner_id: partner1.id,
          ownership_percentage: 100,
        },
      })
    })

    test('should return correct statistics', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/partners/stats',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)

      expect(body).toHaveProperty('data')
      expect(body.data).toHaveProperty('total_partners', 3)
      expect(body.data).toHaveProperty('active_partners', 2)
      expect(body.data).toHaveProperty('inactive_partners', 1)
      expect(body.data).toHaveProperty('partners_with_vehicles', 1)
      expect(body.data).toHaveProperty('partners_without_vehicles', 2)
      expect(body.data).toHaveProperty('average_vehicles_per_partner')
      expect(typeof body.data.average_vehicles_per_partner).toBe('number')
    })

    test('should fail without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/partners/stats',
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
