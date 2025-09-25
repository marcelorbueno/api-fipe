import { VercelRequest, VercelResponse } from '@vercel/node'
import '../src/env/setup'
import { app } from '../src/app'
import fastifyCors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { setupGlobalErrorHandlers } from '../src/middleware/error-middleware'
import { authenticate } from '../src/middleware/auth'
import { env } from '../src/env'

// Import routes
import { authRoutes } from '../src/routes/auth'
import { fipeRoutes } from '../src/routes/fipe'
import { healthRoutes } from '../src/routes/health'
import { usersRoutes } from '../src/routes/users'
import { vehiclesRoutes } from '../src/routes/vehicles'
import { patrimonyRoutes } from '../src/routes/patrimony'

let isReady = false

async function initializeApp() {
  if (!isReady) {
    // Setup global error handlers
    setupGlobalErrorHandlers()

    // Register CORS
    await app.register(fastifyCors, { origin: '*' })

    // Register Swagger
    await app.register(fastifySwagger, {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'API FIPE - BMC',
          description: 'API para gerenciamento de veículos, usuários e patrimônio com integração à tabela FIPE',
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
            url: 'https://api-bmc.vercel.app',
            description: 'Production server',
          },
        ],
      },
    })

    // Register Swagger UI
    await app.register(fastifySwaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false,
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
      transformSpecification: (swaggerObject) => {
        return swaggerObject
      },
      transformSpecificationClone: true,
    })

    // Register Scalar API Reference
    const { default: scalarApiReference } = await import('@scalar/fastify-api-reference')
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
          ogDescription: 'API para gerenciamento de veículos, usuários e patrimônio',
        },
      },
    })

    // Register JWT
    await app.register(fastifyJwt, {
      secret: env.JWT_SECRET,
    })

    // Add authenticate method
    app.decorate('authenticate', authenticate)

    // Register routes
    await app.register(authRoutes)
    await app.register(fipeRoutes)
    await app.register(healthRoutes)
    await app.register(usersRoutes)
    await app.register(vehiclesRoutes)
    await app.register(patrimonyRoutes)

    await app.ready()
    isReady = true
  }
  return app
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const fastifyApp = await initializeApp()

    // Convert Vercel request to Node.js request format
    const response = await fastifyApp.inject({
      method: req.method as any,
      url: req.url || '/',
      headers: req.headers,
      payload: req.body,
    })

    res.status(response.statusCode)

    // Set headers
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value as string)
    })

    res.send(response.body)
  } catch (error) {
    console.error('Handler error:', error)
    res.status(500).json({ error: 'Internal server error', details: error })
  }
}