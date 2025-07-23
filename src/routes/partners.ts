import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Schema para validação de parâmetros
const getPartnerParamsSchema = z.object({
  id: z.string().uuid(),
})

// Schema para query parameters
const listPartnersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  active: z.coerce.boolean().optional(),
})

export async function partnersRoutes(app: FastifyInstance) {
  // GET /partners - Listar todos os proprietários
  app.get('/partners', async (
    req:
    FastifyRequest<{ Querystring: z.infer<typeof listPartnersQuerySchema> }>,
    res,
  ) => {
    try {
      const { page, limit, active } = listPartnersQuerySchema.parse(req.query)

      const skip = (page - 1) * limit

      const whereCondition = active !== undefined
        ? { is_active: active }
        : {}

      const [partners, total] = await Promise.all([
        prisma.partner.findMany({
          where: whereCondition,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            is_active: true,
            created_at: true,
          },
        }),
        prisma.partner.count({ where: whereCondition }),
      ])

      // Buscar contagem de veículos separadamente para cada partner
      const partnersWithVehicleCount = await Promise.all(
        partners.map(async (partner) => {
          const vehicleCount = await prisma.vehicleOwnership.count({
            where: { partner_id: partner.id },
          })

          return {
            ...partner,
            vehicle_count: vehicleCount,
          }
        }),
      )

      return res.send({
        data: partnersWithVehicleCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      return res.status(400).send({
        error: 'Erro ao buscar proprietários',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // GET /partners/:id - Buscar proprietário específico
  app.get('/partners/:id', async (
    req: FastifyRequest<{ Params: z.infer<typeof getPartnerParamsSchema> }>,
    res,
  ) => {
    try {
      const { id } = getPartnerParamsSchema.parse(req.params)

      const partner = await prisma.partner.findUnique({
        where: { id },
        include: {
          vehicle_ownerships: {
            include: {
              vehicle: {
                select: {
                  id: true,
                  license_plate: true,
                  vehicle_type: true,
                  year: true,
                  color: true,
                },
              },
            },
          },
        },
      })

      if (!partner) {
        return res.status(404).send({ error: 'Proprietário não encontrado' })
      }

      return res.send({ data: partner })
    } catch (error) {
      return res.status(400).send({
        error: 'Erro ao buscar proprietário',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // GET /partners/stats - Estatísticas dos proprietários
  app.get('/partners/stats', async (req, res) => {
    try {
      const [
        totalPartners,
        activePartners,
        partnersWithVehicles,
        avgVehiclesPerPartner,
      ] = await Promise.all([
        prisma.partner.count(),
        prisma.partner.count({ where: { is_active: true } }),
        prisma.partner.count({
          where: {
            vehicle_ownerships: {
              some: {},
            },
          },
        }),
        prisma.vehicleOwnership.groupBy({
          by: ['partner_id'],
          _count: {
            vehicle_id: true,
          },
        }),
      ])

      const avgVehicles = avgVehiclesPerPartner.length > 0
        ? avgVehiclesPerPartner.reduce((acc, curr) =>
          acc + curr._count.vehicle_id, 0) / avgVehiclesPerPartner.length
        : 0

      return res.send({
        data: {
          total_partners: totalPartners,
          active_partners: activePartners,
          inactive_partners: totalPartners - activePartners,
          partners_with_vehicles: partnersWithVehicles,
          partners_without_vehicles: totalPartners - partnersWithVehicles,
          average_vehicles_per_partner: Math.round(avgVehicles * 100) / 100,
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
