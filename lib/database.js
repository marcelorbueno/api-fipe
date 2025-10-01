import pg from 'pg'

export class Database {
  constructor() {
    this.connectionString = process.env.DATABASE_URL
  }

  async getClient() {
    const client = new pg.Client({
      connectionString: this.connectionString
    })
    await client.connect()
    return client
  }

  async query(text, params = []) {
    const client = await this.getClient()
    try {
      const result = await client.query(text, params)
      return result
    } finally {
      await client.end()
    }
  }

  async findUser(email) {
    const result = await this.query(
      'SELECT id, email, password, name, profile, is_active FROM users WHERE email = $1',
      [email]
    )
    return result.rows[0] || null
  }

  async createUser({ name, cpf, email, password, birthday, phone, profile = 'INVESTOR' }) {
    const result = await this.query(`
      INSERT INTO users (id, name, num_cpf, email, password, birthday, phone_number, profile, is_active, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, name, email, profile, created_at
    `, [name, cpf, email, password, birthday, phone, profile, true])

    return result.rows[0]
  }

  async createRefreshToken(userId, token, expiresAt) {
    const result = await this.query(`
      INSERT INTO refresh_tokens (id, token, user_id, expires_at, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, NOW())
      RETURNING id, token, expires_at
    `, [token, userId, expiresAt])

    return result.rows[0]
  }

  async findRefreshToken(token) {
    const result = await this.query(`
      SELECT rt.*, u.id as user_id, u.email, u.name, u.profile, u.is_active
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token = $1 AND rt.expires_at > NOW()
    `, [token])

    return result.rows[0] || null
  }

  async deleteRefreshToken(token) {
    await this.query('DELETE FROM refresh_tokens WHERE token = $1', [token])
  }
}

export const db = new Database()