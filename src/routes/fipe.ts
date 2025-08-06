import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { AxiosError } from 'axios' // ✅ IMPORTAR AxiosError
import axios from '../config/axios'
import { env } from '../env'

export async function fipeRoutes(app: FastifyInstance) {
  // ⚠️ Rota de teste apenas em ambiente de desenvolvimento
  if (env.NODE_ENV === 'development') {
    app.get('/fipe/test-connection',
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          console.log('🔧 [DEV] Testando configurações de proxy com axios...')
          console.log('HTTP_PROXY:', process.env.HTTP_PROXY)
          console.log('HTTPS_PROXY:', process.env.HTTPS_PROXY)

          const response = await axios.get('https://httpbin.org/ip')

          console.log('✅ Teste de conectividade OK:', response.data)
          return reply.send({
            status: 'success',
            message: 'Conectividade com proxy OK via axios',
            data: response.data,
            environment: 'development',
          })
        } catch (error: unknown) { // ✅ TIPAR COMO unknown
          console.error('❌ Teste de conectividade falhou:', error)
          return reply.status(500).send({
            error: 'Teste de conectividade falhou',
            details: error instanceof Error
              ? error.message
              : 'Erro desconhecido',
            environment: 'development',
          })
        }
      })
  }

  // 🚗 Rota para listar tipos de veículos disponíveis
  app.get('/fipe/vehicle-types', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      console.log('🚗 Retornando tipos de veículos disponíveis...')

      const vehicleTypes = {
        vehicle_types: [
          {
            code: 'cars',
            name: 'Carros',
          },
          {
            code: 'motorcycles',
            name: 'Motocicletas',
          },
        ],
      }

      console.log('✅ Tipos de veículos retornados com sucesso')
      return reply.send(vehicleTypes)
    } catch (error: unknown) {
      console.error('❌ Erro ao buscar tipos de veículos:', error)

      return reply.status(500).send({
        error: 'Erro interno do servidor',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // 🏷️ Rota para listar marcas por tipo de veículo
  app.get('/fipe/:vehicleType/brands', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { vehicleType } = request.params as { vehicleType: string }
      console.log(`🏷️ Buscando marcas para tipo de veículo: ${vehicleType}`)

      // Validar tipo de veículo
      const validTypes = ['cars', 'motorcycles']
      if (!validTypes.includes(vehicleType)) {
        return reply.status(400).send({
          error: 'Tipo de veículo inválido',
          validTypes,
          received: vehicleType,
        })
      }

      const response = await axios.get(
        `${env.API_FIPE_PATH}/${vehicleType}/brands`, {
          params: {
            reference: env.FIPE_REFERENCE,
          },
        })

      console.log(`✅ Marcas obtidas com sucesso para ${vehicleType}`)
      return reply.send(response.data)
    } catch (error: unknown) {
      console.error('❌ Erro ao buscar marcas:', error)

      if (error instanceof AxiosError && error.response) {
        return reply.status(error.response.status).send({
          error: 'Erro na API da FIPE',
          status: error.response.status,
        })
      }

      return reply.status(500).send({
        error: 'Erro interno do servidor',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // 🚙 Rota para listar modelos por marca
  app.get('/fipe/:vehicleType/brands/:brandId/models', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { vehicleType, brandId } = request.params as {
        vehicleType: string;
        brandId: string;
      }
      console.log(
        `🚙 Buscando modelos para marca ${brandId} do tipo ${vehicleType}`)

      // Validar tipo de veículo
      const validTypes = ['cars', 'motorcycles']
      if (!validTypes.includes(vehicleType)) {
        return reply.status(400).send({
          error: 'Tipo de veículo inválido',
          validTypes,
          received: vehicleType,
        })
      }

      const response = await axios.get(
        `${env.API_FIPE_PATH}/${vehicleType}/brands/${brandId}/models`, {
          params: {
            reference: env.FIPE_REFERENCE,
          },
        })

      console.log('✅ Modelos obtidos com sucesso')
      return reply.send(response.data)
    } catch (error: unknown) {
      console.error('❌ Erro ao buscar modelos:', error)

      if (error instanceof AxiosError && error.response) {
        return reply.status(error.response.status).send({
          error: 'Erro na API da FIPE',
          status: error.response.status,
        })
      }

      return reply.status(500).send({
        error: 'Erro interno do servidor',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // 📅 Rota para listar tabelas de referência (meses/anos)
  app.get('/fipe/references', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      console.log('📅 Buscando tabelas de referência disponíveis...')

      const response = await axios.get(`${env.API_FIPE_PATH}/references`)

      console.log('✅ Tabelas de referência obtidas com sucesso')
      return reply.send(response.data)
    } catch (error: unknown) {
      console.error('❌ Erro ao buscar tabelas de referência:', error)

      if (error instanceof AxiosError && error.response) {
        return reply.status(error.response.status).send({
          error: 'Erro na API da FIPE',
          status: error.response.status,
        })
      }

      return reply.status(500).send({
        error: 'Erro interno do servidor',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // 📅 Rota para listar anos disponíveis de um modelo específico
  app.get('/fipe/:vehicleType/brands/:brandId/models/:modelId/years', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { vehicleType, brandId, modelId } = request.params as {
        vehicleType: string;
        brandId: string;
        modelId: string;
      }

      console.log(`📅 Buscando anos para modelo ${modelId} ` +
        `da marca ${brandId} do tipo ${vehicleType}`,
      )

      // Validar tipo de veículo
      const validTypes = ['cars', 'motorcycles']
      if (!validTypes.includes(vehicleType)) {
        return reply.status(400).send({
          error: 'Tipo de veículo inválido',
          validTypes,
          received: vehicleType,
        })
      }

      // Validar IDs (devem ser números)
      if (isNaN(Number(brandId)) || isNaN(Number(modelId))) {
        return reply.status(400).send({
          error: 'IDs inválidos',
          details: 'brandId e modelId devem ser números',
          received: { brandId, modelId },
        })
      }

      console.log('📋 REQUEST DEBUG:', {
        url: `${env.API_FIPE_PATH}/${vehicleType}/brands/${brandId}/models/` +
          `${modelId}/years`,
        params: { reference: env.FIPE_REFERENCE },
        method: 'GET',
      })

      const response = await axios.get(
        `${env.API_FIPE_PATH}/${vehicleType}/brands/${brandId}/models/` +
        `${modelId}/years`,
        {
          params: {
            reference: env.FIPE_REFERENCE,
          },
        },
      )

      console.log('📊 RESPONSE DEBUG:', {
        status: response.status,
        dataLength: Array.isArray(response.data)
          ? response.data.length
          : 'N/A',
        firstItems: Array.isArray(response.data)
          ? response.data.slice(0, 3)
          : response.data,
      })

      console.log(`✅ Anos obtidos com sucesso para modelo ${modelId}`)
      return reply.send(response.data)
    } catch (error: unknown) {
      console.error('❌ Erro ao buscar anos:', error)

      if (error instanceof AxiosError && error.response) {
        return reply.status(error.response.status).send({
          error: 'Erro na API da FIPE',
          status: error.response.status,
          details: error.response.data || 'Dados não disponíveis',
        })
      }

      return reply.status(500).send({
        error: 'Erro interno do servidor',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })
}
