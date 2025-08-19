import { FastifyInstance } from 'fastify'
import { PrismaClient, VehicleType, UserProfile, Prisma } from '@prisma/client'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { vehicleEnrichmentService } from '@/services/vehicle-enrichment-service'

const prisma = new PrismaClient()

// Interfaces para tipagem correta
interface WhereCondition {
  vehicle_type?: VehicleType
  display_year?: number
  is_company_vehicle?: boolean
  fuel_acronym?: {
    contains: string
    mode: 'insensitive'
  }
  brand_name?: {
    contains: string
    mode: 'insensitive'
  }
  OR?: Array<{
    license_plate?: {
      contains: string
      mode: 'insensitive'
    }
    renavam?: {
      contains: string
      mode: 'insensitive'
    }
    brand_name?: {
      contains: string
      mode: 'insensitive'
    }
    model_name?: {
      contains: string
      mode: 'insensitive'
    }
    color?: {
      contains: string
      mode: 'insensitive'
    }
  }>
}

// Schemas de validação
const createVehicleSchema = z.object({
  license_plate: z.string().min(7).max(8),
  renavam: z.string().length(11),
  fipe_brand_code: z.number().int().positive(),
  fipe_model_code: z.number().int().positive(),
  year_id: z.string().min(1),
  vehicle_type: z.enum(['cars', 'motorcycles']),
  color: z.string().optional(),
  observations: z.string().optional().nullable(),
  purchase_date: z.string().datetime().optional().nullable(),
  purchase_value: z.number().positive().optional().nullable(),
  is_company_vehicle: z.boolean().default(false),
})

const updateVehicleSchema = createVehicleSchema.partial()

const getVehicleParamsSchema = z.object({
  id: z.string().uuid(),
})

const listVehiclesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  vehicleType: z.enum(['cars', 'motorcycles']).optional(),
  displayYear: z.coerce.number().positive().optional(),
  search: z.string().optional(),
  isCompanyVehicle: z.string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true
      if (val === 'false') return false
      return undefined
    }),
  fuelAcronym: z.string().optional(),
  brandName: z.string().optional(),
})

const addOwnershipSchema = z.object({
  userId: z.string().uuid(),
  ownershipPercentage: z.number().min(0.01).max(100),
})

const updateOwnershipSchema = z.object({
  ownershipPercentage: z.number().min(0.01).max(100),
})

export async function vehiclesRoutes(app: FastifyInstance) {
  // GET /vehicles - Listar veículos
  app.get('/vehicles', async (req, res) => {
    await authenticate(req, res)

    try {
      const {
        page,
        limit,
        vehicleType,
        displayYear,
        search,
        isCompanyVehicle,
        fuelAcronym,
        brandName,
      } = listVehiclesQuerySchema.parse(req.query)

      console.log('📋 Filtros aplicados:', {
        vehicleType,
        displayYear,
        search,
        isCompanyVehicle,
        fuelAcronym,
        brandName,
      })

      const skip = (page - 1) * limit

      // ✅ CORREÇÃO: Tipagem específica em vez de any
      const whereCondition: WhereCondition = {}

      if (vehicleType) {
        whereCondition.vehicle_type = vehicleType
      }

      if (displayYear) {
        whereCondition.display_year = displayYear
      }

      if (isCompanyVehicle !== undefined) {
        whereCondition.is_company_vehicle = isCompanyVehicle
      }

      if (fuelAcronym) {
        whereCondition.fuel_acronym = {
          contains: fuelAcronym,
          mode: 'insensitive',
        }
      }

      if (brandName) {
        whereCondition.brand_name = {
          contains: brandName,
          mode: 'insensitive',
        }
      }

      // Busca textual em múltiplos campos
      if (search) {
        whereCondition.OR = [
          { license_plate: { contains: search, mode: 'insensitive' } },
          { renavam: { contains: search, mode: 'insensitive' } },
          { brand_name: { contains: search, mode: 'insensitive' } },
          { model_name: { contains: search, mode: 'insensitive' } },
          { color: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [vehicles, total] = await Promise.all([
        prisma.vehicle.findMany({
          where: whereCondition,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            ownerships: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    profile: true,
                  },
                },
              },
            },
          },
        }),
        prisma.vehicle.count({ where: whereCondition }),
      ])

      const totalPages = Math.ceil(total / limit)

      return res.send({
        data: vehicles,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        message: `${vehicles.length} veículos encontrados`,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'Parâmetros de consulta inválidos',
          details: error.errors,
        })
      }

      return res.status(500).send({
        error: 'Erro ao listar veículos',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // GET /vehicles/:id - Buscar veículo específico
  app.get('/vehicles/:id', async (req, res) => {
    await authenticate(req, res)

    try {
      const { id } = getVehicleParamsSchema.parse(req.params)

      const vehicle = await prisma.vehicle.findUnique({
        where: { id },
        include: {
          ownerships: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profile: true,
                },
              },
            },
          },
        },
      })

      if (!vehicle) {
        return res.status(404).send({ error: 'Veículo não encontrado' })
      }

      // Calcular total de participação
      const totalOwnership = vehicle.ownerships.reduce(
        (sum, ownership) => sum + Number(ownership.ownership_percentage),
        0,
      )

      return res.send({
        data: {
          ...vehicle,
          totalOwnership,
          remainingOwnership: 100 - totalOwnership,
        },
      })
    } catch (error) {
      return res.status(400).send({
        error: 'Erro ao buscar veículo',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // POST /vehicles - Criar novo veículo com enriquecimento automático
  app.post('/vehicles', async (req, res) => {
    await authenticate(req, res)

    try {
      const data = createVehicleSchema.parse(req.body)

      console.log('🚗 Criando veículo com dados FIPE:', {
        license_plate: data.license_plate,
        fipe_brand_code: data.fipe_brand_code,
        fipe_model_code: data.fipe_model_code,
        year_id: data.year_id,
        vehicle_type: data.vehicle_type,
      })

      // Verificar se placa já existe
      const existingVehicle = await prisma.vehicle.findUnique({
        where: { license_plate: data.license_plate },
      })

      if (existingVehicle) {
        return res.status(400).send({
          error: 'Já existe um veículo cadastrado com esta placa',
        })
      }

      // Verificar se RENAVAM já existe
      const existingRenavam = await prisma.vehicle.findUnique({
        where: { renavam: data.renavam },
      })

      if (existingRenavam) {
        return res.status(400).send({
          error: 'Já existe um veículo cadastrado com este RENAVAM',
        })
      }

      // 🔍 Buscar informações enriquecidas da API FIPE
      console.log('🌐 Buscando dados FIPE...')
      const enrichedData = await vehicleEnrichmentService.enrichVehicleData(
        data.vehicle_type,
        data.fipe_brand_code,
        data.fipe_model_code,
        data.year_id,
      )

      // Criar veículo com dados enriquecidos
      const vehicle = await prisma.vehicle.create({
        data: {
          license_plate: data.license_plate,
          renavam: data.renavam,
          fipe_brand_code: data.fipe_brand_code,
          fipe_model_code: data.fipe_model_code,
          year_id: data.year_id,
          vehicle_type: data.vehicle_type as VehicleType,

          // Dados enriquecidos da API FIPE
          brand_name: enrichedData.brand_name,
          model_name: enrichedData.model_name,
          display_year: enrichedData.display_year,
          display_fuel: enrichedData.display_fuel,
          fuel_acronym: enrichedData.fuel_acronym,

          // Dados opcionais do usuário
          color: data.color,
          observations: data.observations,
          purchase_date: data.purchase_date
            ? new Date(data.purchase_date)
            : null,
          purchase_value: data.purchase_value,
          is_company_vehicle: data.is_company_vehicle,
        },
        include: {
          ownerships: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profile: true,
                },
              },
            },
          },
        },
      })

      // 💾 Salvar dados no cache FIPE
      await prisma.fipeCache.create({
        data: {
          brand_code: data.fipe_brand_code,
          model_code: data.fipe_model_code,
          year_id: data.year_id,
          fuel_acronym: enrichedData.fuel_acronym,
          vehicle_type: data.vehicle_type as VehicleType,
          fipe_value: enrichedData.current_fipe_value,
          brand_name: enrichedData.brand_name,
          model_name: enrichedData.model_name,
          model_year: enrichedData.display_year,
          fuel_name: enrichedData.display_fuel,
          code_fipe: enrichedData.code_fipe,
          reference_month: enrichedData.reference_month,
        },
      }).catch(error => {
        // Se já existe no cache, não é problema
        console.log('ℹ️ Cache FIPE já existe ou erro ao salvar:', error.message)
      })

      // 🤝 Se for veículo da empresa, criar participações automáticas para
      // sócios
      if (data.is_company_vehicle) {
        const partners = await prisma.user.findMany({
          where: {
            profile: UserProfile.PARTNER,
            is_active: true,
          },
        })

        if (partners.length > 0) {
          const equalPercentage = 100 / partners.length

          const ownerships = await Promise.all(
            partners.map(partner =>
              prisma.vehicleOwnership.create({
                data: {
                  vehicle_id: vehicle.id,
                  user_id: partner.id,
                  ownership_percentage: equalPercentage,
                },
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      profile: true,
                    },
                  },
                },
              }),
            ),
          )

          vehicle.ownerships = ownerships
        }
      }

      console.log(
        `✅ Veículo criado: ${enrichedData.brand_name} ` +
        `${enrichedData.model_name}`,
      )

      return res.status(201).send({
        data: {
          ...vehicle,
          current_fipe_value: enrichedData.current_fipe_value,
          fipe_info: {
            code_fipe: enrichedData.code_fipe,
            reference_month: enrichedData.reference_month,
            price:
              `R$ ${enrichedData.current_fipe_value.toLocaleString('pt-BR')}`,
          },
        },
        message: data.is_company_vehicle
          ? 'Veículo da empresa criado com participações automáticas para' +
            'todos os sócios'
          : 'Veículo criado com sucesso',
      })
    } catch (error) {
      console.error('❌ Erro ao criar veículo:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }

      return res.status(400).send({
        error: 'Erro ao criar veículo',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // PUT /vehicles/:id - Atualizar veículo
  app.put('/vehicles/:id', async (req, res) => {
    await authenticate(req, res)

    try {
      const { id } = getVehicleParamsSchema.parse(req.params)
      const data = updateVehicleSchema.parse(req.body)

      console.log(`🔄 Atualizando veículo ${id}`)

      // Verificar se veículo existe
      const existingVehicle = await prisma.vehicle.findUnique({
        where: { id },
      })

      if (!existingVehicle) {
        return res.status(404).send({ error: 'Veículo não encontrado' })
      }

      // Verificar duplicatas
      if (data.license_plate && data.license_plate !==
        existingVehicle.license_plate) {
        const duplicatePlate = await prisma.vehicle.findUnique({
          where: { license_plate: data.license_plate },
        })
        if (duplicatePlate) {
          return res.status(400).send({
            error: 'Já existe um veículo cadastrado com esta placa',
          })
        }
      }

      if (data.renavam && data.renavam !== existingVehicle.renavam) {
        const duplicateRenavam = await prisma.vehicle.findUnique({
          where: { renavam: data.renavam },
        })
        if (duplicateRenavam) {
          return res.status(400).send({
            error: 'Já existe um veículo cadastrado com este RENAVAM',
          })
        }
      }

      // Verificar se códigos FIPE mudaram
      const fipeCodesChanged =
        (data.fipe_brand_code && data.fipe_brand_code !==
          existingVehicle.fipe_brand_code) ||
        (data.fipe_model_code && data.fipe_model_code !==
          existingVehicle.fipe_model_code) ||
        (data.year_id && data.year_id !== existingVehicle.year_id) ||
        (data.vehicle_type && data.vehicle_type !==
          existingVehicle.vehicle_type)

      let enrichedData = null

      // Se códigos FIPE mudaram, buscar novos dados
      if (fipeCodesChanged) {
        console.log('🌐 Códigos FIPE alterados, buscando novos dados...')

        const brandCode =
          data.fipe_brand_code || existingVehicle.fipe_brand_code
        const modelCode =
          data.fipe_model_code || existingVehicle.fipe_model_code
        const yearId = data.year_id || existingVehicle.year_id
        const vehicleType = data.vehicle_type || existingVehicle.vehicle_type

        enrichedData = await vehicleEnrichmentService.enrichVehicleData(
          vehicleType as 'cars' | 'motorcycles',
          brandCode,
          modelCode,
          yearId,
        )
      }

      // ✅ CORREÇÃO FINAL: Usar tipo Prisma e Object.assign
      const updateData: Prisma.VehicleUpdateInput = {}

      // Atribuir campos básicos usando Object.assign para evitar problemas de
      // tipo
      Object.assign(updateData, {
        ...(data.license_plate !== undefined &&
          { license_plate: data.license_plate }),
        ...(data.renavam !== undefined && { renavam: data.renavam }),
        ...(data.fipe_brand_code !== undefined &&
          { fipe_brand_code: data.fipe_brand_code }),
        ...(data.fipe_model_code !== undefined &&
          { fipe_model_code: data.fipe_model_code }),
        ...(data.year_id !== undefined && { year_id: data.year_id }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.observations !== undefined &&
          { observations: data.observations }),
        ...(data.purchase_value !== undefined &&
          { purchase_value: data.purchase_value }),
        ...(data.is_company_vehicle !== undefined &&
          { is_company_vehicle: data.is_company_vehicle }),
      })

      // Conversões específicas
      if (data.vehicle_type !== undefined) {
        updateData.vehicle_type = data.vehicle_type as VehicleType
      }

      if (data.purchase_date !== undefined) {
        updateData.purchase_date = data.purchase_date
          ? new Date(data.purchase_date)
          : null
      }

      // Dados enriquecidos (se códigos FIPE mudaram)
      if (enrichedData) {
        Object.assign(updateData, {
          brand_name: enrichedData.brand_name,
          model_name: enrichedData.model_name,
          display_year: enrichedData.display_year,
          display_fuel: enrichedData.display_fuel,
          fuel_acronym: enrichedData.fuel_acronym,
        })
      }

      // Atualizar veículo
      const updatedVehicle = await prisma.vehicle.update({
        where: { id },
        data: updateData,
        include: {
          ownerships: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profile: true,
                },
              },
            },
          },
        },
      })

      // Atualizar cache FIPE se necessário
      if (enrichedData) {
        await prisma.fipeCache.upsert({
          where: {
            brand_code_model_code_year_id_fuel_acronym_vehicle_type: {
              brand_code: updatedVehicle.fipe_brand_code,
              model_code: updatedVehicle.fipe_model_code,
              year_id: updatedVehicle.year_id,
              fuel_acronym: enrichedData.fuel_acronym,
              vehicle_type: updatedVehicle.vehicle_type,
            },
          },
          create: {
            brand_code: updatedVehicle.fipe_brand_code,
            model_code: updatedVehicle.fipe_model_code,
            year_id: updatedVehicle.year_id,
            fuel_acronym: enrichedData.fuel_acronym,
            vehicle_type: updatedVehicle.vehicle_type,
            fipe_value: enrichedData.current_fipe_value,
            brand_name: enrichedData.brand_name,
            model_name: enrichedData.model_name,
            model_year: enrichedData.display_year,
            fuel_name: enrichedData.display_fuel,
            code_fipe: enrichedData.code_fipe,
            reference_month: enrichedData.reference_month,
          },
          update: {
            fipe_value: enrichedData.current_fipe_value,
            brand_name: enrichedData.brand_name,
            model_name: enrichedData.model_name,
            model_year: enrichedData.display_year,
            fuel_name: enrichedData.display_fuel,
            code_fipe: enrichedData.code_fipe,
            reference_month: enrichedData.reference_month,
            updated_at: new Date(),
          },
        })
      }

      return res.send({
        data: {
          ...updatedVehicle,
          current_fipe_value: enrichedData?.current_fipe_value,
          fipe_info: enrichedData
            ? {
                code_fipe: enrichedData.code_fipe,
                reference_month: enrichedData.reference_month,
                price:
                `R$ ${enrichedData.current_fipe_value.toLocaleString('pt-BR')}`,
              }
            : undefined,
        },
        message: 'Veículo atualizado com sucesso',
      })
    } catch (error) {
      console.error('❌ Erro ao atualizar veículo:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }

      return res.status(400).send({
        error: 'Erro ao atualizar veículo',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // DELETE /vehicles/:id - Deletar veículo
  app.delete('/vehicles/:id', async (req, res) => {
    await authenticate(req, res)

    try {
      const { id } = getVehicleParamsSchema.parse(req.params)

      // Verificar se veículo existe
      const existingVehicle = await prisma.vehicle.findUnique({
        where: { id },
        include: { ownerships: true },
      })

      if (!existingVehicle) {
        return res.status(404).send({ error: 'Veículo não encontrado' })
      }

      // Verificar se tem proprietários
      if (existingVehicle.ownerships.length > 0) {
        return res.status(400).send({
          error: 'Não é possível deletar veículo com proprietários',
          message: 'Remova todos os proprietários antes de deletar o veículo',
        })
      }

      await prisma.vehicle.delete({
        where: { id },
      })

      console.log(`✅ Veículo ${existingVehicle.license_plate} deletado`)

      return res.send({
        message: 'Veículo deletado com sucesso',
      })
    } catch (error) {
      return res.status(400).send({
        error: 'Erro ao deletar veículo',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // POST /vehicles/:id/owners - Adicionar proprietário ao veículo
  app.post('/vehicles/:id/owners', async (req, res) => {
    await authenticate(req, res)

    try {
      const { id } = getVehicleParamsSchema.parse(req.params)
      const { userId, ownershipPercentage } = addOwnershipSchema.parse(req.body)

      console.log(
        `👥 Adicionando proprietário ${userId} ao veículo ${id} com ` +
        `${ownershipPercentage}%`,
      )

      // Verificar se veículo existe
      const vehicle = await prisma.vehicle.findUnique({
        where: { id },
        include: { ownerships: true },
      })

      if (!vehicle) {
        return res.status(404).send({ error: 'Veículo não encontrado' })
      }

      // Verificar se usuário existe
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        return res.status(404).send({ error: 'Usuário não encontrado' })
      }

      // Verificar se já existe ownership para este usuário neste veículo
      const existingOwnership = await prisma.vehicleOwnership.findUnique({
        where: {
          vehicle_id_user_id: {
            vehicle_id: id,
            user_id: userId,
          },
        },
      })

      if (existingOwnership) {
        return res.status(400).send({
          error: 'Este usuário já possui participação neste veículo',
        })
      }

      // Calcular participação total atual
      const currentTotalOwnership = vehicle.ownerships.reduce(
        (sum, ownership) => sum + Number(ownership.ownership_percentage),
        0,
      )

      // Verificar se não ultrapassaria 100%
      if (currentTotalOwnership + ownershipPercentage > 100) {
        return res.status(400).send({
          error: 'Participação excederia 100%',
          currentTotal: currentTotalOwnership,
          remaining: 100 - currentTotalOwnership,
          requested: ownershipPercentage,
        })
      }

      const newOwnership = await prisma.vehicleOwnership.create({
        data: {
          vehicle_id: id,
          user_id: userId,
          ownership_percentage: ownershipPercentage,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profile: true,
            },
          },
        },
      })

      console.log(
        `✅ Proprietário ${user.name} adicionado com ${ownershipPercentage}%`)

      return res.status(201).send({
        data: newOwnership,
        message: 'Proprietário adicionado com sucesso',
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }

      return res.status(400).send({
        error: 'Erro ao adicionar proprietário',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // PUT /vehicles/:id/owners/:userId - Atualizar participação
  app.put('/vehicles/:id/owners/:userId', async (req, res) => {
    await authenticate(req, res)

    try {
      const { id, userId } = req.params as { id: string; userId: string }
      const { ownershipPercentage } = updateOwnershipSchema.parse(req.body)

      // Verificar se ownership existe
      const existingOwnership = await prisma.vehicleOwnership.findUnique({
        where: {
          vehicle_id_user_id: {
            vehicle_id: id,
            user_id: userId,
          },
        },
      })

      if (!existingOwnership) {
        return res.status(404).send({ error: 'Participação não encontrada' })
      }

      // Calcular participação total sem a atual
      const vehicle = await prisma.vehicle.findUnique({
        where: { id },
        include: { ownerships: true },
      })

      const otherOwnershipsTotal = vehicle!.ownerships
        .filter(o => o.user_id !== userId)
        .reduce(
          (sum, ownership) => sum + Number(ownership.ownership_percentage), 0)

      // Verificar se não ultrapassaria 100%
      if (otherOwnershipsTotal + ownershipPercentage > 100) {
        return res.status(400).send({
          error: 'Participação excederia 100%',
          otherOwnersTotal: otherOwnershipsTotal,
          remaining: 100 - otherOwnershipsTotal,
          requested: ownershipPercentage,
        })
      }

      const updatedOwnership = await prisma.vehicleOwnership.update({
        where: {
          vehicle_id_user_id: {
            vehicle_id: id,
            user_id: userId,
          },
        },
        data: { ownership_percentage: ownershipPercentage },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profile: true,
            },
          },
        },
      })

      return res.send({
        data: updatedOwnership,
        message: 'Participação atualizada com sucesso',
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }

      return res.status(400).send({
        error: 'Erro ao atualizar participação',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // DELETE /vehicles/:id/owners/:userId - Remover proprietário
  app.delete('/vehicles/:id/owners/:userId', async (req, res) => {
    await authenticate(req, res)

    try {
      const { id, userId } = req.params as { id: string; userId: string }

      // Verificar se ownership existe
      const existingOwnership = await prisma.vehicleOwnership.findUnique({
        where: {
          vehicle_id_user_id: {
            vehicle_id: id,
            user_id: userId,
          },
        },
      })

      if (!existingOwnership) {
        return res.status(404).send({ error: 'Participação não encontrada' })
      }

      await prisma.vehicleOwnership.delete({
        where: {
          vehicle_id_user_id: {
            vehicle_id: id,
            user_id: userId,
          },
        },
      })

      return res.send({
        message: 'Proprietário removido com sucesso',
      })
    } catch (error) {
      return res.status(400).send({
        error: 'Erro ao remover proprietário',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // GET /vehicles/stats - Estatísticas dos veículos
  app.get('/vehicles/stats', async (req, res) => {
    await authenticate(req, res)

    try {
      const [
        totalVehicles,
        vehiclesByType,
        vehiclesWithOwners,
        vehiclesWithoutOwners,
        companyVehicles,
        personalVehicles,
        vehiclesByYear,
        vehiclesByFuel,
      ] = await Promise.all([
        prisma.vehicle.count(),
        prisma.vehicle.groupBy({
          by: ['vehicle_type'],
          _count: { id: true },
        }),
        prisma.vehicle.count({
          where: {
            ownerships: {
              some: {},
            },
          },
        }),
        prisma.vehicle.count({
          where: {
            ownerships: {
              none: {},
            },
          },
        }),
        prisma.vehicle.count({
          where: { is_company_vehicle: true },
        }),
        prisma.vehicle.count({
          where: { is_company_vehicle: false },
        }),
        prisma.vehicle.groupBy({
          by: ['display_year'],
          _count: { id: true },
          orderBy: { display_year: 'desc' },
        }),
        prisma.vehicle.groupBy({
          by: ['fuel_acronym'],
          _count: { id: true },
        }),
      ])

      // Processar dados para formato mais legível
      const vehiclesByTypeFormatted = vehiclesByType.reduce((acc, item) => {
        acc[item.vehicle_type] = item._count.id
        return acc
      }, {} as Record<string, number>)

      const vehiclesByYearFormatted = vehiclesByYear.reduce((acc, item) => {
        if (item.display_year) {
          acc[item.display_year] = item._count.id
        }
        return acc
      }, {} as Record<number, number>)

      const vehiclesByFuelFormatted = vehiclesByFuel.reduce((acc, item) => {
        if (item.fuel_acronym) {
          acc[item.fuel_acronym] = item._count.id
        }
        return acc
      }, {} as Record<string, number>)

      return res.send({
        data: {
          total_vehicles: totalVehicles,
          vehicles_with_owners: vehiclesWithOwners,
          vehicles_without_owners: vehiclesWithoutOwners,
          company_vehicles: companyVehicles,
          personal_vehicles: personalVehicles,
          vehicles_by_type: vehiclesByTypeFormatted,
          vehicles_by_year: vehiclesByYearFormatted,
          vehicles_by_fuel: vehiclesByFuelFormatted,
          ownership_stats: {
            with_owners_percentage: totalVehicles > 0
              ? Math.round((vehiclesWithOwners / totalVehicles) * 100)
              : 0,
            company_percentage: totalVehicles > 0
              ? Math.round((companyVehicles / totalVehicles) * 100)
              : 0,
          },
        },
        message: 'Estatísticas de veículos calculadas',
        calculated_at: new Date().toISOString(),
      })
    } catch (error) {
      return res.status(500).send({
        error: 'Erro ao buscar estatísticas dos veículos',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })
}
