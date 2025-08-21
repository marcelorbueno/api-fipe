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
import bcrypt from 'bcryptjs'
import { UserProfile } from '@prisma/client'
import { prisma } from '@/lib/prisma'

describe('Auth Routes', () => {
  let server: FastifyInstance
  let testUser: {
    id: string
    name: string
    email: string
    profile: UserProfile
  }
  let refreshToken: string

  beforeAll(async () => {
    // Definir JWT_SECRET para teste antes de criar o servidor
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-super-secure'
    server = await createTestServer()
  })

  afterAll(async () => {
    await closeTestServer(server)
  })

  beforeEach(async () => {
    // Limpar dados antes de cada teste
    await prisma.refreshToken.deleteMany()
    await prisma.user.deleteMany()

    // Criar usuário de teste
    const hashedPassword = await bcrypt.hash('password123', 10)
    testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        num_cpf: '12345678901',
        email: 'test@example.com',
        password: hashedPassword,
        birthday: new Date('1990-01-01'),
        phone_number: '11999999999',
        profile: UserProfile.ADMINISTRATOR,
        is_active: true,
      },
    })
  })

  describe('POST /auth/login', () => {
    test('should login successfully with valid credentials', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          email: 'test@example.com',
          password: 'password123',
        },
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)

      expect(body).toHaveProperty('access_token')
      expect(body).toHaveProperty('refresh_token')
      expect(body).toHaveProperty('user')

      expect(body.user).toHaveProperty('id', testUser.id)
      expect(body.user).toHaveProperty('name', 'Test User')
      expect(body.user).toHaveProperty('email', 'test@example.com')
      expect(body.user).toHaveProperty('profile', 'ADMINISTRATOR')

      // Salvar refresh token para outros testes
      refreshToken = body.refresh_token

      // Verificar se tokens são strings não vazias
      expect(typeof body.access_token).toBe('string')
      expect(body.access_token.length).toBeGreaterThan(0)
      expect(typeof body.refresh_token).toBe('string')
      expect(body.refresh_token.length).toBeGreaterThan(0)
    })

    test('should fail with invalid email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          email: 'invalid@example.com',
          password: 'password123',
        },
      })

      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error', 'Credenciais inválidas')
    })

    test('should fail with invalid password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      })

      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error', 'Credenciais inválidas')
    })

    test('should fail with inactive user', async () => {
      // Desativar usuário
      await prisma.user.update({
        where: { id: testUser.id },
        data: { is_active: false },
      })

      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          email: 'test@example.com',
          password: 'password123',
        },
      })

      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error', 'Credenciais inválidas')
    })

    test('should fail with invalid email format', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          email: 'invalid-email',
          password: 'password123',
        },
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error')
    })

    test('should fail with short password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          email: 'test@example.com',
          password: '123',
        },
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error')
    })
  })

  describe('POST /auth/refresh', () => {
    beforeEach(async () => {
      // Fazer login para obter refresh token
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/auth/login',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          email: 'test@example.com',
          password: 'password123',
        },
      })

      const loginBody = JSON.parse(loginResponse.body)
      refreshToken = loginBody.refresh_token
    })

    test('should refresh token successfully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          refreshToken,
        },
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)

      expect(body).toHaveProperty('access_token')
      expect(body).toHaveProperty('user')

      expect(typeof body.access_token).toBe('string')
      expect(body.access_token.length).toBeGreaterThan(0)

      expect(body.user).toHaveProperty('id', testUser.id)
      expect(body.user).toHaveProperty('email', 'test@example.com')
    })

    test('should fail with invalid refresh token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          refreshToken: 'invalid-token',
        },
      })

      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error', 'Refresh token inválido ou expirado')
    })

    test('should fail with expired refresh token', async () => {
      // Criar token expirado diretamente no banco
      await prisma.refreshToken.create({
        data: {
          token: 'expired-token',
          user_id: testUser.id,
          expires_at: new Date(Date.now() - 1000), // 1 segundo atrás
        },
      })

      const response = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          refreshToken: 'expired-token',
        },
      })

      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error', 'Refresh token inválido ou expirado')
    })
  })

  describe('POST /auth/logout', () => {
    beforeEach(async () => {
      // Fazer login para obter refresh token
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/auth/login',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          email: 'test@example.com',
          password: 'password123',
        },
      })

      const loginBody = JSON.parse(loginResponse.body)
      refreshToken = loginBody.refresh_token
    })

    test('should logout successfully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          refreshToken,
        },
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('message', 'Logout realizado com sucesso')

      // Verificar se o token foi removido do banco
      const tokenInDb = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      })
      expect(tokenInDb).toBeNull()
    })

    test('should fail with invalid refresh token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          refreshToken: 'invalid-token',
        },
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error')
    })
  })

  describe('GET /auth/me', () => {
    let accessToken: string

    beforeEach(async () => {
      // Fazer login para obter access token
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/auth/login',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          email: 'test@example.com',
          password: 'password123',
        },
      })

      expect(loginResponse.statusCode).toBe(200)
      const loginBody = JSON.parse(loginResponse.body)
      accessToken = loginBody.access_token
    })

    test('should return user data when authenticated', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)

      expect(body).toHaveProperty('user')
      expect(body.user).toHaveProperty('id', testUser.id)
      expect(body.user).toHaveProperty('name', 'Test User')
      expect(body.user).toHaveProperty('email', 'test@example.com')
      expect(body.user).toHaveProperty('profile', 'ADMINISTRATOR')
      expect(body.user).toHaveProperty('is_active', true)

      // Não deve retornar a senha
      expect(body.user).not.toHaveProperty('password')
    })

    test('should fail without authorization header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
      })

      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error', 'Token de acesso requerido')
    })

    test('should fail with invalid token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      })

      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error')
      // Aceitar ambas as mensagens possíveis
      expect([
        'Token de acesso inválido ou expirado',
        'Token de acesso inválido',
      ]).toContain(body.error)
    })

    test('should fail with malformed authorization header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: 'InvalidFormat token',
        },
      })

      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('error')
      // Aceitar ambas as mensagens possíveis
      expect([
        'Token de acesso inválido',
        'Token de acesso inválido ou expirado',
      ]).toContain(body.error)
    })
  })
})
