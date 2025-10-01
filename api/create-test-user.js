import pg from 'pg'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    await client.connect()

    // Check if test user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['test@example.com']
    )

    if (existingUser.rows.length > 0) {
      await client.end()
      return res.status(400).json({ error: 'Test user already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('testpass123', 10)

    // Create test user
    const result = await client.query(`
      INSERT INTO users (id, name, num_cpf, email, password, birthday, phone_number, profile, is_active, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, name, email, profile
    `, [
      'Test User',
      '12345678901', // CPF fictício
      'test@example.com',
      hashedPassword,
      '1990-01-01', // Birthday
      '11999999999', // Phone
      'INVESTOR',
      true
    ])

    await client.end()

    return res.status(201).json({
      status: 'success',
      message: 'Test user created successfully',
      user: result.rows[0],
      credentials: {
        email: 'test@example.com',
        password: 'testpass123'
      }
    })

  } catch (error) {
    console.error('❌ Create user error:', error)
    await client.end()

    return res.status(500).json({
      error: 'Database error',
      details: error.message
    })
  }
}