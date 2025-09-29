import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export default async function handler(req, res) {
  try {
    // Test bcrypt
    const password = 'test123'
    const hash = await bcrypt.hash(password, 10)
    const isValid = await bcrypt.compare(password, hash)

    // Test JWT
    const token = jwt.sign({ test: 'data' }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' })
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret')

    res.status(200).json({
      status: 'success',
      message: 'Authentication libraries working',
      timestamp: new Date().toISOString(),
      tests: {
        bcrypt: {
          hash_created: !!hash,
          password_verified: isValid
        },
        jwt: {
          token_created: !!token,
          token_verified: !!decoded,
          decoded_data: decoded
        },
        environment: {
          jwt_secret_available: !!process.env.JWT_SECRET,
          database_url_available: !!process.env.DATABASE_URL
        }
      }
    })

  } catch (error) {
    console.error('❌ Auth test error:', error)
    res.status(500).json({
      status: 'error',
      message: 'Authentication test failed',
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN'
      }
    })
  }
}