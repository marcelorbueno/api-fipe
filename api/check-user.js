import pg from 'pg'

export default async function handler(req, res) {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    await client.connect()

    // Get user info (without password)
    const result = await client.query(
      'SELECT id, email, name, profile, is_active, created_at FROM users LIMIT 1'
    )

    await client.end()

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No users found' })
    }

    return res.status(200).json({
      status: 'success',
      user: result.rows[0]
    })

  } catch (error) {
    console.error('❌ Check user error:', error)
    await client.end()

    return res.status(500).json({
      error: 'Database error',
      details: error.message
    })
  }
}