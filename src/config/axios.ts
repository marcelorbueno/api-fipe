import axios from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { env } from '../env'

// Configurar axios globalmente
const proxyUrl = env.HTTPS_PROXY || env.HTTP_PROXY

if (proxyUrl) {
  const agent = new HttpsProxyAgent(proxyUrl)

  axios.defaults.httpsAgent = agent
  axios.defaults.proxy = false
  axios.defaults.timeout = 60000

  console.log('🔧 Axios configurado globalmente com proxy:', proxyUrl)
}

// ✅ INTERCEPTORS PARA DEBUG (APENAS EM DEVELOPMENT)
if (env.NODE_ENV === 'development') {
  axios.interceptors.request.use(
    (config) => {
      console.log('\n🔍 ===== AXIOS REQUEST DEBUG =====')
      console.log('🌐 URL:', config.url)
      console.log('📋 Method:', config.method?.toUpperCase())
      console.log('📝 Params:', config.params)
      console.log('🔗 BaseURL:', config.baseURL || 'N/A')
      console.log('🌉 Proxy:', proxyUrl || 'N/A')

      // ✅ CONSTRUIR URL COMPLETA MANUALMENTE
      let fullUrl = config.url || ''
      if (config.params) {
        const searchParams = new URLSearchParams(config.params).toString()
        fullUrl += '?' + searchParams
      }
      console.log('🎯 Full URL:', fullUrl)
      console.log('===================================\n')

      return config
    },
    (error) => {
      console.error('❌ [AXIOS REQUEST ERROR]:', error)
      return Promise.reject(error)
    },
  )

  axios.interceptors.response.use(
    (response) => {
      console.log('\n✅ ===== AXIOS RESPONSE DEBUG =====')
      console.log('📊 Status:', response.status, response.statusText)
      console.log('🌐 URL:', response.config.url)
      console.log('📏 Data length:', JSON.stringify(response.data).length,
        'characters')
      console.log('===================================\n')

      return response
    },
    (error) => {
      console.log('\n❌ ===== AXIOS RESPONSE ERROR =====')
      console.log('📊 Status:', error.response?.status)
      console.log('🌐 URL:', error.config?.url)
      console.log('💬 Error:', error.message)
      console.log('===================================\n')

      return Promise.reject(error)
    },
  )
}

export default axios
