import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { AxiosError } from 'axios'
import axios from '../config/axios'
import { env } from '../env'

export async function fipeRoutes(app: FastifyInstance) {
  // 🚗 Rota para listar tipos de veículos disponíveis
  app.get('/fipe/vehicle-types', {
    preHandler: [app.authenticate],
  }, async (_: FastifyRequest, reply: FastifyReply) => {
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
  }, async (_: FastifyRequest, reply: FastifyReply) => {
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

  // 🚗 Buscar informações detalhadas de um veículo específico
  app.get('/fipe/:vehicleType/brands/:brandId/models/:modelId/years/:yearId', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { vehicleType, brandId, modelId, yearId } = request.params as {
      vehicleType: string
      brandId: string
      modelId: string
      yearId: string
    }

    try {
      console.log(
        `🔍 Buscando detalhes do veículo: Tipo=${vehicleType}, ` +
        `Marca=${brandId}, Modelo=${modelId}, Ano=${yearId}`,
      )

      // ✅ Validar tipo de veículo
      const validTypes = ['cars', 'motorcycles', 'trucks']
      if (!validTypes.includes(vehicleType)) {
        return reply.status(400).send({
          error: 'Tipo de veículo inválido',
          validTypes,
        })
      }

      // 🌐 Fazer requisição para API FIPE
      const fipeUrl =
        `${env.API_FIPE_PATH}/${vehicleType}/brands/${brandId}/models/` +
        `${modelId}/years/${yearId}`

      const response = await axios.get(fipeUrl, {
        params: {
          reference: env.FIPE_REFERENCE,
        },
      })

      // 📊 Estruturar resposta
      const vehicleData = response.data

      const vehicleInfo = {
      // ✅ Dados básicos do veículo
        brand: vehicleData.brand,
        model: vehicleData.model,
        modelYear: vehicleData.modelYear,
        fuel: vehicleData.fuel,
        fuelAcronym: vehicleData.fuelAcronym,
        vehicleType: vehicleData.vehicleType,

        // 💰 Dados de preço
        price: vehicleData.price,
        codeFipe: vehicleData.codeFipe,
        referenceMonth: vehicleData.referenceMonth,

        // 📈 Histórico (se disponível)
        priceHistory: vehicleData.priceHistory || [],

        // 🔍 Metadados da consulta
        consultedAt: new Date().toISOString(),
        apiSource: 'FIPE Parallelum API v2',
      }

      console.log(
        `✅ Veículo encontrado: ${vehicleData.brand} ${vehicleData.model} ` +
        `(${vehicleData.modelYear})`,
      )
      console.log(`💰 Preço atual: ${vehicleData.price}`)

      return reply.send({
        success: true,
        data: vehicleInfo,
      })
    } catch (error: unknown) {
      console.error('❌ Erro ao buscar informações do veículo:', error)

      // 🔍 Verificar se é um erro do Axios
      if (axios.isAxiosError(error)) {
        // ✅ Agora temos tipagem correta do erro do Axios
        if (error.response?.status === 404) {
          return reply.status(404).send({
            error: 'Veículo não encontrado',
            message:
            'Combinação de marca, modelo e ano não existe na base FIPE',
          })
        }

        if (error.response?.status === 429) {
          return reply.status(429).send({
            error: 'Limite de requisições excedido',
            message: 'Aguarde alguns minutos antes de tentar novamente',
          })
        }
      }

      // 🔍 Para outros tipos de erro
      const errorMessage = error instanceof Error
        ? error.message
        : 'Erro desconhecido'

      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: 'Não foi possível consultar as informações do veículo',
        details: errorMessage,
      })
    }
  })

  // 🚗 Buscar modelos de veículos por marca e ano
  app.get('/fipe/:vehicleType/brands/:brandId/years/:yearId/models', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { vehicleType, brandId, yearId } = request.params as {
      vehicleType: string
      brandId: string
      yearId: string
    }

    try {
      console.log(
        `🔍 Buscando modelos: Tipo=${vehicleType}, Marca=${brandId}, ` +
        `Ano=${yearId}`)

      // ✅ Validar tipo de veículo
      const validTypes = ['cars', 'motorcycles', 'trucks']
      if (!validTypes.includes(vehicleType)) {
        return reply.status(400).send({
          error: 'Tipo de veículo inválido',
          validTypes,
        })
      }

      // 🌐 URL com variável de ambiente
      const fipeUrl =
        `${env.API_FIPE_PATH}/${vehicleType}/brands/${brandId}/years/` +
        `${yearId}/models`

      // 📡 Requisição para API FIPE
      const response = await axios.get(fipeUrl, {
        params: {
          reference: env.FIPE_REFERENCE,
        },
      })

      // 📊 Processar dados dos modelos
      const modelsData = response.data

      // ✅ Validar se retornou array
      if (!Array.isArray(modelsData)) {
        return reply.status(404).send({
          error: 'Nenhum modelo encontrado',
          message: 'Não existem modelos para esta marca e ano',
        })
      }

      // 📈 Estatísticas dos modelos
      const stats = {
        totalModels: modelsData.length,
        consultedAt: new Date().toISOString(),
        brandId,
        year: yearId,
        vehicleType,
      }

      console.log(
        `✅ Encontrados ${modelsData.length} modelos para marca ${brandId} ` +
        `no ano ${yearId}`,
      )

      return reply.send({
        success: true,
        data: modelsData,
        metadata: stats,
      })
    } catch (error) {
      console.error('❌ Erro ao buscar modelos por marca e ano:', error)

      // 🔍 Tratar erros específicos da API FIPE
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return reply.status(404).send({
            error: 'Modelos não encontrados',
            message: 'Não existem modelos para esta combinação de marca e ano',
          })
        }

        if (error.response?.status === 429) {
          return reply.status(429).send({
            error: 'Limite de requisições excedido',
            message: 'Aguarde alguns minutos antes de tentar novamente',
          })
        }
      }

      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar os modelos',
      })
    }
  })
}
