import axios, { AxiosRequestConfig } from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { env } from '../env'

interface FetchOptions {
  method: string
  headers: Record<string, string>
}

export async function fetchWithProxy(url: string, options: FetchOptions) {
  try {
    console.log('🌐 Fazendo requisição com axios e proxy configurado...')
    console.log('🎯 URL:', url)

    // Configuração do proxy
    const proxyUrl = env.HTTPS_PROXY || env.HTTP_PROXY
    console.log('🔧 Usando proxy:', proxyUrl)

    const axiosConfig: AxiosRequestConfig = {
      method: options.method,
      url,
      headers: options.headers,
      timeout: 60000, // 60 segundos
    }

    // Configurar proxy se disponível e não estiver na lista de bypass
    if (proxyUrl && !shouldBypassProxy(url)) {
      const agent = new HttpsProxyAgent(proxyUrl)
      axiosConfig.httpsAgent = agent
      axiosConfig.proxy = false // Desabilitar proxy padrão do axios
      console.log('✅ Agent de proxy configurado no axios')
    } else {
      console.log('🚫 Proxy bypassed ou não configurado')
    }

    const response = await axios(axiosConfig)

    console.log('✅ Resposta recebida:', response.status)

    // Retornar objeto compatível com fetch
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      json: async () => response.data,
      text: async () => JSON.stringify(response.data),
    }
  } catch (error) {
    console.error('❌ Erro na requisição com axios:', error)
    if (axios.isAxiosError(error)) {
      console.error('📊 Status do erro:', error.response?.status)
      console.error('📝 Mensagem:', error.message)
    }
    throw error
  }
}

function shouldBypassProxy(url: string): boolean {
  const noProxy = env.no_proxy || env.NO_PROXY || ''
  const noProxyList = noProxy.split(',').map(item => item.trim())

  for (const domain of noProxyList) {
    if (url.includes(domain)) {
      console.log(`🚫 Bypassing proxy for domain: ${domain}`)
      return true
    }
  }

  return false
}
