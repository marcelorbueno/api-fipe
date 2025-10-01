import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret'
    this.accessTokenExpires = process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '1h'
    this.refreshTokenExpires = process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d'
  }

  async hashPassword(password) {
    return bcrypt.hash(password, 10)
  }

  async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword)
  }

  generateAccessToken(user) {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        profile: user.profile,
      },
      this.jwtSecret,
      { expiresIn: this.accessTokenExpires }
    )
  }

  generateRefreshToken() {
    return crypto.randomBytes(32).toString('hex')
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret)
    } catch (error) {
      throw new Error('Token inválido')
    }
  }

  getRefreshTokenExpiration() {
    const days = parseInt(this.refreshTokenExpires.replace('d', '')) || 7
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + days)
    return expiresAt
  }

  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Token de acesso requerido')
    }
    return authHeader.replace('Bearer ', '')
  }
}

export const authService = new AuthService()

// Middleware para autenticação
export function authenticate(handler) {
  return async function authenticatedHandler(req, res) {
    try {
      const authHeader = req.headers.authorization
      const token = authService.extractTokenFromHeader(authHeader)
      const decoded = authService.verifyAccessToken(token)

      // Adicionar dados do usuário ao request
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        profile: decoded.profile
      }

      return handler(req, res)
    } catch (error) {
      return res.status(401).json({
        error: 'Não autorizado',
        message: error.message
      })
    }
  }
}