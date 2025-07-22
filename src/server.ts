import { app } from './app'
import cors from '@fastify/cors'
import { fipeRoutes } from './routes/fipe'
import { env } from './env'

const PORT = env.PORT

async function start() {
  await app.register(cors, { origin: '*' })
  await app.register(fipeRoutes)

  app.listen({ port: Number(PORT), host: '0.0.0.0' }, (err, address) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    console.log(`Server listening on ${address}`)
  })
}

start()
