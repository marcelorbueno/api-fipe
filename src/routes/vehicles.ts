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

      // Buscar dados FIPE se não fornecidos
      let finalFuelAcronym = data.fuel_acronym
      let finalDisplayFuel = data.display_fuel
      let finalBrandName = data.brand_name
      let finalModelName = data.model_name
      let shouldCreateCache = false
      let cachedFipeData: {
        brand: string;
        model: string;
        fuel: string;
        fuelAcronym: string;
        price: string;
        modelYear: number;
        codeFipe: string;
        referenceMonth: string;
      } | null = null

      if (!finalFuelAcronym || !finalDisplayFuel || !finalBrandName ||
        !finalModelName) {
        try {
          console.log('Buscando dados FIPE automaticamente...')

          const axios = (await import('../config/axios')).default
          const { env } = await import('../env')

          const vehicleType = data.vehicle_type
          const fipeUrl =
            `${env.API_FIPE_PATH}/${vehicleType}/brands/` +
            `${data.fipe_brand_code}/models/${data.fipe_model_code}/years/` +
            `${data.year_id}`

          const response = await axios.get(fipeUrl, {
            params: { reference: env.FIPE_REFERENCE },
            timeout: 10000,
          })

          const fipeData = response.data

          // Usar dados imediatamente
          if (!finalFuelAcronym) finalFuelAcronym = fipeData.fuelAcronym
          if (!finalDisplayFuel) finalDisplayFuel = fipeData.fuel
          if (!finalBrandName) finalBrandName = fipeData.brand
          if (!finalModelName) finalModelName = fipeData.model

          // Marcar para criar cache
          shouldCreateCache = true
          cachedFipeData = fipeData

          console.log('Dados FIPE obtidos:', {
            brand: fipeData.brand,
            model: fipeData.model,
            fuel: fipeData.fuel,
            fuelAcronym: fipeData.fuelAcronym,
            price: fipeData.price,
          })
        } catch (fipeError) {
          console.warn('Erro ao buscar dados FIPE:', fipeError)

          // Fallback para fuel_acronym -> display_fuel
          if (!finalDisplayFuel && finalFuelAcronym) {
            const fuelMap: Record<string, string> = {
              G: 'Gasolina', D: 'Diesel', E: 'Etanol', F: 'Flex',
            }
            finalDisplayFuel =
              fuelMap[finalFuelAcronym.toUpperCase()] || finalFuelAcronym
          }
        }
      }

      // Extrair display_year do year_id se necessário
      let displayYear = data.display_year
      if (!displayYear && data.year_id) {
        const yearMatch = data.year_id.match(/^(\d{4})/)
        if (yearMatch) {
          displayYear = parseInt(yearMatch[1])
        }
      }

      const vehicle = await prisma.vehicle.create({
        data: {
          license_plate: data.license_plate,
          renavam: data.renavam,
          fipe_brand_code: data.fipe_brand_code,
          fipe_model_code: data.fipe_model_code,
          year_id: data.year_id,
          fuel_acronym: finalFuelAcronym || null,
          vehicle_type: data.vehicle_type as VehicleType,
          display_year: displayYear || undefined,
          display_fuel: finalDisplayFuel || undefined,
          brand_name: finalBrandName || undefined,
          model_name: finalModelName || undefined,
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

      // Criar cache FIPE automaticamente se conseguimos os dados
      if (shouldCreateCache && cachedFipeData && finalFuelAcronym) {
        try {
          console.log('Criando cache FIPE automaticamente...')

          // Converter preço de "R$ 43.867,00" para número
          const fipeValue = Number(
            cachedFipeData.price.replace(/[R$\s.]/g, '').replace(',', '.'),
          )

          await prisma.fipeCache.create({
            data: {
              brand_code: data.fipe_brand_code,
              model_code: data.fipe_model_code,
              year_id: data.year_id,
              fuel_acronym: finalFuelAcronym,
              vehicle_type: data.vehicle_type as VehicleType,
              fipe_value: fipeValue,
              brand_name: cachedFipeData.brand || null,
              model_name: cachedFipeData.model || null,
              model_year: cachedFipeData.modelYear || null,
              fuel_name: cachedFipeData.fuel || null,
              code_fipe: cachedFipeData.codeFipe || null,
              reference_month: cachedFipeData.referenceMonth || 'N/A',
            },
          })

          console.log(
            `Cache FIPE criado: R$ ${fipeValue.toLocaleString('pt-BR')}`)
        } catch (cacheError) {
          console.warn('Erro ao criar cache FIPE:', cacheError)
        }
      }

      // Se for veículo da empresa, criar participações para todos os sócios
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
        }
      }

      return res.status(201).send({
        data: vehicle,
        message: data.is_company_vehicle
          ? 'Veículo da empresa criado com participações automáticas e cache ' +
            'FIPE'
          : 'Veículo criado com sucesso e cache FIPE',
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

  // PUT /vehicles/:id - Atualizar veículo com cache FIPE automático
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

      // Determinar valores finais (dados fornecidos ou existentes)
      const finalFipeBrandCode =
        data.fipe_brand_code ?? existingVehicle.fipe_brand_code
      const finalFipeModelCode =
        data.fipe_model_code ?? existingVehicle.fipe_model_code
      const finalYearId = data.year_id ?? existingVehicle.year_id
      const finalVehicleType = data.vehicle_type ?? existingVehicle.vehicle_type

      let finalFuelAcronym = data.fuel_acronym !== undefined
        ? data.fuel_acronym
        : existingVehicle.fuel_acronym
      let finalDisplayFuel = data.display_fuel !== undefined
        ? data.display_fuel
        : existingVehicle.display_fuel
      let finalBrandName = data.brand_name !== undefined
        ? data.brand_name
        : existingVehicle.brand_name
      let finalModelName = data.model_name !== undefined
        ? data.model_name
        : existingVehicle.model_name

      let shouldCreateCache = false
      let cachedFipeData: {
        brand: string;
        model: string;
        fuel: string;
        fuelAcronym: string;
        price: string;
        modelYear: number;
        codeFipe: string;
        referenceMonth: string;
      } | null = null

      // Buscar dados FIPE se campos FIPE foram alterados e campos essenciais
      // estão vazios
      const fipeFieldsChanged =
      data.fipe_brand_code || data.fipe_model_code || data.year_id ||
      data.vehicle_type

      if (fipeFieldsChanged && (!finalFuelAcronym || !finalDisplayFuel ||
          !finalBrandName || !finalModelName)) {
        try {
          console.log('Buscando dados FIPE atualizados...')

          const axios = (await import('../config/axios')).default
          const { env } = await import('../env')

          const fipeUrl =
            `${env.API_FIPE_PATH}/${finalVehicleType}/brands/` +
            `${finalFipeBrandCode}/models/${finalFipeModelCode}/years/` +
            `${finalYearId}`

          const response = await axios.get(fipeUrl, {
            params: { reference: env.FIPE_REFERENCE },
            timeout: 10000,
          })

          const fipeData = response.data

          // Atualizar campos vazios com dados FIPE
          if (!finalFuelAcronym) finalFuelAcronym = fipeData.fuelAcronym
          if (!finalDisplayFuel) finalDisplayFuel = fipeData.fuel
          if (!finalBrandName) finalBrandName = fipeData.brand
          if (!finalModelName) finalModelName = fipeData.model

          // Marcar para atualizar cache
          shouldCreateCache = true
          cachedFipeData = fipeData

          console.log('Dados FIPE atualizados:', {
            brand: fipeData.brand,
            model: fipeData.model,
            fuel: fipeData.fuel,
            fuelAcronym: fipeData.fuelAcronym,
          })
        } catch (fipeError) {
          console.warn('Erro ao buscar dados FIPE atualizados:', fipeError)

          // Fallback para fuel_acronym -> display_fuel
          if (!finalDisplayFuel && finalFuelAcronym) {
            const fuelMap: Record<string, string> = {
              G: 'Gasolina', D: 'Diesel', E: 'Etanol', F: 'Flex',
            }
            finalDisplayFuel =
              fuelMap[finalFuelAcronym.toUpperCase()] || finalFuelAcronym
          }
        }
      }

      // Preparar display_year
      let displayYear = data.display_year ?? existingVehicle.display_year
      if (!displayYear && finalYearId) {
        const yearMatch = finalYearId.match(/^(\d{4})/)
        if (yearMatch) {
          displayYear = parseInt(yearMatch[1])
        }
      }

      // Atualizar o veículo
      const vehicle = await prisma.vehicle.update({
        where: { id },
        data: {
          license_plate: data.license_plate ?? existingVehicle.license_plate,
          renavam: data.renavam ?? existingVehicle.renavam,
          fipe_brand_code: finalFipeBrandCode,
          fipe_model_code: finalFipeModelCode,
          year_id: finalYearId,
          fuel_acronym: finalFuelAcronym,
          vehicle_type: finalVehicleType as VehicleType,
          display_year: displayYear,
          display_fuel: finalDisplayFuel,
          brand_name: finalBrandName,
          model_name: finalModelName,
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

      // Atualizar cache FIPE se conseguimos novos dados
      if (shouldCreateCache && cachedFipeData && finalFuelAcronym) {
        try {
          console.log('Atualizando cache FIPE...')

          // Remover cache antigo se existe
          await prisma.fipeCache.deleteMany({
            where: {
              brand_code: finalFipeBrandCode,
              model_code: finalFipeModelCode,
              year_id: finalYearId,
              vehicle_type: finalVehicleType as VehicleType,
            },
          })

          // Criar novo cache
          const fipeValue = Number(
            cachedFipeData.price.replace(/[R$\s.]/g, '').replace(',', '.'),
          )

          await prisma.fipeCache.create({
            data: {
              brand_code: finalFipeBrandCode,
              model_code: finalFipeModelCode,
              year_id: finalYearId,
              fuel_acronym: finalFuelAcronym,
              vehicle_type: finalVehicleType as VehicleType,
              fipe_value: fipeValue,
              brand_name: cachedFipeData.brand || null,
              model_name: cachedFipeData.model || null,
              model_year: cachedFipeData.modelYear || null,
              fuel_name: cachedFipeData.fuel || null,
              code_fipe: cachedFipeData.codeFipe || null,
              reference_month: cachedFipeData.referenceMonth || 'N/A',
            },
          })

          console.log(
            `Cache FIPE atualizado: R$ ${fipeValue.toLocaleString('pt-BR')}`)
        } catch (cacheError) {
          console.warn('Erro ao atualizar cache FIPE:', cacheError)
        }
      }

      return res.send({
        data: vehicle,
        message: shouldCreateCache
          ? 'Veículo atualizado com sucesso e cache FIPE atualizado'
          : 'Veículo atualizado com sucesso',
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
