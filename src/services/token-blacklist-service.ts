import { prisma } from '../lib/prisma'

export class TokenBlacklistService {
  /**
   * Limpa tokens expirados da blacklist automaticamente
   * Deve ser executado periodicamente para manter a performance
   */
  static async cleanupExpiredTokens(): Promise<{
    deleted: number
    errors: number
  }> {
    try {
      console.log('🧹 Iniciando limpeza de tokens expirados da blacklist...')

      const result = await prisma.tokenBlacklist.deleteMany({
        where: {
          expires_at: {
            lt: new Date(), // Tokens que já expiraram
          },
        },
      }).catch(() => ({ count: 0 })) // Ignorar se tabela não existir ainda

      const deleted = result.count || 0

      if (deleted > 0) {
        console.log(`🗑️ ${deleted} tokens expirados removidos da blacklist`)
      }

      return { deleted, errors: 0 }
    } catch (error) {
      console.error('❌ Erro na limpeza da blacklist:', error)
      return { deleted: 0, errors: 1 }
    }
  }

  /**
   * Verifica se um token está na blacklist
   */
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const blacklistedToken = await prisma.tokenBlacklist.findUnique({
        where: { token },
      })

      return !!blacklistedToken
    } catch {
      // Se tabela não existir, token não está blacklisted
      console.warn('Token blacklist check failed, assuming not blacklisted')
      return false
    }
  }

  /**
   * Adiciona um token à blacklist
   */
  static async addTokenToBlacklist(
    token: string,
    expiresAt: Date,
  ): Promise<boolean> {
    try {
      await prisma.tokenBlacklist.create({
        data: {
          token,
          expires_at: expiresAt,
        },
      })

      console.log('🚫 Token adicionado à blacklist')
      return true
    } catch (error) {
      console.warn('Erro ao adicionar token à blacklist:', error)
      return false
    }
  }

  /**
   * Conta tokens na blacklist (para monitoramento)
   */
  static async getBlacklistStats(): Promise<{
    total: number
    expired: number
    active: number
  }> {
    try {
      const [total, expired] = await Promise.all([
        prisma.tokenBlacklist.count(),
        prisma.tokenBlacklist.count({
          where: {
            expires_at: {
              lt: new Date(),
            },
          },
        }),
      ])

      return {
        total,
        expired,
        active: total - expired,
      }
    } catch (error) {
      console.warn('Erro ao obter stats da blacklist:', error)
      return { total: 0, expired: 0, active: 0 }
    }
  }
}
