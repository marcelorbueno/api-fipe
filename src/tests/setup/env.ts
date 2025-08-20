// src/tests/setup/env.ts - NOVO ARQUIVO
import dotenv from 'dotenv'

// Carregar variáveis de ambiente para testes
dotenv.config({ path: '.env.test' })

// Configurações padrão para testes
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET ||
  'test-jwt-secret-key-for-testing-only-super-secure'
process.env.PORT = process.env.PORT || '3001'

// Database específico para testes
process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ||
  'postgresql://fipe:senha123@localhost:5432/fipe_test_db'

// API FIPE configurações para teste
process.env.API_FIPE_PATH = process.env.API_FIPE_PATH || 'https://fipe.parallelum.com.br/api/v2'
process.env.FIPE_REFERENCE = process.env.FIPE_REFERENCE || '324'

// Desabilitar logs durante testes
process.env.LOG_LEVEL = 'error'

console.log('🧪 Ambiente de teste configurado')
console.log('📋 JWT Secret:', process.env.JWT_SECRET?.slice(0, 20) + '...')
console.log('🗄️ Test DB:', process.env.TEST_DATABASE_URL?.split('@')[1])
console.log('🌐 FIPE API:', process.env.API_FIPE_PATH)
