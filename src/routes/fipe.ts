import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { env } from '../env'
import { fetchWithProxy } from '@/utils/httpClient'
import axiosConfigured from '../config/axios'

// Schema para validar o tipo de veículo (apenas carros e motos)
const vehicleTypeSchema = z.enum(['cars', 'motorcycles'])

// Interface para o retorno da API FIPE
interface FipeBrand {
  code: string
  name: string
}

// Interface para os parâmetros da rota
interface VehicleTypeParams {
  vehicleType: string
}

export async function fipeRoutes(app: FastifyInstance) {
  // GET /fipe/:vehicleType/brands - Listar marcas por tipo de veículo
  app.get<{ Params: VehicleTypeParams }>(
    '/fipe/:vehicleType/brands',
    {
      preHandler: [app.authenticate],
    },
    async (request: FastifyRequest<
      { Params: VehicleTypeParams }>, reply: FastifyReply) => {
      try {
        const { vehicleType } = request.params

        // Validar tipo de veículo
        const validVehicleType = vehicleTypeSchema.parse(vehicleType)

        const url = `${
          env.API_FIPE_PATH}/${validVehicleType}/brands?reference=278`
        console.log('🚀 Fazendo requisição para:', url)

        // Fazer requisição para a API FIPE com token
        const response = await fetchWithProxy(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Subscription-Token': env.FIPE_SUBSCRIPTION_TOKEN,
          },
        })

        console.log('📊 Status da resposta:', response.status)

        if (!response.ok) {
          console.error(
            '❌ Erro na API FIPE:', response.status, response.statusText)
          return reply.status(502).send({
            error: 'Erro ao consultar API FIPE',
            status: response.status,
            statusText: response.statusText,
          })
        }

        const brands: FipeBrand[] = await response.json()
        console.log('✅ Sucesso! Recebidas', brands.length, 'marcas')

        return reply.send({
          vehicle_type: validVehicleType,
          total_brands: brands.length,
          brands,
        })
      } catch (error) {
        console.error('❌ Erro na requisição:', error)

        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Tipo de veículo inválido',
            valid_types: ['cars', 'motorcycles'],
          })
        }

        return reply.status(500).send({
          error: 'Erro interno do servidor',
          details: error instanceof Error
            ? error.message
            : 'Erro desconhecido',
        })
      }
    },
  )

  // GET /fipe/vehicle-types - Listar tipos disponíveis
  app.get(
    '/fipe/vehicle-types',
    {
      preHandler: [app.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        vehicle_types: [
          {
            code: 'cars',
            name: 'Carros',
            description: 'Automóveis de passeio',
          },
          {
            code: 'motorcycles',
            name: 'Motocicletas',
            description: 'Motos e ciclomotores',
          },
        ],
      })
    },
  )

  // Adicione este endpoint no final do arquivo fipeRoutes
  app.get('/fipe/test-connection',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        console.log('🔧 Testando configurações de proxy com axios...')
        console.log('HTTP_PROXY:', process.env.HTTP_PROXY)
        console.log('HTTPS_PROXY:', process.env.HTTPS_PROXY)

        // Teste com httpbin usando axios configurado
        const response = await axiosConfigured.get('https://httpbin.org/ip', {
          headers: { Accept: 'application/json' },
        })

        console.log('✅ Teste de conectividade OK:', response.data)
        return reply.send({
          status: 'success',
          message: 'Conectividade com proxy OK via axios',
          data: response.data,
        })
      } catch (error) {
        console.error('❌ Teste de conectividade falhou:', error)
        return reply.status(500).send({
          error: 'Teste de conectividade falhou',
          details: error instanceof Error
            ? error.message
            : 'Erro desconhecido',
        })
      }
    })
}
