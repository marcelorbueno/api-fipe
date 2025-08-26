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
  fuel_acronym: z.string().min(1).max(3).optional(),
  vehicle_type: z.enum(['cars', 'motorcycles']),
  display_year: z.number().int().positive().optional(),
  display_fuel: z.string().optional(),
  brand_name: z.string().optional(),
  model_name: z.string().optional(),
  color: z.string().optional(),
  observations: z.string().optional().nullable(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Data deve estar no formato YYYY-MM-DD',
  }).optional().nullable(),
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
      const queryParams = listVehiclesQuerySchema.parse(req.query)
      const {
        page,
        limit,
        vehicleType,
        displayYear,
        search,
        fuelAcronym,
        brandName,
      } = queryParams

      const isCompanyVehicle = queryParams.isCompanyVehicle

      console.log('Filtros aplicados:', {
        vehicleType,
        displayYear,
        search,
        isCompanyVehicle,
        fuelAcronym,
        brandName,
      })

      const skip = (page - 1) * limit

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

      // Filtro de busca em múltiplos campos
      if (search) {
        whereCondition.OR = [
          {
            license_plate: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            renavam: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            brand_name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            model_name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ]
      }

      // Buscar veículos com paginação
      const [vehicles, totalCount] = await Promise.all([
        prisma.vehicle.findMany({
          where: whereCondition,
          skip,
          take: limit,
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
          orderBy: {
            created_at: 'desc',
          },
        }),
        prisma.vehicle.count({
          where: whereCondition,
        }),
      ])

      const totalPages = Math.ceil(totalCount / limit)
      const hasNextPage = page < totalPages
      const hasPreviousPage = page > 1

      console.log(
        `Listados ${vehicles.length}/${totalCount} veículos ` +
        `(página ${page}/${totalPages})`,
      )

      return res.send({
        data: vehicles,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
        filters: {
          vehicleType,
          displayYear,
          search,
          isCompanyVehicle,
          fuelAcronym,
          brandName,
        },
        message: `${vehicles.length} veículos encontrados`,
      })
    } catch (error) {
      console.error('Erro ao listar veículos:', error)

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

  // POST /vehicles - Criar novo veículo
  app.post('/vehicles', async (req, res) => {
    await authenticate(req, res)

    try {
      const data = createVehicleSchema.parse(req.body)

      console.log('Criando veículo:', {
        license_plate: data.license_plate,
        year_id: data.year_id,
        fuel_acronym: data.fuel_acronym,
        is_company_vehicle: data.is_company_vehicle,
        purchase_date: data.purchase_date,
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
      let displayFuel: string | undefined = data.display_fuel
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
          license_plate: data.license_plate,
          renavam: data.renavam,
          fipe_brand_code: data.fipe_brand_code,
          fipe_model_code: data.fipe_model_code,
          year_id: data.year_id,
          fuel_acronym: data.fuel_acronym || null,
          vehicle_type: data.vehicle_type as VehicleType,
          display_year: displayYear || undefined,
          display_fuel: displayFuel || undefined,
          brand_name: data.brand_name || undefined,
          model_name: data.model_name || undefined,
          color: data.color || undefined,
          observations: data.observations || undefined,
          purchase_date: data.purchase_date
            ? new Date(data.purchase_date + 'T00:00:00.000Z')
            : undefined,
          purchase_value: data.purchase_value || undefined,
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
            `Veículo da empresa: criadas ${partners.length} participações ` +
            `de ${ownershipPercentage.toFixed(2)}% cada`,
          )
        } else {
          console.log(
            'Nenhum sócio ativo encontrado para criar participações ' +
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
      console.error('Erro ao criar veículo:', error)

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

      console.log(`Atualizando veículo ${id}:`, data)

      // Verificar se o veículo existe
      const existingVehicle = await prisma.vehicle.findUnique({
        where: { id },
      })

      if (!existingVehicle) {
        return res.status(404).send({
          error: 'Veículo não encontrado',
        })
      }

      // Verificar conflitos de placa (se fornecida)
      if (data.license_plate && data.license_plate !==
        existingVehicle.license_plate) {
        const plateConflict = await prisma.vehicle.findUnique({
          where: { license_plate: data.license_plate },
        })

        if (plateConflict) {
          return res.status(400).send({
            error: 'Já existe um veículo cadastrado com esta placa',
          })
        }
      }

      // Verificar conflitos de RENAVAM (se fornecido)
      if (data.renavam && data.renavam !== existingVehicle.renavam) {
        const renavamConflict = await prisma.vehicle.findUnique({
          where: { renavam: data.renavam },
        })

        if (renavamConflict) {
          return res.status(400).send({
            error: 'Já existe um veículo cadastrado com este RENAVAM',
          })
        }
      }

      // Preparar dados para atualização
      let displayYear = data.display_year
      if (!displayYear && data.year_id) {
        const yearMatch = data.year_id.match(/^(\d{4})/)
        if (yearMatch) {
          displayYear = parseInt(yearMatch[1])
        }
      }

      let displayFuel: string | undefined = data.display_fuel
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

      const vehicle = await prisma.vehicle.update({
        where: { id },
        data: {
          license_plate: data.license_plate,
          renavam: data.renavam,
          fipe_brand_code: data.fipe_brand_code,
          fipe_model_code: data.fipe_model_code,
          year_id: data.year_id,
          fuel_acronym: data.fuel_acronym !== undefined
            ? data.fuel_acronym || null
            : existingVehicle.fuel_acronym,
          vehicle_type: data.vehicle_type
            ? data.vehicle_type as VehicleType
            : existingVehicle.vehicle_type,
          display_year: displayYear || existingVehicle.display_year,
          display_fuel: displayFuel || existingVehicle.display_fuel,
          brand_name: data.brand_name !== undefined
            ? data.brand_name
            : existingVehicle.brand_name,
          model_name: data.model_name !== undefined
            ? data.model_name
            : existingVehicle.model_name,
          color: data.color !== undefined
            ? data.color
            : existingVehicle.color,
          observations: data.observations !== undefined
            ? data.observations
            : existingVehicle.observations,
          purchase_date: data.purchase_date !== undefined
            ? data.purchase_date
              ? new Date(data.purchase_date + 'T00:00:00.000Z')
              : null
            : existingVehicle.purchase_date,
          purchase_value: data.purchase_value !== undefined
            ? data.purchase_value
            : existingVehicle.purchase_value,
          is_company_vehicle: data.is_company_vehicle !== undefined
            ? data.is_company_vehicle
            : existingVehicle.is_company_vehicle,
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
        data: vehicle,
        message: 'Veículo atualizado com sucesso',
      })
    } catch (error) {
      console.error('Erro ao atualizar veículo:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }

      return res.status(500).send({
        error: 'Erro ao atualizar veículo',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // GET /vehicles/:id - Obter veículo por ID
  app.get('/vehicles/:id', async (req, res) => {
    await authenticate(req, res)

    try {
      const { id } = getVehicleParamsSchema.parse(req.params)

      console.log(`Buscando veículo: ${id}`)

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
        return res.status(404).send({
          error: 'Veículo não encontrado',
        })
      }

      console.log(`Veículo encontrado: ${vehicle.license_plate}`)

      return res.send({
        data: vehicle,
        message: 'Veículo encontrado com sucesso',
      })
    } catch (error) {
      console.error('Erro ao buscar veículo:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'ID inválido',
          details: error.errors,
        })
      }

      return res.status(500).send({
        error: 'Erro ao buscar veículo',
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

      console.log(`Deletando veículo: ${id}`)

      // Verificar se o veículo existe
      const existingVehicle = await prisma.vehicle.findUnique({
        where: { id },
        include: {
          ownerships: true,
        },
      })

      if (!existingVehicle) {
        return res.status(404).send({
          error: 'Veículo não encontrado',
        })
      }

      // Deletar o veículo (cascade vai deletar as participações)
      await prisma.vehicle.delete({
        where: { id },
      })

      console.log(
        `Veículo ${existingVehicle.license_plate} deletado com sucesso ` +
        `(${existingVehicle.ownerships.length} participações removidas)`,
      )

      return res.send({
        message:
          `Veículo ${existingVehicle.license_plate} deletado com sucesso`,
        deleted_ownerships: existingVehicle.ownerships.length,
      })
    } catch (error) {
      console.error('Erro ao deletar veículo:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'ID inválido',
          details: error.errors,
        })
      }

      return res.status(500).send({
        error: 'Erro ao deletar veículo',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // POST /vehicles/:id/ownership - Adicionar proprietário ao veículo
  app.post('/vehicles/:id/ownership', async (req, res) => {
    await authenticate(req, res)

    try {
      const { id } = getVehicleParamsSchema.parse(req.params)
      const ownershipData = addOwnershipSchema.parse(req.body)

      console.log(`Adicionando participação ao veículo ${id}:`, ownershipData)

      // Verificar se o veículo existe
      const vehicle = await prisma.vehicle.findUnique({
        where: { id },
      })

      if (!vehicle) {
        return res.status(404).send({
          error: 'Veículo não encontrado',
        })
      }

      // Verificar se o usuário existe
      const user = await prisma.user.findUnique({
        where: { id: ownershipData.userId },
      })

      if (!user) {
        return res.status(404).send({
          error: 'Usuário não encontrado',
        })
      }

      // Verificar se já existe participação deste usuário neste veículo
      const existingOwnership = await prisma.vehicleOwnership.findUnique({
        where: {
          vehicle_id_user_id: {
            vehicle_id: id,
            user_id: ownershipData.userId,
          },
        },
      })

      if (existingOwnership) {
        return res.status(400).send({
          error: 'Usuário já possui participação neste veículo',
        })
      }

      // Verificar se a soma das participações não ultrapassa 100%
      const totalOwnership = await prisma.vehicleOwnership.aggregate({
        where: { vehicle_id: id },
        _sum: { ownership_percentage: true },
      })

      const currentTotal = Number(totalOwnership._sum.ownership_percentage || 0)
      const newTotal = currentTotal + ownershipData.ownershipPercentage

      if (newTotal > 100) {
        return res.status(400).send({
          error:
            `A soma das participações seria ${newTotal}%, ultrapassando ` +
            `100%. Participação atual total: ${currentTotal}%`,
        })
      }

      // Criar participação
      const ownership = await prisma.vehicleOwnership.create({
        data: {
          vehicle_id: id,
          user_id: ownershipData.userId,
          ownership_percentage: ownershipData.ownershipPercentage,
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
        `Participação criada: ${user.name} - ` +
        `${ownershipData.ownershipPercentage}% do veículo ` +
        `${vehicle.license_plate}`,
      )

      return res.status(201).send({
        data: ownership,
        message:
          `Participação de ${ownershipData.ownershipPercentage}% adicionada ` +
          `para ${user.name}`,
      })
    } catch (error) {
      console.error('Erro ao adicionar participação:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }

      return res.status(500).send({
        error: 'Erro ao adicionar participação',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // PUT /vehicles/:id/ownership/:userId - Alterar participação do veículo
  app.put('/vehicles/:id/ownership/:userId', async (req, res) => {
    await authenticate(req, res)

    try {
      const { id, userId } = z.object({
        id: z.string().uuid(),
        userId: z.string().uuid(),
      }).parse(req.params)

      const ownershipData = updateOwnershipSchema.parse(req.body)

      console.log(
        `Alterando participação do usuário ${userId} no veículo ${id}:`,
        ownershipData,
      )

      // Verificar se a participação existe
      const existingOwnership = await prisma.vehicleOwnership.findUnique({
        where: {
          vehicle_id_user_id: {
            vehicle_id: id,
            user_id: userId,
          },
        },
        include: {
          user: true,
          vehicle: true,
        },
      })

      if (!existingOwnership) {
        return res.status(404).send({
          error: 'Participação não encontrada',
        })
      }

      // Verificar se a nova participação não faz ultrapassar 100%
      const totalOwnership = await prisma.vehicleOwnership.aggregate({
        where: {
          vehicle_id: id,
          user_id: { not: userId }, // Excluir o usuário atual do cálculo
        },
        _sum: { ownership_percentage: true },
      })

      const othersTotal = Number(totalOwnership._sum.ownership_percentage || 0)
      const newTotal = othersTotal + ownershipData.ownershipPercentage

      if (newTotal > 100) {
        return res.status(400).send({
          error:
            `A nova participação resultaria em ${newTotal}%, ultrapassando ` +
            `100%. Participação dos outros proprietários: ${othersTotal}%`,
        })
      }

      // Atualizar participação
      const updatedOwnership = await prisma.vehicleOwnership.update({
        where: {
          vehicle_id_user_id: {
            vehicle_id: id,
            user_id: userId,
          },
        },
        data: {
          ownership_percentage: ownershipData.ownershipPercentage,
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
        `Participação atualizada: ${existingOwnership.user.name} - ` +
        `${Number(existingOwnership.ownership_percentage)}% → ` +
        `${ownershipData.ownershipPercentage}% no veículo ` +
        `${existingOwnership.vehicle.license_plate}`,
      )

      return res.send({
        data: updatedOwnership,
        message:
          `Participação atualizada para ${ownershipData.ownershipPercentage}%`,
      })
    } catch (error) {
      console.error('Erro ao alterar participação:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }

      return res.status(500).send({
        error: 'Erro ao alterar participação',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // DELETE /vehicles/:id/ownership/:userId - Remover proprietário do veículo
  app.delete('/vehicles/:id/ownership/:userId', async (req, res) => {
    await authenticate(req, res)

    try {
      const { id, userId } = z.object({
        id: z.string().uuid(),
        userId: z.string().uuid(),
      }).parse(req.params)

      console.log(
        `Removendo participação do usuário ${userId} no veículo ${id}`)

      // Verificar se a participação existe
      const existingOwnership = await prisma.vehicleOwnership.findUnique({
        where: {
          vehicle_id_user_id: {
            vehicle_id: id,
            user_id: userId,
          },
        },
        include: {
          user: true,
          vehicle: true,
        },
      })

      if (!existingOwnership) {
        return res.status(404).send({
          error: 'Participação não encontrada',
        })
      }

      // Remover participação
      await prisma.vehicleOwnership.delete({
        where: {
          vehicle_id_user_id: {
            vehicle_id: id,
            user_id: userId,
          },
        },
      })

      console.log(
        `Participação removida: ${existingOwnership.user.name} ` +
        `(${Number(existingOwnership.ownership_percentage)}%) do veículo ` +
        `${existingOwnership.vehicle.license_plate}`,
      )

      return res.send({
        message:
          `Participação de ${existingOwnership.user.name} removida com sucesso`,
      })
    } catch (error) {
      console.error('Erro ao remover participação:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'IDs inválidos',
          details: error.errors,
        })
      }

      return res.status(500).send({
        error: 'Erro ao remover participação',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })
}
