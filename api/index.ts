import { VercelRequest, VercelResponse } from '@vercel/node'
import '../src/env/setup'
import { app } from '../src/app'

let isReady = false

async function initializeApp() {
  if (!isReady) {
    // Initialize all plugins and routes
    await import('../src/server')
    await app.ready()
    isReady = true
  }
  return app
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const fastifyApp = await initializeApp()

    // Convert Vercel request to Node.js request format
    await fastifyApp.inject({
      method: req.method as any,
      url: req.url || '/',
      headers: req.headers,
      payload: req.body,
    }).then((response) => {
      res.status(response.statusCode)

      // Set headers
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value as string)
      })

      res.send(response.body)
    })
  } catch (error) {
    console.error('Handler error:', error)
    res.status(500).json({ error: 'Internal server error', details: error })
  }
}