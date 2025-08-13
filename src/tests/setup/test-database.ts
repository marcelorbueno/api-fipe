import { beforeAll, afterAll, afterEach } from '@jest/globals'
import { execSync } from 'child_process'
import * as process from 'process'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { parse } from 'pg-connection-string'

// Carrega as variáveis de ambiente do .env
config()

// A instância do PrismaClient deve ser global para ser acessível nos testes
let prisma: PrismaClient
// Variáveis para armazenar o estado do banco de dados de teste
let originalDatabaseUrl: string | undefined
let testDatabaseName: string | undefined

// Função para gerar um nome de banco de dados único para cada execução de teste
function generateTestDatabaseName(url: string) {
  const urlObject = new URL(url)
  const dbName = urlObject.pathname.split('/')[1]
  return `${dbName}_test_${randomUUID().replace(/-/g, '')}`
}

beforeAll(async () => {
  // 1. Armazenar a DATABASE_URL original antes de modificá-la
  originalDatabaseUrl = process.env.DATABASE_URL
  if (!originalDatabaseUrl) {
    throw new Error('DATABASE_URL is not defined in environment variables.')
  }

  // Parse a DATABASE_URL original para extrair as credenciais e o host
  const parsedOriginalUrl = parse(originalDatabaseUrl)
  const dbUser = parsedOriginalUrl.user
  const dbPassword = parsedOriginalUrl.password
  // dbHost deve ser 'localhost' para o Docker, ou o host configurado no .env
  const dbHost = process.env.DB_HOST || 'localhost'
  const dbPort = parsedOriginalUrl.port

  if (!dbUser || !dbPassword || !dbHost || !dbPort) {
    throw new Error('Missing database connection details from DATABASE_URL.')
  }

  // Gera um nome único para o banco de dados de teste
  testDatabaseName = generateTestDatabaseName(originalDatabaseUrl)

  // Define a URL do banco de dados de teste para o processo atual
  process.env.DATABASE_URL = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${testDatabaseName}`

  // 2. Criar o banco de dados de teste
  try {
    console.log(`✨ Criando banco de dados de teste: ${testDatabaseName}`)
    execSync(`createdb ${testDatabaseName}`, {
      env: {
        PGUSER: dbUser,
        PGPASSWORD: dbPassword,
        PGHOST: dbHost,
        PGPORT: dbPort,
        PGDATABASE: 'postgres', // Conecta ao banco 'postgres' para criar o novo
        DATABASE_URL: `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/postgres`,
        ...process.env,
      },
      // stdio: 'inherit',
    })
    console.log('✅ Banco de teste criado.')
  } catch (error: any) {
    console.error('❌ Erro ao criar banco de dados de teste:', error)
    if (error.stderr) {
      console.error(
        'Saída de erro do comando (stderr):', error.stderr.toString(),
      )
    }
    if (error.stdout) {
      console.error(
        'Saída padrão do comando (stdout):', error.stdout.toString(),
      )
    }
    throw error
  }

  // 3. Aplicar as migrações do Prisma ao banco de dados de teste
  try {
    console.log('✨ Aplicando migrações ao banco de teste...')
    execSync(
      'npx prisma migrate deploy',
      {
        env: {
          PGUSER: dbUser,
          PGPASSWORD: dbPassword,
          PGHOST: dbHost,
          PGPORT: dbPort,
          PGDATABASE: testDatabaseName,
          DATABASE_URL: process.env.DATABASE_URL,
          ...process.env,
        },
        stdio: 'inherit',
      },
    )
    console.log('✅ Migrações aplicadas ao banco de teste.')
  } catch (error: any) {
    console.error('❌ Erro ao aplicar migrações:', error)
    if (error.stderr) {
      console.error(
        'Saída de erro do comando (stderr):', error.stderr.toString(),
      )
    }
    if (error.stdout) {
      console.error(
        'Saída padrão do comando (stdout):', error.stdout.toString(),
      )
    }
    throw error
  }

  // 4. Inicializar a instância do PrismaClient
  prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'], // Para depuração
  })

  // 5. Conectar o Prisma para garantir que a conexão está ok
  try {
    await prisma.$connect()
    console.log('✅ PrismaClient conectado ao banco de teste.')
  } catch (error) {
    console.error('❌ Erro ao conectar PrismaClient:', error)
    throw error
  }
})

afterEach(async () => {
  // Limpar dados após cada teste, usando a instância 'prisma' que já está
  // conectada ao banco de teste
  try {
    // Estas linhas agora devem usar a conexão correta
    await prisma.refreshToken.deleteMany()
    await prisma.user.deleteMany()
    console.log('✅ Dados de teste limpos.')
  } catch (error) {
    console.error('❌ Erro ao limpar dados de teste:', error)
    // Para depuração, logue o objeto de erro completo
    console.error(error)
    // Não re-lança o erro aqui para não mascarar falhas de teste reais
  }
})

afterAll(async () => {
  // Desconectar o PrismaClient
  try {
    if (prisma) {
      await prisma.$disconnect()
      console.log('✅ PrismaClient desconectado.')
    }
  } catch (error) {
    console.error('❌ Erro ao desconectar PrismaClient:', error)
    console.error(error)
  }

  // Remover o banco de dados de teste
  // Usar o testDatabaseName que foi definido em beforeAll
  if (!testDatabaseName || !originalDatabaseUrl) {
    console.warn(
      '⚠️ Nome do banco de dados de teste ou URL original não definidos, ' +
      'não foi possível remover o banco de dados de teste ou restaurar a URL.',
    )
    return
  }

  const parsedOriginalUrl = parse(originalDatabaseUrl)
  const dbUser = parsedOriginalUrl.user
  const dbPassword = parsedOriginalUrl.password
  const dbHost = process.env.DB_HOST || 'localhost'
  const dbPort = parsedOriginalUrl.port

  if (!dbUser || !dbPassword || !dbHost || !dbPort) {
    console.warn(
      '⚠️ Detalhes incompletos para remover o banco de dados de teste.')
    return
  }

  try {
    console.log(`🗑️ Excluindo banco de dados de teste: ${testDatabaseName}`)
    execSync(`dropdb ${testDatabaseName}`, {
      env: {
        PGUSER: dbUser,
        PGPASSWORD: dbPassword,
        PGHOST: dbHost,
        PGPORT: dbPort,
        PGDATABASE: 'postgres',
        DATABASE_URL: `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/postgres`,
        ...process.env,
      },
      stdio: 'inherit',
    })
    console.log('✅ Banco de teste removido.')
  } catch (error) {
    console.error('❌ Erro ao remover banco de dados de teste:', error)
    console.error(error)
  }

  // Restaurar a DATABASE_URL original
  process.env.DATABASE_URL = originalDatabaseUrl
  console.log('✅ DATABASE_URL restaurada para o valor original.')
})

export { prisma }
