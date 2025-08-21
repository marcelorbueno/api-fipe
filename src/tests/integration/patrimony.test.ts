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
import { prisma } from '@/lib/prisma'
import { PatrimonyService } from '../../services/patrimony-service'
import { VehicleType } from '@prisma/client'

describe('Patrimony Service & Routes', () => {
  let server: FastifyInstance
  let patrimonyService: PatrimonyService
  let authTokens: { accessToken: string; refreshToken: string }

  // Função helper para criar cache FIPE único
  async function createUniqueFipeCache(data: {
    brand_code: number
    model_code: number
    year_id: string
    fuel_acronym: string
    vehicle_type: VehicleType // Use the proper enum type
    fipe_value: number
    reference_month: string
  }) {
    // Verificar se já existe antes de criar
    const existing = await prisma.fipeCache.findUnique({
      where: {
        brand_code_model_code_year_id_fuel_acronym_vehicle_type: {
          brand_code: data.brand_code,
          model_code: data.model_code,
          year_id: data.year_id,
          fuel_acronym: data.fuel_acronym,
          vehicle_type: data.vehicle_type,
        },
      },
    })

    if (existing) {
      // Atualizar se já existe
      return prisma.fipeCache.update({
        where: {
          brand_code_model_code_year_id_fuel_acronym_vehicle_type: {
            brand_code: data.brand_code,
            model_code: data.model_code,
            year_id: data.year_id,
            fuel_acronym: data.fuel_acronym,
            vehicle_type: data.vehicle_type,
          },
        },
        data: {
          fipe_value: data.fipe_value,
          reference_month: data.reference_month,
          updated_at: new Date(),
        },
      })
    }

    // Criar novo se não existe
    return prisma.fipeCache.create({
      data: {
        ...data,
        brand_name: 'Fiat',
        model_name: 'Uno Mille 1.0',
        model_year: 2020,
        fuel_name: 'Gasolina',
        code_fipe: '001004-1',
        vehicle_type: data.vehicle_type,
      },
    })
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-super-secure'
    server = await createTestServer()
    patrimonyService = new PatrimonyService()
  })

  afterAll(async () => {
    await closeTestServer(server)
  })

  beforeEach(async () => {
    // Limpeza completa antes de cada teste
    await cleanupTestData()

    // Recriar usuário autenticado
    const { tokens } = await AuthHelper.createAuthenticatedUser(server)
    authTokens = tokens
  })

  describe('User Patrimony Calculation', () => {
    test('should calculate patrimony for user with one vehicle', async () => {
      // Criar usuário de teste
      const testUser = await prisma.user.create({
        data: {
          name: 'João Silva',
          num_cpf: '12345678901',
          email: 'joao@test.com',
          password: 'hashedpassword',
          birthday: new Date('1990-01-01'),
          phone_number: '11999999999',
          profile: 'PARTNER',
          is_active: true,
        },
      })

      // Criar veículo de teste
      const testVehicle = await AuthHelper.createTestVehicle(
        server, authTokens.accessToken, {
          fipe_brand_code: 21,
          fipe_model_code: 7541,
          year_id: '2020-1',
          fuel_acronym: 'G',
          vehicle_type: 'cars',
        })

      // Criar ownership
      await prisma.vehicleOwnership.create({
        data: {
          vehicle_id: testVehicle.id,
          user_id: testUser.id,
          ownership_percentage: 100,
        },
      })

      // Criar cache FIPE com valor conhecido
      await createUniqueFipeCache({
        brand_code: 21,
        model_code: 7541,
        year_id: '2020-1',
        fuel_acronym: 'G',
        vehicle_type: VehicleType.cars, // Use enum value
        fipe_value: 50000,
        reference_month: 'agosto/2025',
      })

      // Testar o cálculo
      const result = await patrimonyService.calculateUserPatrimony(testUser.id)

      expect(result).toHaveProperty('user_name', 'João Silva')
      expect(result).toHaveProperty('user_profile', 'PARTNER')
      expect(result).toHaveProperty('total_patrimony', 50000)
      expect(result).toHaveProperty('vehicles')
      expect(result.vehicles).toHaveLength(1)
    })

    test('should calculate patrimony for user with partial ownership',
      async () => {
      // Criar usuário de teste
        const testUser = await prisma.user.create({
          data: {
            name: 'Maria Santos',
            num_cpf: '98765432109',
            email: 'maria@test.com',
            password: 'hashedpassword',
            birthday: new Date('1990-01-01'),
            phone_number: '11999999999',
            profile: 'PARTNER',
            is_active: true,
          },
        })

        // Criar veículo de teste
        const testVehicle =
      await AuthHelper.createTestVehicle(server, authTokens.accessToken, {
        fipe_brand_code: 21,
        fipe_model_code: 7541,
        year_id: '2020-1',
        fuel_acronym: 'G',
        vehicle_type: 'cars',
      })

        // Criar ownership com 60%
        await prisma.vehicleOwnership.create({
          data: {
            vehicle_id: testVehicle.id,
            user_id: testUser.id,
            ownership_percentage: 60,
          },
        })

        // Criar cache FIPE
        await createUniqueFipeCache({
          brand_code: 21,
          model_code: 7541,
          year_id: '2020-1',
          fuel_acronym: 'G',
          vehicle_type: VehicleType.cars, // Use enum value
          fipe_value: 80000,
          reference_month: 'agosto/2025',
        })

        // Testar
        const result =
          await patrimonyService.calculateUserPatrimony(testUser.id)

        expect(result.total_patrimony).toBe(48000) // 60% de 80.000
        expect(result.vehicles[0].ownership_percentage).toBe(60)
        expect(result.vehicles[0].fipe_value).toBe(80000)
        expect(result.vehicles[0].user_value).toBe(48000)
      })

    test('should return zero patrimony for user without vehicles', async () => {
      // Criar usuário sem veículos
      const testUser = await prisma.user.create({
        data: {
          name: 'Carlos Costa',
          num_cpf: '45678912345',
          email: 'carlos@test.com',
          password: 'hashedpassword',
          birthday: new Date('1990-01-01'),
          phone_number: '11999999999',
          profile: 'INVESTOR',
          is_active: true,
        },
      })

      const result = await patrimonyService.calculateUserPatrimony(testUser.id)

      expect(result).toHaveProperty('user_id', testUser.id)
      expect(result).toHaveProperty('user_name', 'Carlos Costa')
      expect(result).toHaveProperty('total_patrimony', 0)
      expect(result).toHaveProperty('vehicles')
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
      // Criar 2 sócios
        const partner1 = await prisma.user.create({
          data: {
            name: 'Sócio 1',
            num_cpf: '11111111111',
            email: 'socio1@test.com',
            password: 'hashedpassword',
            birthday: new Date('1990-01-01'),
            phone_number: '11999999999',
            profile: 'PARTNER',
            is_active: true,
          },
        })

        const partner2 = await prisma.user.create({
          data: {
            name: 'Sócio 2',
            num_cpf: '22222222222',
            email: 'socio2@test.com',
            password: 'hashedpassword',
            birthday: new Date('1990-01-01'),
            phone_number: '11888888888',
            profile: 'PARTNER',
            is_active: true,
          },
        })

        // Criar veículo da empresa
        const companyVehicle =
      await AuthHelper.createTestVehicle(server, authTokens.accessToken, {
        fipe_brand_code: 21,
        fipe_model_code: 7541,
        year_id: '2020-1',
        fuel_acronym: 'G',
        vehicle_type: 'cars',
        is_company_vehicle: true,
      })

        // Criar participações (50% cada)
        await prisma.vehicleOwnership.createMany({
          data: [
            {
              vehicle_id: companyVehicle.id,
              user_id: partner1.id,
              ownership_percentage: 50,
            },
            {
              vehicle_id: companyVehicle.id,
              user_id: partner2.id,
              ownership_percentage: 50,
            },
          ],
        })

        // Criar cache FIPE
        await createUniqueFipeCache({
          brand_code: 21,
          model_code: 7541,
          year_id: '2020-1',
          fuel_acronym: 'G',
          vehicle_type: VehicleType.cars, // Use enum value
          fipe_value: 100000,
          reference_month: 'agosto/2025',
        })

        // Testar
        const result = await patrimonyService.calculateCompanyPatrimony()

        expect(result).toHaveProperty('total_company_patrimony', 100000)
        expect(result).toHaveProperty('vehicles_count', 1)
        expect(result).toHaveProperty('partners')
        expect(result.partners).toHaveLength(2)
      })
  })

  describe('Patrimony Routes', () => {
    test('GET /patrimony/user/:userId should return user patrimony',
      async () => {
      // Criar usuário de teste
        const testUser = await prisma.user.create({
          data: {
            name: 'Ana Costa',
            num_cpf: '78912345678',
            email: 'ana@test.com',
            password: 'hashedpassword',
            birthday: new Date('1990-01-01'),
            phone_number: '11999999999',
            profile: 'PARTNER',
            is_active: true,
          },
        })

        // Criar veículo e ownership
        const testVehicle =
      await AuthHelper.createTestVehicle(server, authTokens.accessToken, {
        fipe_brand_code: 21,
        fipe_model_code: 7541,
        year_id: '2020-1',
        fuel_acronym: 'G',
        vehicle_type: 'cars',
      })

        await prisma.vehicleOwnership.create({
          data: {
            vehicle_id: testVehicle.id,
            user_id: testUser.id,
            ownership_percentage: 100,
          },
        })

        // Criar cache FIPE
        await createUniqueFipeCache({
          brand_code: 21,
          model_code: 7541,
          year_id: '2020-1',
          fuel_acronym: 'G',
          vehicle_type: VehicleType.cars, // Use enum value
          fipe_value: 45000,
          reference_month: 'agosto/2025',
        })

        const response = await server.inject({
          method: 'GET',
          url: `/patrimony/user/${testUser.id}`,
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body).toHaveProperty('data')
        expect(body.data).toHaveProperty('user_id', testUser.id)
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
      })

    test('GET /patrimony/investors should return all investors patrimony',
      async () => {
      // Criar investidor de teste
        const investor = await prisma.user.create({
          data: {
            name: 'Roberto Silva',
            num_cpf: '33333333333',
            email: 'roberto@test.com',
            password: 'hashedpassword',
            birthday: new Date('1990-01-01'),
            phone_number: '11999999999',
            profile: 'INVESTOR',
            is_active: true,
          },
        })

        // Criar veículo e ownership
        const testVehicle =
      await AuthHelper.createTestVehicle(server, authTokens.accessToken, {
        fipe_brand_code: 21,
        fipe_model_code: 7541,
        year_id: '2020-1',
        fuel_acronym: 'G',
        vehicle_type: 'cars',
      })

        await prisma.vehicleOwnership.create({
          data: {
            vehicle_id: testVehicle.id,
            user_id: investor.id,
            ownership_percentage: 100,
          },
        })

        // Criar cache FIPE
        await createUniqueFipeCache({
          brand_code: 21,
          model_code: 7541,
          year_id: '2020-1',
          fuel_acronym: 'G',
          vehicle_type: VehicleType.cars, // Use enum value
          fipe_value: 60000,
          reference_month: 'agosto/2025',
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
        expect(body).toHaveProperty('message')
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
      })

    test('POST /patrimony/refresh-cache should refresh FIPE cache',
      async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/patrimony/refresh-cache',
          headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body).toHaveProperty('data')
        expect(body).toHaveProperty('message')
      })
  })

  describe('Multiple Vehicles and Shared Ownership', () => {
    test(
      'should calculate patrimony with multiple vehicles and shared ownership',
      async () => {
      // Criar usuário de teste
        const testPartner = await prisma.user.create({
          data: {
            name: 'Partner Multi',
            num_cpf: '44444444444',
            email: 'multi@test.com',
            password: 'hashedpassword',
            birthday: new Date('1990-01-01'),
            phone_number: '11999999999',
            profile: 'PARTNER',
            is_active: true,
          },
        })

        // Criar investidor para compartilhar ownership
        const testInvestor = await prisma.user.create({
          data: {
            name: 'Investor Share',
            num_cpf: '55555555555',
            email: 'investor@test.com',
            password: 'hashedpassword',
            birthday: new Date('1990-01-01'),
            phone_number: '11999999999',
            profile: 'INVESTOR',
            is_active: true,
          },
        })

        // Criar 2 veículos
        const vehicle1 =
        await AuthHelper.createTestVehicle(server, authTokens.accessToken, {
          fipe_brand_code: 21,
          fipe_model_code: 7541,
          year_id: '2020-1',
          fuel_acronym: 'G',
          vehicle_type: 'cars',
        })

        const vehicle2 =
        await AuthHelper.createTestVehicle(server, authTokens.accessToken, {
          fipe_brand_code: 22,
          fipe_model_code: 7542,
          year_id: '2021-1',
          fuel_acronym: 'G',
          vehicle_type: 'cars',
        })

        // Criar ownerships
        await prisma.vehicleOwnership.createMany({
          data: [
          // Veículo 1: 100% do partner
            {
              vehicle_id: vehicle1.id,
              user_id: testPartner.id,
              ownership_percentage: 100,
            },
            // Veículo 2: 50% partner, 50% investor
            {
              vehicle_id: vehicle2.id,
              user_id: testPartner.id,
              ownership_percentage: 50,
            },
            {
              vehicle_id: vehicle2.id,
              user_id: testInvestor.id,
              ownership_percentage: 50,
            },
          ],
        })

        // Criar caches FIPE
        await createUniqueFipeCache({
          brand_code: 21,
          model_code: 7541,
          year_id: '2020-1',
          fuel_acronym: 'G',
          vehicle_type: VehicleType.cars, // Use enum value
          fipe_value: 50000,
          reference_month: 'agosto/2025',
        })

        await createUniqueFipeCache({
          brand_code: 22,
          model_code: 7542,
          year_id: '2021-1',
          fuel_acronym: 'G',
          vehicle_type: VehicleType.cars, // Use enum value
          fipe_value: 60000,
          reference_month: 'agosto/2025',
        })

        // Testar cálculo para o partner
        const partnerResult =
        await patrimonyService.calculateUserPatrimony(testPartner.id)
        expect(
          partnerResult.total_patrimony).toBe(80000) // 50.000 + (50% de 60.000)
        expect(partnerResult.vehicles).toHaveLength(2)

        // Testar cálculo para o investor
        const investorResult =
        await patrimonyService.calculateUserPatrimony(testInvestor.id)
        expect(investorResult.total_patrimony).toBe(30000) // 50% de 60.000
        expect(investorResult.vehicles).toHaveLength(1)
      })
  })
})
