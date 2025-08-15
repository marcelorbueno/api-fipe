import { app } from './app'
import fastifyCors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'
import { authenticate } from './middleware/auth'
import { fipeRoutes } from './routes/fipe'
import { authRoutes } from './routes/auth'
import { env } from './env'
import { healthRoutes } from './routes/health'
import { usersRoutes } from './routes/users'
import { vehiclesRoutes } from './routes/vehicles'

const PORT = env.PORT

async function start() {
  try {
    // Registrar CORS
    await app.register(fastifyCors, { origin: '*' })

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

    await app.listen({ port: Number(PORT), host: '0.0.0.0' })
    console.log(`🚀 Server listening on port ${PORT}`)
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error)
    process.exit(1)
  }
}

start()
