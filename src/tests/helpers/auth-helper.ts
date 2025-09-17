import { FastifyInstance } from 'fastify'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { UserProfile, VehicleType } from '@prisma/client'
import { generateLicencePlate } from '../../lib/generateLicencePlate'

export interface TestUser {
  id: string
  name: string
  email: string
  password: string
  profile: UserProfile
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: TestUser
}

export interface TestVehicle {
  id: string
  license_plate: string
  renavam: string
  fipe_brand_code: number
  fipe_model_code: number
  year_id: string
  fuel_acronym: string
  vehicle_type: VehicleType
  display_year?: number
  display_fuel?: string
  brand_name?: string
  model_name?: string
  color?: string
  observations?: string
  purchase_date?: Date
  purchase_value?: number
  is_company_vehicle: boolean
}

export interface CreateTestVehicleOptions {
  license_plate?: string
  renavam?: string
  fipe_brand_code?: number
  fipe_model_code?: number
  year_id?: string
  fuel_acronym?: string
  vehicle_type?: VehicleType
  display_year?: number
  display_fuel?: string
  brand_name?: string
  model_name?: string
  color?: string
  observations?: string
  purchase_date?: Date
  purchase_value?: number
  is_company_vehicle?: boolean
}

export class AuthHelper {
  static async createTestUser(
    serverOrOverrides?: FastifyInstance | Partial<TestUser>,
    overrides: Partial<TestUser> = {},
  ): Promise<{ user: TestUser }> {
    // Se o primeiro parâmetro for um FastifyInstance, ignore-o e use o segundo
    // parâmetro
    let finalOverrides: Partial<TestUser> = {}

    if (serverOrOverrides && typeof serverOrOverrides === 'object' &&
      !('inject' in serverOrOverrides)) {
      // É um Partial<TestUser>
      finalOverrides = serverOrOverrides as Partial<TestUser>
    } else {
      // O primeiro parâmetro é um server, usar o segundo parâmetro
      finalOverrides = overrides
    }

    const defaultUser = {
      name: 'Test User',
      num_cpf: Math.random().toString().substring(2, 13), // CPF único
      email: `test${Math.random().toString(36).substring(7)}@example.com`,
      password: 'password123',
      birthday: new Date('1990-01-01'),
      phone_number: '11999999999',
      profile: UserProfile.ADMINISTRATOR,
      is_active: true,
      ...finalOverrides,
    }

    const hashedPassword = await bcrypt.hash(defaultUser.password, 10)

    const user = await prisma.user.create({
      data: {
        ...defaultUser,
        password: hashedPassword,
      },
    })

    const testUser: TestUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      password: defaultUser.password, // Retorna a senha não hasheada
      profile: user.profile,
    }

    return { user: testUser }
  }

  static async loginUser(
    server: FastifyInstance, email: string, password: string):
    Promise<AuthTokens> {
    const response = await server.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })

    if (response.statusCode !== 200) {
      throw new Error(`Login failed: ${response.body}`)
    }

    const body = JSON.parse(response.body)

    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      user: body.user,
    }
  }

  static async createAuthenticatedUser(
    server: FastifyInstance,
    overrides: Partial<TestUser> = {},
  ): Promise<{ user: TestUser; tokens: AuthTokens }> {
    const { user } = await this.createTestUser(server, overrides)
    const tokens = await this.loginUser(server, user.email, user.password)

    return { user, tokens }
  }

  static getAuthHeaders(accessToken: string) {
    return {
      authorization: `Bearer ${accessToken}`,
    }
  }

  // Nova função para criar veículos de teste
  static async createTestVehicle(
    serverOrOptions?: FastifyInstance | CreateTestVehicleOptions,
    accessTokenOrOptions?: string | CreateTestVehicleOptions,
    options: CreateTestVehicleOptions = {},
  ): Promise<TestVehicle> {
    // Se o primeiro parâmetro for um objeto (CreateTestVehicleOptions), usar
    // diretamente
    let finalOptions: CreateTestVehicleOptions = {}

    if (serverOrOptions && typeof serverOrOptions === 'object' &&
      !('inject' in serverOrOptions)) {
      // É um CreateTestVehicleOptions
      finalOptions = serverOrOptions as CreateTestVehicleOptions
    } else if (accessTokenOrOptions &&
      typeof accessTokenOrOptions === 'object') {
      // accessTokenOrOptions é CreateTestVehicleOptions
      finalOptions = accessTokenOrOptions as CreateTestVehicleOptions
    } else {
      // Usar options passado como terceiro parâmetro
      finalOptions = options
    }

    // Usar timestamp + random para garantir uniqueness absoluta, mas preferir
    // generateLicencePlate quando possível
    const timestamp = Date.now()
    const shortTimestamp = timestamp.toString().slice(-6) // Últimos 6 dígitos

    // Limitar tamanhos conforme schema do banco
    // license_plate: VARCHAR(8) - máximo 8 caracteres
    const licensePlate = finalOptions.license_plate || generateLicencePlate()

    // renavam: VARCHAR(11) - máximo 11 caracteres
    const renavam = finalOptions.renavam || shortTimestamp.padStart(11, '0')

    const vehicleData = {
      license_plate: licensePlate,
      renavam,
      fipe_brand_code: finalOptions.fipe_brand_code ?? 21,
      fipe_model_code: finalOptions.fipe_model_code ?? 4828,
      year_id: finalOptions.year_id ?? '2020-1',
      fuel_acronym: finalOptions.fuel_acronym ?? 'G',
      vehicle_type: finalOptions.vehicle_type ?? VehicleType.cars,
      display_year: finalOptions.display_year ?? 2020,
      display_fuel: finalOptions.display_fuel ?? 'Gasolina',
      brand_name: finalOptions.brand_name ?? 'Fiat',
      model_name: finalOptions.model_name ?? 'Uno Mille 1.0',
      color: finalOptions.color ?? 'Branco',
      observations: finalOptions.observations ?? 'Veículo de teste',
      purchase_date: finalOptions.purchase_date ?? new Date('2020-01-01'),
      purchase_value: finalOptions.purchase_value ?? 35000.00,
      is_company_vehicle: finalOptions.is_company_vehicle ?? false,
    }

    try {
      const vehicle = await prisma.vehicle.create({
        data: vehicleData,
      })

      return {
        id: vehicle.id,
        license_plate: vehicle.license_plate,
        renavam: vehicle.renavam,
        fipe_brand_code: vehicle.fipe_brand_code,
        fipe_model_code: vehicle.fipe_model_code,
        year_id: vehicle.year_id,
        fuel_acronym: vehicle.fuel_acronym,
        vehicle_type: vehicle.vehicle_type,
        display_year: vehicle.display_year || undefined,
        display_fuel: vehicle.display_fuel || undefined,
        brand_name: vehicle.brand_name || undefined,
        model_name: vehicle.model_name || undefined,
        color: vehicle.color || undefined,
        observations: vehicle.observations || undefined,
        purchase_date: vehicle.purchase_date || undefined,
        purchase_value: vehicle.purchase_value
          ? Number(vehicle.purchase_value)
          : undefined,
        is_company_vehicle: vehicle.is_company_vehicle,
      }
    } catch (error: unknown) {
      // Se ainda houver conflito, tentar com placa ainda mais única
      if (error && typeof error === 'object' && 'code' in error &&
        error.code === 'P2002') {
        const errorWithMeta = error as { meta?: { target?: string[] } }
        if (errorWithMeta.meta?.target?.includes('license_plate')) {
          const fallbackTimestamp = Date.now().toString().slice(-5)
          const uniqueLicensePlate = `X${fallbackTimestamp}`.substring(0, 8)
          const uniqueRenavam = fallbackTimestamp.padStart(11, '1')

          const retryVehicleData = {
            ...vehicleData,
            license_plate: uniqueLicensePlate,
            renavam: uniqueRenavam,
          }

          const vehicle = await prisma.vehicle.create({
            data: retryVehicleData,
          })

          return {
            id: vehicle.id,
            license_plate: vehicle.license_plate,
            renavam: vehicle.renavam,
            fipe_brand_code: vehicle.fipe_brand_code,
            fipe_model_code: vehicle.fipe_model_code,
            year_id: vehicle.year_id,
            fuel_acronym: vehicle.fuel_acronym,
            vehicle_type: vehicle.vehicle_type,
            display_year: vehicle.display_year || undefined,
            display_fuel: vehicle.display_fuel || undefined,
            brand_name: vehicle.brand_name || undefined,
            model_name: vehicle.model_name || undefined,
            color: vehicle.color || undefined,
            observations: vehicle.observations || undefined,
            purchase_date: vehicle.purchase_date || undefined,
            purchase_value: vehicle.purchase_value
              ? Number(vehicle.purchase_value)
              : undefined,
            is_company_vehicle: vehicle.is_company_vehicle,
          }
        }
      }

      throw error
    }
  }
}

// Funções independentes para compatibilidade
export async function createTestUser(
  server: FastifyInstance,
  overrides: Partial<TestUser> = {},
): Promise<{ user: TestUser }> {
  return AuthHelper.createTestUser(server, overrides)
}

// Função independente para criar veículos de teste (compatibilidade)
export async function createTestVehicle(
  server: FastifyInstance,
  accessToken: string,
  options: CreateTestVehicleOptions = {},
): Promise<TestVehicle> {
  return AuthHelper.createTestVehicle(server, accessToken, options)
}

// Função helper para criar cache FIPE de teste (evita duplicatas)
export async function createTestFipeCache(data: {
  brand_code: number
  model_code: number
  year_id: string
  fuel_acronym: string | null
  vehicle_type: VehicleType
  fipe_value: number
}) {
  // Verificar se já existe
  const existing = await prisma.fipeCache.findFirst({
    where: {
      brand_code: data.brand_code,
      model_code: data.model_code,
      year_id: data.year_id,
      fuel_acronym: data.fuel_acronym,
      vehicle_type: data.vehicle_type,
    },
  })

  if (existing) {
    return existing
  }

  // Criar novo se não existe
  return await prisma.fipeCache.create({
    data: {
      ...data,
      brand_name: 'Test Brand',
      model_name: 'Test Model',
      model_year: 2020,
      fuel_name: 'Gasolina',
      code_fipe: 'TEST001-1',
      reference_month: 'setembro/2025',
    },
  })
}

// Função helper para limpar dados de teste
export async function cleanupTestData() {
  try {
    // Ordem importante: limpar dependências primeiro
    await prisma.refreshToken.deleteMany()
    await prisma.vehicleOwnership.deleteMany()
    await prisma.vehicle.deleteMany()
    await prisma.user.deleteMany()
    await prisma.fipeCache.deleteMany()
    await prisma.tokenBlacklist.deleteMany()

    console.log('✅ Dados de teste limpos com sucesso')
  } catch (error) {
    console.error('❌ Erro ao limpar dados de teste:', error)
    throw error
  }
}
