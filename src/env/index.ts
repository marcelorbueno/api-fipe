import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(
    ['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  API_FIPE_PATH: z.string().default('https://fipe.parallelum.com.br/api/v2'),
  FIPE_REFERENCE: z.string().default('324'),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().default(7),

  // Variáveis de Proxy
  HTTP_PROXY: z.string().optional(),
  HTTPS_PROXY: z.string().optional(),
  http_proxy: z.string().optional(),
  https_proxy: z.string().optional(),
  no_proxy: z.string().optional(),
  NO_PROXY: z.string().optional(),
})

const _env = envSchema.safeParse(process.env)

if (_env.success === false) {
  console.error('❌ Invalid environment variables', _env.error.format())
  throw new Error('Invalid environment variables')
}

export const env = _env.data
