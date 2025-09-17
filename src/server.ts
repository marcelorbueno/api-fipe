import './env/setup'
import { app } from './app'
import fastifyCors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const scalarApiReference = require('@scalar/fastify-api-reference')
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
    await app.register(scalarApiReference.default || scalarApiReference, {
      routePrefix: '/reference',
      configuration: {
        theme: 'purple',
        layout: 'modern',
        apiReference: {
          metaData: {
            title: 'API FIPE - BMC Documentation',
            description: 'Beautiful API documentation powered by Scalar',
            ogDescription:
              'API para gerenciamento de veículos, usuários e patrimônio',
          },
        },
      },
      spec: {
        url: '/docs/json',
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

start()
