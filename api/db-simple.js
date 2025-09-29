import pg from 'pg'

export default async function handler(req, res) {
  try {
    console.log('🔌 Testing simple database connection...')

    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()
    console.log('✅ Connected to database')

    const result = await client.query('SELECT 1 as test, NOW() as current_time')
    console.log('✅ Query executed successfully')

    await client.end()

    res.status(200).json({
      status: 'success',
      message: 'Simple database connection successful',
      timestamp: new Date().toISOString(),
      result: result.rows[0]
    })

  } catch (error) {
    console.error('❌ Database error:', error)

    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN'
      }
    })
  }
}