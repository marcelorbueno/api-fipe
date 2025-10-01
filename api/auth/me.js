import { authenticate } from '../../lib/auth.js'
import { db } from '../../lib/database.js'

async function meHandler(req, res) {
  try {
    // req.user já está disponível devido ao middleware authenticate
    const user = await db.findUser(req.user.email)

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' })
    }

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile: user.profile,
      }
    })

  } catch (error) {
    console.error('❌ Me endpoint error:', error)
    return res.status(500).json({
      error: 'Erro interno do servidor',
    })
  }
}

export default authenticate(meHandler)