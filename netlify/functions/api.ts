import type {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from '@netlify/functions'
import serverless from 'serverless-http'
import { app } from '../../src/app'
import fastifyCors from '@fastify/cors'
import { setupGlobalErrorHandlers } from '../../src/middleware/error-middleware'
import fastifyJwt from '@fastify/jwt'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { authenticate } from '../../src/middleware/auth'
import { fipeRoutes } from '../../src/routes/fipe'
import { authRoutes } from '../../src/routes/auth'
import { env } from '../../src/env'
import { healthRoutes } from '../../src/routes/health'
import { usersRoutes } from '../../src/routes/users'
import { vehiclesRoutes } from '../../src/routes/vehicles'
import { patrimonyRoutes } from '../../src/routes/patrimony'

let initialized = false

async function initializeApp() {
  if (initialized) return

  console.log('🚀 Initializing Fastify app for Netlify...')

  // Setup global error handlers
  setupGlobalErrorHandlers()

  // Registrar CORS
  await app.register(fastifyCors, { origin: '*' })

  // Registrar Swagger
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'API FIPE - BMC Car',
        description:
          'API para gerenciamento de veículos, usuários e patrimônio' +
          ' com integração à tabela FIPE',
        version: '1.0.0',
        contact: {
          name: 'BMC Car',
          email: 'contato@bmccar.com',
        },
        license: {
          name: 'MIT',
        },
      },
      servers: [
        {
          url: 'https://api.bmccar.com.br',
          description: 'Production server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
  })

  // Registrar Swagger UI
  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: false,
    logLevel: 'warn',
  })

  // Registrar JWT
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  })

  // Adicionar método authenticate
  app.decorate('authenticate', authenticate)

  // Registrar rotas
  await app.register(authRoutes)
  await app.register(fipeRoutes)
  await app.register(healthRoutes)
  await app.register(usersRoutes)
  await app.register(vehiclesRoutes)
  await app.register(patrimonyRoutes)

  await app.ready()

  initialized = true
  console.log('✅ Fastify app initialized for Netlify')
}

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext,
): Promise<HandlerResponse> => {
  await initializeApp()

  // Convert Fastify to serverless handler
  const serverlessHandler = serverless(app.server)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await serverlessHandler(event as any, context as any)) as HandlerResponse
}
