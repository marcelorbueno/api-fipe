import './env/setup'
import './tracing'
import { app } from './app'
import fastifyCors from '@fastify/cors'
import { setupGlobalErrorHandlers } from './middleware/error-middleware'
import fastifyJwt from '@fastify/jwt'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { authenticate } from './middleware/auth'
import { fipeRoutes } from './routes/fipe'
import { authRoutes } from './routes/auth'
import { env } from './env'
import { healthRoutes } from './routes/health'
import { usersRoutes } from './routes/users'
import { vehiclesRoutes } from './routes/vehicles'
import { patrimonyRoutes } from './routes/patrimony'

const PORT = env.PORT

async function start() {
  try {
    // Setup global error handlers
    setupGlobalErrorHandlers()

    // Sistema de logging e error handling configurado

    // Registrar CORS
    await app.register(fastifyCors, { origin: '*' })

    // Registrar Swagger
    await app.register(fastifySwagger, {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'API FIPE - BMC',
          description:
            'API para gerenciamento de veículos, usuários e patrimônio' +
            ' com integração à tabela FIPE',
          version: '1.0.0',
          contact: {
            name: 'BMC Team',
            email: 'contato@bmc.com.br',
          },
          license: {
            name: 'MIT',
          },
        },
        servers: [
          {
            url: `http://localhost:${PORT}`,
            description: 'Development server',
          },
          {
            url: 'http://localhost:3001',
            description: 'Docker container',
          },
          ...(process.env.VERCEL_URL
            ? [{
                url: `https://${process.env.VERCEL_URL}`,
                description: 'Production server (Vercel)',
              }]
            : []),
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
      staticCSP: true,
      transformStaticCSP: (header) => header,
      transformSpecification: (swaggerObject) => {
        return swaggerObject
      },
      transformSpecificationClone: true,
    })

    // Registrar Scalar API Reference
    const { default: scalarApiReference } = await import(
      '@scalar/fastify-api-reference'
    )
    // Type assertion needed due to compatibility issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await app.register(scalarApiReference as any, {
      routePrefix: '/reference',
      configuration: {
        spec: {
          url: '/docs/json',
        },
        theme: 'purple',
        layout: 'modern',
        metaData: {
          title: 'API FIPE - BMC Documentation',
          description: 'Beautiful API documentation powered by Scalar',
          ogDescription:
            'API para gerenciamento de veículos, usuários e patrimônio',
        },
      },
    })

    // Registrar JWT
    await app.register(fastifyJwt, {
      secret: env.JWT_SECRET,
    })

    // Adicionar método authenticate ao app
    app.decorate('authenticate', authenticate)

    // Registrar rotas

    await app.register(authRoutes)
    await app.register(fipeRoutes)
    await app.register(healthRoutes)
    await app.register(usersRoutes)
    await app.register(vehiclesRoutes)
    await app.register(patrimonyRoutes)

    await app.listen({ port: Number(PORT), host: '0.0.0.0' })
    console.log(`🚀 Server listening on port ${PORT}`)
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error)
    process.exit(1)
  }
}

// Para desenvolvimento local
if (require.main === module) {
  start()
}

// Para Vercel - exportar o app Fastify
export default async (req: any, res: any) => {
  await app.ready()
  app.server.emit('request', req, res)
}
