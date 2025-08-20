import { PrismaClient } from '@prisma/client'

// Configuração baseada no ambiente
const getDatabaseUrl = () => {
  if (process.env.NODE_ENV === 'test') {
    return process.env.TEST_DATABASE_URL ||
           process.env.DATABASE_URL?.replace(
             'postgres:5432', 'localhost:5432') ||
           'postgresql://fipe:senha123@localhost:5432/fipe_test_db'
  }
  return process.env.DATABASE_URL
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error']
    : ['error'],
})
