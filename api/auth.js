import { z } from 'zod'
import { db } from '../lib/database.js'
import { authService, authenticate } from '../lib/auth.js'

// Schemas
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token é obrigatório'),
})

const logoutSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token é obrigatório'),
})

// Route handlers
async function handleLogin(req, res) {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const user = await db.findUser(email)
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const isPasswordValid = await authService.verifyPassword(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const accessToken = authService.generateAccessToken(user)
    const refreshToken = authService.generateRefreshToken()
    const refreshTokenExpires = authService.getRefreshTokenExpiration()

    await db.createRefreshToken(user.id, refreshToken, refreshTokenExpires)

    return res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile: user.profile,
      },
    })
  } catch (error) {
    console.error('❌ Login error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors })
    }
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

async function handleMe(req, res) {
  try {
    const user = await db.findUser(req.user.email)
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' })
    }

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile: user.profile,
      }
    })
  } catch (error) {
    console.error('❌ Me endpoint error:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

async function handleRefresh(req, res) {
  try {
    const { refresh_token } = refreshSchema.parse(req.body)

    const tokenData = await db.findRefreshToken(refresh_token)
    if (!tokenData || !tokenData.is_active) {
      return res.status(401).json({ error: 'Refresh token inválido ou expirado' })
    }

    const accessToken = authService.generateAccessToken({
      id: tokenData.user_id,
      email: tokenData.email,
      profile: tokenData.profile,
    })

    return res.status(200).json({
      access_token: accessToken,
      expires_in: 3600,
      user: {
        id: tokenData.user_id,
        name: tokenData.name,
        email: tokenData.email,
        profile: tokenData.profile,
      },
    })
  } catch (error) {
    console.error('❌ Token refresh error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors })
    }
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

async function handleLogout(req, res) {
  try {
    const { refresh_token } = logoutSchema.parse(req.body)
    await db.deleteRefreshToken(refresh_token)
    return res.status(200).json({ message: 'Logout realizado com sucesso' })
  } catch (error) {
    console.error('❌ Logout error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors })
    }
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// Main handler with routing
export default async function handler(req, res) {
  const { url, method } = req
  const path = new URL(url, `http://${req.headers.host}`).pathname

  // Extract auth endpoint from path
  const authEndpoint = path.replace('/auth/', '').replace('/auth', '')

  try {
    switch (authEndpoint) {
      case 'login':
        if (method !== 'POST') {
          return res.status(405).json({ error: 'Method Not Allowed' })
        }
        return await handleLogin(req, res)

      case 'me':
        if (method !== 'GET') {
          return res.status(405).json({ error: 'Method Not Allowed' })
        }
        // Apply authentication middleware for protected route
        return await authenticate(handleMe)(req, res)

      case 'refresh':
        if (method !== 'POST') {
          return res.status(405).json({ error: 'Method Not Allowed' })
        }
        return await handleRefresh(req, res)

      case 'logout':
        if (method !== 'POST') {
          return res.status(405).json({ error: 'Method Not Allowed' })
        }
        return await handleLogout(req, res)

      default:
        return res.status(404).json({ error: 'Auth endpoint not found' })
    }
  } catch (error) {
    console.error('❌ Auth handler error:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
}