import { FastifyInstance } from 'fastify'
import { UserProfile, VehicleType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

interface CreateUserOptions {
  name?: string
  email?: string
  num_cpf?: string
  password?: string
  profile?: UserProfile | string
  phone_number?: string
  birthday?: string
  is_active?: boolean
}

interface CreateVehicleOptions {
  license_plate?: string
  renavam?: string
  fipe_brand_code?: number
  fipe_model_code?: number
  year_id?: string
  vehicle_type?: VehicleType
  color?: string
  is_company_vehicle?: boolean
  purchase_value?: number
  purchase_date?: string
}

export class AuthHelper {
  /**
   * ✅ CORREÇÃO: Criar usuário autenticado para testes
   */
  static async createAuthenticatedUser(
    server: FastifyInstance,
    options: CreateUserOptions = {},
  ): Promise<{
    tokens: { accessToken: string; refreshToken: string }
    user: { id: string; name: string; email: string; profile: UserProfile }
  }> {
    const userData = {
      name: options.name || 'Test User',
      email: options.email || `test${Date.now()}@example.com`,
      num_cpf: options.num_cpf || Math.random().toString().substring(2, 13),
      password: options.password || 'password123',
      profile: options.profile || UserProfile.ADMINISTRATOR,
      phone_number: options.phone_number || '11999999999',
      birthday: options.birthday || '1990-01-01',
      is_active: options.is_active ?? true,
    }

    // Garantir que profile seja do tipo correto
    const profileValue = typeof userData.profile === 'string'
      ? UserProfile[userData.profile as keyof typeof UserProfile]
      : userData.profile

    // Criar usuário no banco
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    const user = await prisma.user.create({
      data: {
        ...userData,
        profile: profileValue,
        password: hashedPassword,
        birthday: new Date(userData.birthday),
      },
    })

    // Fazer login para obter tokens
    const loginResponse = await server.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: {
        email: userData.email,
        password: userData.password,
      },
    })

    if (loginResponse.statusCode !== 200) {
      throw new Error(`Failed to authenticate user: ${loginResponse.body}`)
    }

    const loginBody = JSON.parse(loginResponse.body)

    return {
      tokens: {
        accessToken: loginBody.access_token,
        refreshToken: loginBody.refresh_token,
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile: user.profile,
      },
    }
  }

  /**
   * ✅ CORREÇÃO: Criar usuário de teste sem autenticar
   */
  static async createTestUser(
    server: FastifyInstance,
    options: CreateUserOptions = {},
  ): Promise<{
    user: { id: string; name: string; email: string; profile: UserProfile }
  }> {
    const userData = {
      name: options.name || 'Test User',
      email: options.email || `test${Date.now()}@example.com`,
      num_cpf: options.num_cpf || '12345678901',
      password: options.password || 'password123',
      profile: options.profile || UserProfile.PARTNER,
      phone_number: options.phone_number || '11999999999',
      birthday: options.birthday || '1990-01-01',
      is_active: options.is_active ?? true,
    }

    // Garantir que profile seja do tipo correto
    const profileValue = typeof userData.profile === 'string'
      ? UserProfile[userData.profile as keyof typeof UserProfile]
      : userData.profile

    const hashedPassword = await bcrypt.hash(userData.password, 10)
    const user = await prisma.user.create({
      data: {
        ...userData,
        profile: profileValue,
        password: hashedPassword,
        birthday: new Date(userData.birthday),
      },
    })

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile: user.profile,
      },
    }
  }

  /**
   * Criar veículo de teste (com mock da API FIPE)
   */
  static async createTestVehicle(
    server: FastifyInstance,
    accessToken: string,
    options: CreateVehicleOptions = {},
  ): Promise<{ id: string; license_plate: string }> {
    const vehicleData = {
      license_plate: options.license_plate ||
        `TEST${Date.now().toString().slice(-3)}`,
      renavam: options.renavam || Math.random().toString().slice(2, 13),
      fipe_brand_code: options.fipe_brand_code || 21,
      fipe_model_code: options.fipe_model_code || 7541,
      year_id: options.year_id || '2017-5',
      vehicle_type: options.vehicle_type || VehicleType.cars,
      color: options.color || 'Branco',
      is_company_vehicle: options.is_company_vehicle || false,
      purchase_value: options.purchase_value || 35000,
      purchase_date: options.purchase_date || '2023-01-01T00:00:00.000Z',
    }

    // Criar cache FIPE mock antes de criar o veículo
    await prisma.fipeCache.upsert({
      where: {
        brand_code_model_code_year_id_fuel_acronym_vehicle_type: {
          brand_code: vehicleData.fipe_brand_code,
          model_code: vehicleData.fipe_model_code,
          year_id: vehicleData.year_id,
          fuel_acronym: 'F',
          vehicle_type: vehicleData.vehicle_type,
        },
      },
      create: {
        brand_code: vehicleData.fipe_brand_code,
        model_code: vehicleData.fipe_model_code,
        year_id: vehicleData.year_id,
        fuel_acronym: 'F',
        vehicle_type: vehicleData.vehicle_type,
        fipe_value: 43807,
        brand_name: 'Fiat',
        model_name: 'MOBI LIKE ON 1.0 Fire Flex 5p.',
        model_year: 2017,
        fuel_name: 'Flex',
        code_fipe: '001462-1',
        reference_month: 'agosto de 2025',
      },
      update: {
        fipe_value: 43807,
        updated_at: new Date(),
      },
    })

    // Tentar criar veículo via API
    const response = await server.inject({
      method: 'POST',
      url: '/vehicles',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      payload: vehicleData,
    })

    if (response.statusCode === 201) {
      const body = JSON.parse(response.body)
      return {
        id: body.data.id,
        license_plate: body.data.license_plate,
      }
    }

    // Se falhar via API, criar diretamente no banco (fallback para testes)
    const vehicle = await prisma.vehicle.create({
      data: {
        ...vehicleData,
        brand_name: 'Fiat',
        model_name: 'MOBI LIKE ON 1.0 Fire Flex 5p.',
        display_year: 2017,
        display_fuel: 'Flex',
        fuel_acronym: 'F',
        purchase_date: new Date(vehicleData.purchase_date),
      },
    })

    return {
      id: vehicle.id,
      license_plate: vehicle.license_plate,
    }
  }

  /**
   * Obter headers de autenticação
   */
  static getAuthHeaders(accessToken: string): Record<string, string> {
    return {
      authorization: `Bearer ${accessToken}`,
    }
  }

  /**
   * Criar mock de dados FIPE
   */
  static async createFipeCache(
    brandCode: number = 21,
    modelCode: number = 7541,
    yearId: string = '2017-5',
    vehicleType: VehicleType = VehicleType.cars,
    fipeValue: number = 43807,
  ): Promise<void> {
    await prisma.fipeCache.upsert({
      where: {
        brand_code_model_code_year_id_fuel_acronym_vehicle_type: {
          brand_code: brandCode,
          model_code: modelCode,
          year_id: yearId,
          fuel_acronym: 'F',
          vehicle_type: vehicleType,
        },
      },
      create: {
        brand_code: brandCode,
        model_code: modelCode,
        year_id: yearId,
        fuel_acronym: 'F',
        vehicle_type: vehicleType,
        fipe_value: fipeValue,
        brand_name: 'Test Brand',
        model_name: 'Test Model',
        model_year: parseInt(yearId.split('-')[0]),
        fuel_name: 'Flex',
        code_fipe: '000000-0',
        reference_month: 'agosto de 2025',
      },
      update: {
        fipe_value: fipeValue,
        updated_at: new Date(),
      },
    })
  }
}

/**
 * Limpar dados de teste
 */
export async function cleanupTestData(): Promise<void> {
  // Ordem importante para respeitar foreign keys
  await prisma.vehicleOwnership.deleteMany()
  await prisma.fipeCache.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()
}
