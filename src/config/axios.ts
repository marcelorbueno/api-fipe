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

export default axios
