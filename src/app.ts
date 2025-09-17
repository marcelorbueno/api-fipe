import Fastify from 'fastify'
import { handleError } from './utils/error-handler'

export const app = Fastify({
  logger: false,
})

// Error handler global
app.setErrorHandler((error, request, reply) => {
  handleError(error, reply, request)
})
