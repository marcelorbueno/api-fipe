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
import { patrimonyService } from '../../services/patrimony-service'
import { UserProfile, VehicleType } from '@prisma/client'
import { prisma } from '../setup/test-database'

describe('Patrimony Service & Routes', () => {
  let server: FastifyInstance
  let authTokens: { accessToken: string; refreshToken: string }
  let testPartner: { id: string; name: string; email: string }
  let testInvestor: { id: string; name: string; email: string }
  let testVehicle: { id: string; license_plate: string }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-super-secure'
    server = await createTestServer()
  })

  afterAll(async () => {
    await closeTestServer(server)
  })

  beforeEach(async () => {
    await cleanupTestData()

    // Criar usuário admin autenticado
    const { tokens } = await AuthHelper.createAuthenticatedUser(server, {
      profile: UserProfile.ADMINISTRATOR,
    })
    authTokens = tokens

    // Criar usuários de teste
    const { user: partner } = await AuthHelper.createTestUser(server, {
      name: 'João Silva',
      email: 'joao@test.com',
      profile: UserProfile.PARTNER,
    })
    testPartner = partner

    const { user: investor } = await AuthHelper.createTestUser(server, {
      name: 'Maria Investidora',
      email: 'maria@investor.com',
      profile: UserProfile.INVESTOR,
    })
    testInvestor = investor

    // Criar veículo de teste com dados mock
    const vehicle = await AuthHelper.createTestVehicle(
      server, authTokens.accessToken, {
        license_plate: 'PATRI123',
        renavam: '12345678901',
        fipe_brand_code: 21,
        fipe_model_code: 7541,
        year_id: '2017-5',
        vehicle_type: VehicleType.cars,
        is_company_vehicle: false,
      })
    testVehicle = vehicle
  })

  describe('User Patrimony Calculation', () => {
    test('should calculate patrimony for user with one vehicle', async () => {
      // Criar ownership de 100%
      await prisma.vehicleOwnership.create({
        data: {
          vehicle_id: testVehicle.id,
          user_id: testPartner.id,
          ownership_percentage: 100,
        },
      })

      // Criar cache FIPE para teste
      await prisma.fipeCache.create({
        data: {
          brand_code: 21,
          model_code: 7541,
          year_id: '2017-5',
          fuel_acronym: 'F',
          vehicle_type: VehicleType.cars,
          fipe_value: 50000,
          reference_month: 'agosto de 2025',
        },
      })

      const result =
        await patrimonyService.calculateUserPatrimony(testPartner.id)

      expect(result).toHaveProperty('user_id', testPartner.id)
      expect(result).toHaveProperty('user_name', 'João Silva')
      expect(result).toHaveProperty('user_profile', UserProfile.PARTNER)
      expect(result).toHaveProperty('total_patrimony', 50000)
      expect(result).toHaveProperty('vehicles')
      expect(result.vehicles).toHaveLength(1)

      const vehicle = result.vehicles[0]
      expect(vehicle).toHaveProperty('vehicle_id', testVehicle.id)
      expect(vehicle).toHaveProperty('license_plate', 'PATRI123')
      expect(vehicle).toHaveProperty('ownership_percentage', 100)
      expect(vehicle).toHaveProperty('fipe_value', 50000)
      expect(vehicle).toHaveProperty('user_value', 50000)
    })

    test('should calculate patrimony for user with partial ownership',
      async () => {
        await prisma.vehicleOwnership.create({
          data: {
            vehicle_id: testVehicle.id,
            user_id: testPartner.id,
            ownership_percentage: 60,
          },
        })

        await prisma.fipeCache.create({
          data: {
            brand_code: 21,
            model_code: 7541,
            year_id: '2017-5',
            fuel_acronym: 'F',
            vehicle_type: VehicleType.cars,
            fipe_value: 80000,
            reference_month: 'agosto de 2025',
          },
        })

        const result =
          await patrimonyService.calculateUserPatrimony(testPartner.id)

        expect(result.total_patrimony).toBe(48000) // 60% de 80.000
        expect(result.vehicles[0].ownership_percentage).toBe(60)
        expect(result.vehicles[0].fipe_value).toBe(80000)
        expect(result.vehicles[0].user_value).toBe(48000)
      })

    test('should return zero patrimony for user without vehicles', async () => {
      const result =
        await patrimonyService.calculateUserPatrimony(testPartner.id)

      expect(result).toHaveProperty('user_id', testPartner.id)
      expect(result).toHaveProperty('user_name', 'João Silva')
      expect(result).toHaveProperty('total_patrimony', 0)
      expect(result.vehicles).toHaveLength(0)
    })

    test('should throw error for non-existent user', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000'

      await expect(
        patrimonyService.calculateUserPatrimony(nonExistentId),
      ).rejects.toThrow('User not found')
    })
  })

  describe('Company Patrimony', () => {
    test('should calculate company patrimony with partner participation',
      async () => {
      // Criar veículo da empresa
        const companyVehicle = await AuthHelper.createTestVehicle(
          server, authTokens.accessToken, {
            license_plate: 'COMPANY1',
            is_company_vehicle: true,
          })

        // Adicionar participação dos sócios
        await prisma.vehicleOwnership.createMany({
          data: [
            {
              vehicle_id: companyVehicle.id,
              user_id: testPartner.id,
              ownership_percentage: 70,
            },
          ],
        })

        // Mock cache FIPE
        await prisma.fipeCache.create({
          data: {
            brand_code: 21,
            model_code: 7541,
            year_id: '2017-5',
            fuel_acronym: 'F',
            vehicle_type: VehicleType.cars,
            fipe_value: 100000,
            reference_month: 'agosto de 2025',
          },
        })

        const result = await patrimonyService.calculateCompanyPatrimony()

        expect(result).toHaveProperty('total_company_patrimony', 100000)
        expect(result).toHaveProperty('vehicles_count', 1)
        expect(result).toHaveProperty('partners')
        expect(result.partners).toHaveLength(1)
        expect(result.partners[0]).toHaveProperty('user_name', 'João Silva')
        expect(result.partners[0]).toHaveProperty('patrimony_value', 70000)
        expect(result.partners[0]).toHaveProperty(
          'participation_percentage', 70)
      })
  })

  describe('Patrimony Routes', () => {
    beforeEach(async () => {
      // Preparar dados para testes de rotas
      await prisma.vehicleOwnership.create({
        data: {
          vehicle_id: testVehicle.id,
          user_id: testPartner.id,
          ownership_percentage: 100,
        },
      })

      await prisma.fipeCache.create({
        data: {
          brand_code: 21,
          model_code: 7541,
          year_id: '2017-5',
          fuel_acronym: 'F',
          vehicle_type: VehicleType.cars,
          fipe_value: 45000,
          reference_month: 'agosto de 2025',
        },
      })
    })

    test('GET /patrimony/user/:userId should return user patrimony',
      async () => {
        const response = await server.inject({
          method: 'GET',
          url: `/patrimony/user/${testPartner.id}`,
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)

        expect(body).toHaveProperty('data')
        expect(body.data).toHaveProperty('user_id', testPartner.id)
        expect(body.data).toHaveProperty('total_patrimony', 45000)
        expect(body.data.vehicles).toHaveLength(1)
      })

    test('GET /patrimony/partners should return all partners patrimony',
      async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/patrimony/partners',
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)

        expect(body).toHaveProperty('data')
        expect(Array.isArray(body.data)).toBe(true)
        expect(body).toHaveProperty('summary')
        expect(body.summary).toHaveProperty('total_partners')
        expect(body.summary).toHaveProperty('total_patrimony')
        expect(body.summary).toHaveProperty('average_patrimony')
      })

    test('GET /patrimony/investors should return all investors patrimony',
      async () => {
      // Adicionar veículo para investidor
        const investorVehicle = await AuthHelper.createTestVehicle(
          server, authTokens.accessToken, {
            license_plate: 'INV001',
          })

        await prisma.vehicleOwnership.create({
          data: {
            vehicle_id: investorVehicle.id,
            user_id: testInvestor.id,
            ownership_percentage: 100,
          },
        })

        await prisma.fipeCache.create({
          data: {
            brand_code: 21,
            model_code: 7541,
            year_id: '2017-5',
            fuel_acronym: 'F',
            vehicle_type: VehicleType.cars,
            fipe_value: 60000,
            reference_month: 'agosto de 2025',
          },
        })

        const response = await server.inject({
          method: 'GET',
          url: '/patrimony/investors',
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)

        expect(body).toHaveProperty('data')
        expect(Array.isArray(body.data)).toBe(true)
        expect(body).toHaveProperty('summary')
        expect(body.summary).toHaveProperty('total_investors')
        expect(body.summary).toHaveProperty('total_patrimony')
      })

    test('GET /patrimony/report should return complete patrimony report',
      async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/patrimony/report',
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)

        expect(body).toHaveProperty('data')
        expect(body.data).toHaveProperty('company')
        expect(body.data).toHaveProperty('partners')
        expect(body.data).toHaveProperty('investors')
        expect(body.data).toHaveProperty('summary')
        expect(body.data.summary).toHaveProperty('total_patrimony')
        expect(body.data.summary).toHaveProperty('total_vehicles')
      })

    test('GET /patrimony/stats should return patrimony statistics',
      async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/patrimony/stats',
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)

        expect(body).toHaveProperty('data')
        expect(body.data).toHaveProperty('total_patrimony')
        expect(body.data).toHaveProperty('total_vehicles')
        expect(body.data).toHaveProperty('company')
        expect(body.data).toHaveProperty('partners')
        expect(body.data).toHaveProperty('investors')
        expect(body.data).toHaveProperty('top_partners')
        expect(body.data).toHaveProperty('top_investors')
      })

    test('POST /patrimony/refresh-cache should refresh FIPE cache',
      async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/patrimony/refresh-cache',
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        // Aceitar 200 (sucesso) ou erro por indisponibilidade da API FIPE
        expect([200, 500]).toContain(response.statusCode)

        const body = JSON.parse(response.body)
        if (response.statusCode === 200) {
          expect(body).toHaveProperty('data')
          expect(body.data).toHaveProperty('updated')
          expect(body.data).toHaveProperty('errors')
          expect(body.data).toHaveProperty('total')
        }
      })
  })

  describe('Multiple Vehicles and Shared Ownership', () => {
    test(
      'should calculate patrimony with multiple vehicles and shared ownership',
      async () => {
      // Criar segundo veículo
        const secondVehicle = await AuthHelper.createTestVehicle(
          server, authTokens.accessToken, {
            license_plate: 'MULTI001',
          })

        // Criar participações
        await prisma.vehicleOwnership.createMany({
          data: [
            {
              vehicle_id: testVehicle.id,
              user_id: testPartner.id,
              ownership_percentage: 100,
            },
            {
              vehicle_id: secondVehicle.id,
              user_id: testPartner.id,
              ownership_percentage: 50,
            },
            {
              vehicle_id: secondVehicle.id,
              user_id: testInvestor.id,
              ownership_percentage: 50,
            },
          ],
        })

        // Criar caches FIPE
        await prisma.fipeCache.createMany({
          data: [
            {
              brand_code: 21,
              model_code: 7541,
              year_id: '2017-5',
              fuel_acronym: 'F',
              vehicle_type: VehicleType.cars,
              fipe_value: 40000,
              reference_month: 'agosto de 2025',
            },
            {
              brand_code: 22,
              model_code: 8000,
              year_id: '2020-1',
              fuel_acronym: 'G',
              vehicle_type: VehicleType.cars,
              fipe_value: 80000,
              reference_month: 'agosto de 2025',
            },
          ],
        })

        // Teste para sócio
        const partnerResult =
        await patrimonyService.calculateUserPatrimony(testPartner.id)
        expect(partnerResult.total_patrimony)
          .toBe(80000) // 40.000 + (50% de 80.000)
        expect(partnerResult.vehicles).toHaveLength(2)

        // Teste para investidor
        const investorResult =
        await patrimonyService.calculateUserPatrimony(testInvestor.id)
        expect(investorResult.total_patrimony).toBe(40000) // 50% de 80.000
        expect(investorResult.vehicles).toHaveLength(1)
      })
  })
})
