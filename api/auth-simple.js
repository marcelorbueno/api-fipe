import pg from 'pg'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    const { email, password } = loginSchema.parse(req.body)

    await client.connect()

    // Find user by email
    const result = await client.query(
      'SELECT id, email, password, name, profile, is_active FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const user = result.rows[0]

    if (!user.is_active) {
      return res.status(401).json({ error: 'Usuário inativo' })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    // Generate JWT token
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        profile: user.profile,
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    )

    await client.end()

    return res.status(200).json({
      access_token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile: user.profile,
      },
    })

  } catch (error) {
    console.error('❌ Auth error:', error)
    await client.end()

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.errors,
      })
    }

    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message,
    })
  }
}