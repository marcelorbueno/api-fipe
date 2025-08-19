import { FastifyInstance } from 'fastify'
import { PrismaClient, VehicleType } from '@prisma/client'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'

const prisma = new PrismaClient()

// Schemas de validação corrigidos
const createVehicleSchema = z.object({
  license_plate: z.string().min(7).max(8),
  renavam: z.string().length(11),
  fipe_brand_code: z.number().int().positive(),
  fipe_model_code: z.number().int().positive(),
  year_id: z.string().min(1),
  fuel_acronym: z.string().min(1).max(3),
  vehicle_type: z.enum(['cars', 'motorcycles']),
  display_year: z.number().int().positive().optional(),
  display_fuel: z.string().optional(),
  brand_name: z.string().optional(),
  model_name: z.string().optional(),
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

// Schema de listagem corrigido
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
  // Novos filtros úteis
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
  // GET /vehicles - Listar veículos (CORRIGIDO)
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

      // Interface corrigida para whereCondition
      interface WhereCondition {
        vehicle_type?: VehicleType
        display_year?: number
        is_company_vehicle?: boolean
        fuel_acronym?: { contains: string; mode: 'insensitive' }
        brand_name?: { contains: string; mode: 'insensitive' }
        OR?: Array<{
          license_plate?: { contains: string; mode: 'insensitive' }
          renavam?: { contains: string; mode: 'insensitive' }
          brand_name?: { contains: string; mode: 'insensitive' }
          model_name?: { contains: string; mode: 'insensitive' }
        }>
      }

      const whereCondition: WhereCondition = {}

      // Aplicar filtros
      if (vehicleType) {
        whereCondition.vehicle_type = vehicleType as VehicleType
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

      // Busca geral por texto
      if (search) {
        whereCondition.OR = [
          { license_plate: { contains: search, mode: 'insensitive' } },
          { renavam: { contains: search, mode: 'insensitive' } },
          { brand_name: { contains: search, mode: 'insensitive' } },
          { model_name: { contains: search, mode: 'insensitive' } },
        ]
      }

      console.log('🔍 Where condition:', JSON.stringify(whereCondition, null, 2))

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

      console.log(`✅ Encontrados ${vehicles.length} veículos de ${total} total`)

      return res.send({
        data: vehicles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        filters: {
          vehicleType,
          displayYear,
          search,
          isCompanyVehicle,
          fuelAcronym,
          brandName,
        },
      })
    } catch (error) {
      console.error('❌ Erro ao buscar veículos:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'Parâmetros de consulta inválidos',
          details: error.errors,
        })
      }

      return res.status(400).send({
        error: 'Erro ao buscar veículos',
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

  // POST /vehicles - Criar novo veículo (MELHORADO)
  app.post('/vehicles', async (req, res) => {
    await authenticate(req, res)

    try {
      const data = createVehicleSchema.parse(req.body)

      console.log('🚗 Criando veículo:', {
        license_plate: data.license_plate,
        year_id: data.year_id,
        fuel_acronym: data.fuel_acronym,
        is_company_vehicle: data.is_company_vehicle,
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

      // Se display_year não foi fornecido, extrair do year_id
      let displayYear = data.display_year
      if (!displayYear && data.year_id) {
        const yearMatch = data.year_id.match(/^(\d{4})/)
        if (yearMatch) {
          displayYear = parseInt(yearMatch[1])
        }
      }

      // Se display_fuel não foi fornecido, converter do fuel_acronym
      let displayFuel = data.display_fuel
      if (!displayFuel && data.fuel_acronym) {
        const fuelMap: Record<string, string> = {
          G: 'Gasolina',
          D: 'Diesel',
          E: 'Etanol',
          F: 'Flex',
        }
        displayFuel =
          fuelMap[data.fuel_acronym.toUpperCase()] || data.fuel_acronym
      }

      const vehicle = await prisma.vehicle.create({
        data: {
          ...data,
          display_year: displayYear,
          display_fuel: displayFuel,
          purchase_date: data.purchase_date
            ? new Date(data.purchase_date)
            : null,
          vehicle_type: data.vehicle_type as VehicleType,
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

      // Se for veículo da empresa, automaticamente criar participações para
      // todos os sócios
      if (data.is_company_vehicle) {
        const partners = await prisma.user.findMany({
          where: {
            profile: 'PARTNER',
            is_active: true,
          },
          select: { id: true, name: true },
        })

        if (partners.length > 0) {
          const ownershipPercentage = 100 / partners.length

          await Promise.all(
            partners.map(partner =>
              prisma.vehicleOwnership.create({
                data: {
                  vehicle_id: vehicle.id,
                  user_id: partner.id,
                  ownership_percentage: ownershipPercentage,
                },
              }),
            ),
          )

          console.log(
            `✅ Veículo da empresa: criadas ${partners.length} participações ` +
            `de ${ownershipPercentage.toFixed(2)}% cada`,
          )
        } else {
          console.log(
            '⚠️ Nenhum sócio ativo encontrado para criar participações ' +
            'automáticas',
          )
        }
      }

      return res.status(201).send({
        data: vehicle,
        message: data.is_company_vehicle
          ? 'Veículo da empresa criado com participações automáticas para ' +
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

      // Verificar duplicatas se placa ou renavam estão sendo alterados
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

      // Atualizar campos calculados se necessário
      const updateData = { ...data }

      if (data.year_id && !data.display_year) {
        const yearMatch = data.year_id.match(/^(\d{4})/)
        if (yearMatch) {
          updateData.display_year = parseInt(yearMatch[1])
        }
      }

      if (data.fuel_acronym && !data.display_fuel) {
        const fuelMap: Record<string, string> = {
          G: 'Gasolina',
          D: 'Diesel',
          E: 'Etanol',
          F: 'Flex',
        }
        updateData.display_fuel =
          fuelMap[data.fuel_acronym.toUpperCase()] || data.fuel_acronym
      }

      const updatedVehicle = await prisma.vehicle.update({
        where: { id },
        data: {
          ...updateData,
          purchase_date: data.purchase_date
            ? new Date(data.purchase_date)
            : undefined,
          vehicle_type: data.vehicle_type
            ? (data.vehicle_type as VehicleType)
            : undefined,
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

      return res.send({
        data: updatedVehicle,
        message: 'Veículo atualizado com sucesso',
      })
    } catch (error) {
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

  // GET /vehicles/stats - Estatísticas dos veículos (MELHORADO)
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

      return res.send({
        data: {
          totalVehicles,
          vehiclesByType: vehiclesByType.reduce((acc, item) => {
            acc[item.vehicle_type] = item._count.id
            return acc
          }, {} as Record<string, number>),
          vehiclesWithOwners,
          vehiclesWithoutOwners,
          companyVehicles,
          personalVehicles,
          vehiclesByYear: vehiclesByYear.reduce((acc, item) => {
            if (item.display_year) {
              acc[item.display_year] = item._count.id
            }
            return acc
          }, {} as Record<number, number>),
          vehiclesByFuel: vehiclesByFuel.reduce((acc, item) => {
            acc[item.fuel_acronym] = item._count.id
            return acc
          }, {} as Record<string, number>),
        },
      })
    } catch (error) {
      return res.status(500).send({
        error: 'Erro ao buscar estatísticas',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })
}
