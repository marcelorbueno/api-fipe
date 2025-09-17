#!/usr/bin/env ts-node

import { execSync } from 'child_process'
import { prisma } from '@/lib/prisma'

/**
 * Script para configurar o banco de dados de teste
 * Executa: npm run setup:test-db
 */

async function setupTestDatabase() {
  console.log('🔧 Configurando banco de dados de teste...')

  try {
    // 1. Verificar se o container PostgreSQL está rodando
    console.log('📦 Verificando container PostgreSQL...')
    try {
      execSync('docker ps | grep postgres-fipe', { stdio: 'pipe' })
      console.log('✅ Container PostgreSQL encontrado')
    } catch {
      console.log('🚀 Iniciando container PostgreSQL...')
      execSync('docker compose up -d postgres', { stdio: 'inherit' })

      // Aguardar container inicializar
      console.log('⏳ Aguardando PostgreSQL inicializar...')
      await new Promise(resolve => setTimeout(resolve, 5000))
    }

    // 2. Criar banco de teste se não existir
    console.log('🗄️ Criando banco de teste...')
    try {
      execSync(
        'docker exec postgres-fipe psql -U fipe -d fipe_db -c "CREATE DATABASE fipe_test_db;"',
        { stdio: 'pipe' }
      )
      console.log('✅ Banco de teste criado')
    } catch (error) {
      // Banco já existe, ignorar erro
      console.log('ℹ️ Banco de teste já existe')
    }

    // 3. Executar migrações
    console.log('🔄 Executando migrações...')
    execSync(
      'DATABASE_URL="postgresql://fipe:senha123@localhost:5432/fipe_test_db" npx prisma migrate deploy',
      { stdio: 'inherit' }
    )

    // 4. Gerar client Prisma
    console.log('⚙️ Gerando client Prisma...')
    execSync('npx prisma generate', { stdio: 'inherit' })

    // 5. Verificar conexão
    console.log('🔗 Verificando conexão com banco de teste...')

    // Configurar DATABASE_URL para teste temporariamente
    const originalUrl = process.env.DATABASE_URL
    process.env.DATABASE_URL = 'postgresql://fipe:senha123@localhost:5432/fipe_test_db'

    await prisma.$connect()
    await prisma.$disconnect()

    // Restaurar URL original
    process.env.DATABASE_URL = originalUrl

    console.log('🎉 Banco de dados de teste configurado com sucesso!')
    console.log('\n📋 Próximos passos:')
    console.log('   npm test          - Executar todos os testes')
    console.log('   npm run test:unit - Executar apenas testes unitários')
    console.log('   npm run test:integration - Executar apenas testes de integração')

  } catch (error) {
    console.error('❌ Erro ao configurar banco de teste:', error)
    process.exit(1)
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupTestDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { setupTestDatabase }