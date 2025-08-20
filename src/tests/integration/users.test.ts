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
import { UserProfile } from '@prisma/client'

describe('Users Routes', () => {
  let server: FastifyInstance
  let authTokens: { accessToken: string; refreshToken: string }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-super-secure'
    server = await createTestServer()

    // Criar usuário admin autenticado para os testes
    const { tokens } = await AuthHelper.createAuthenticatedUser(server, {
      profile: UserProfile.ADMINISTRATOR,
    })
    authTokens = tokens
  })

  afterAll(async () => {
    await closeTestServer(server)
  })

  beforeEach(async () => {
    await cleanupTestData()
    // Recriar usuário autenticado se necessário
    const { tokens } = await AuthHelper.createAuthenticatedUser(server, {
      profile: UserProfile.ADMINISTRATOR,
    })
    authTokens = tokens
  })

  describe('GET /users', () => {
    test('should return empty list when no users exist', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/users',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)

      expect(body).toHaveProperty('data')
      expect(Array.isArray(body.data)).toBe(true)
      expect(body).toHaveProperty('pagination')
      expect(body.pagination).toHaveProperty('page', 1)
      expect(body.pagination).toHaveProperty('limit', 10)
    })

    test('should return users list when users exist', async () => {
      // Criar usuários de teste usando AuthHelper
      await AuthHelper.createTestUser(server, {
        name: 'João Silva',
        email: 'joao@test.com',
        profile: UserProfile.PARTNER,
      })

      await AuthHelper.createTestUser(server, {
        name: 'Maria Santos',
        email: 'maria@test.com',
        profile: UserProfile.INVESTOR,
      })

      const response = await server.inject({
        method: 'GET',
        url: '/users',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)

      expect(body.data.length).toBeGreaterThanOrEqual(2)
      expect(body.data[0]).toHaveProperty('name')
      expect(body.data[0]).toHaveProperty('email')
      expect(body.data[0]).toHaveProperty('profile')
      expect(body.data[0]).not.toHaveProperty('password_hash')
    })
  })

  describe('POST /users', () => {
    test('should create new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'testuser@example.com',
        num_cpf: '12345678901',
        password: 'password123',
        profile: UserProfile.PARTNER,
        phone_number: '11999999999',
        birthday: '1990-01-01',
      }

      const response = await server.inject({
        method: 'POST',
        url: '/users',
        headers: {
          ...AuthHelper.getAuthHeaders(authTokens.accessToken),
          'content-type': 'application/json',
        },
        payload: userData,
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)

      expect(body).toHaveProperty('data')
      expect(body.data).toHaveProperty('id')
      expect(body.data).toHaveProperty('name', userData.name)
      expect(body.data).toHaveProperty('email', userData.email)
      expect(body.data).toHaveProperty('profile', userData.profile)
      expect(body.data).not.toHaveProperty('password_hash')
    })

    test('should fail with duplicate email', async () => {
      const userData = {
        name: 'Test User',
        email: 'duplicate@example.com',
        num_cpf: '12345678901',
        password: 'password123',
        profile: UserProfile.PARTNER,
      }

      // Criar primeiro usuário
      await server.inject({
        method: 'POST',
        url: '/users',
        headers: {
          ...AuthHelper.getAuthHeaders(authTokens.accessToken),
          'content-type': 'application/json',
        },
        payload: userData,
      })

      // Tentar criar com mesmo email
      const response = await server.inject({
        method: 'POST',
        url: '/users',
        headers: {
          ...AuthHelper.getAuthHeaders(authTokens.accessToken),
          'content-type': 'application/json',
        },
        payload: { ...userData, num_cpf: '98765432109' },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error')
    })
  })

  describe('GET /users/stats', () => {
    test('should return user statistics', async () => {
      // Criar alguns usuários de teste
      await AuthHelper.createTestUser(server, {
        profile: UserProfile.PARTNER,
      })
      await AuthHelper.createTestUser(server, {
        profile: UserProfile.INVESTOR,
      })

      const response = await server.inject({
        method: 'GET',
        url: '/users/stats',
        headers: AuthHelper.getAuthHeaders(authTokens.accessToken),
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)

      expect(body).toHaveProperty('data')
      expect(body.data).toHaveProperty('total_users')
      expect(body.data).toHaveProperty('active_users')
      expect(body.data).toHaveProperty('users_by_profile')
      expect(body.data).toHaveProperty('average_vehicles_per_user')
    })
  })
})
