import { FastifyInstance } from 'fastify'
import { prisma } from '../setup/test-database'
import bcrypt from 'bcryptjs'
import { UserProfile } from '@prisma/client'

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

export class AuthHelper {
  static async createTestUser(
    overrides: Partial<TestUser> = {}): Promise<TestUser> {
    const defaultUser = {
      name: 'Test User',
      num_cpf: Math.random().toString().substring(2, 13), // CPF único
      email: `test${Math.random().toString(36).substring(7)}@example.com`,
      password: 'password123',
      birthday: new Date('1990-01-01'),
      phone_number: '11999999999',
      profile: UserProfile.ADMINISTRATOR,
      is_active: true,
      ...overrides,
    }

    const hashedPassword = await bcrypt.hash(defaultUser.password, 10)

    const user = await prisma.user.create({
      data: {
        ...defaultUser,
        password: hashedPassword,
      },
    })

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      password: defaultUser.password, // Retorna a senha não hasheada
      profile: user.profile,
    }
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
    const user = await this.createTestUser(overrides)
    const tokens = await this.loginUser(server, user.email, user.password)

    return { user, tokens }
  }

  static getAuthHeaders(accessToken: string) {
    return {
      authorization: `Bearer ${accessToken}`,
    }
  }
}

// Função helper para limpar dados de teste
export async function cleanupTestData() {
  await prisma.refreshToken.deleteMany()
  await prisma.vehicleOwnership.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.partner.deleteMany()
  await prisma.user.deleteMany()
  await prisma.fipeCache.deleteMany()
}
