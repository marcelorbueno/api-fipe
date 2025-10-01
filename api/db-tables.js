import pg from 'pg'

export default async function handler(req, res) {
  try {
    console.log('🔍 Checking database tables...')

    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL
    })

    await client.connect()
    console.log('✅ Connected to database')

    // Get list of tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    // Get count of records in main tables
    const userCount = await client.query('SELECT COUNT(*) FROM users')
    const vehicleCount = await client.query('SELECT COUNT(*) FROM vehicles')
    const refreshTokenCount = await client.query('SELECT COUNT(*) FROM refresh_tokens')
    const fipeCacheCount = await client.query('SELECT COUNT(*) FROM fipe_cache')

    await client.end()

    const tables = tablesResult.rows.map(row => row.table_name)

    res.status(200).json({
      status: 'success',
      message: 'Database tables verified',
      timestamp: new Date().toISOString(),
      tables: tables,
      record_counts: {
        users: parseInt(userCount.rows[0].count),
        vehicles: parseInt(vehicleCount.rows[0].count),
        refresh_tokens: parseInt(refreshTokenCount.rows[0].count),
        fipe_cache: parseInt(fipeCacheCount.rows[0].count)
      }
    })

  } catch (error) {
    console.error('❌ Database tables error:', error)

    res.status(500).json({
      status: 'error',
      message: 'Failed to check database tables',
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN'
      }
    })
  }
}