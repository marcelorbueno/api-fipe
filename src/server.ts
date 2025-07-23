import { app } from './app'
import cors from '@fastify/cors'
import { fipeRoutes } from './routes/fipe'
import { env } from './env'
import { partnersRoutes } from './routes/partners'

const PORT = env.PORT

async function start() {
  await app.register(cors, { origin: '*' })
  await app.register(fipeRoutes)
  await app.register(partnersRoutes)

  app.listen({ port: Number(PORT), host: '0.0.0.0' }, (err, address) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    console.log(`Server listening on ${address}`)
  })
}

start()
