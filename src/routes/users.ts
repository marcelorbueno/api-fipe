// src/routes/users.ts
import { FastifyInstance } from 'fastify'
import { PrismaClient, UserProfile } from '@prisma/client'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { authenticate } from '../middleware/auth'

const prisma = new PrismaClient()

// Schemas de validação
const createUserSchema = z.object({
  name: z.string().min(2),
  num_cpf: z.string().length(11),
  email: z.string().email(),
  password: z.string().min(6),
  birthday: z.string().date(),
  phone_number: z.string().min(10),
  avatar: z.string().url().optional().nullable(),
  profile: z.enum(['ADMINISTRATOR', 'PARTNER', 'INVESTOR']),
})

const updateUserSchema = createUserSchema.partial().omit({ password: true })

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
})

const getUserParamsSchema = z.object({
  id: z.string().uuid(),
})

const listUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  profile: z.enum(['ADMINISTRATOR', 'PARTNER', 'INVESTOR']).optional(),
  active: z.string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true
      if (val === 'false') return false
      return undefined
    }),
  search: z.string().optional(), // Buscar por nome, email ou CPF
})

export async function usersRoutes(app: FastifyInstance) {
  // GET /users - Listar usuários
  app.get('/users', async (req, res) => {
    await authenticate(req, res)

    try {
      const {
        page,
        limit,
        profile,
        active,
        search,
      } = listUsersQuerySchema.parse(req.query)

      const skip = (page - 1) * limit

      interface WhereCondition {
        profile?: UserProfile
        is_active?: boolean
        OR?: Array<{
          name?: { contains: string; mode: 'insensitive' }
          email?: { contains: string; mode: 'insensitive' }
          num_cpf?: { contains: string }
        }>
      }

      const whereCondition: WhereCondition = {}

      if (profile) {
        whereCondition.profile = profile
      }

      if (active !== undefined) {
        whereCondition.is_active = active
      }

      if (search) {
        whereCondition.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { num_cpf: { contains: search } },
        ]
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: whereCondition,
          skip,
          take: limit,
          orderBy: [
            { profile: 'asc' },
            { name: 'asc' },
          ],
          select: {
            id: true,
            name: true,
            email: true,
            num_cpf: true,
            phone_number: true,
            profile: true,
            is_active: true,
            created_at: true,
            avatar: true,
          },
        }),
        prisma.user.count({ where: whereCondition }),
      ])

      // Adicionar contagem de veículos para cada usuário
      const usersWithVehicleCount = []

      for (const user of users) {
        const vehicleCount = await prisma.vehicleOwnership.count({
          where: { user_id: user.id },
        })

        usersWithVehicleCount.push({
          ...user,
          vehicle_count: vehicleCount,
        })
      }

      return res.send({
        data: usersWithVehicleCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      return res.status(400).send({
        error: 'Erro ao buscar usuários',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // GET /users/:id - Buscar usuário específico
  app.get('/users/:id', async (req, res) => {
    await authenticate(req, res)

    try {
      const { id } = getUserParamsSchema.parse(req.params)

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          num_cpf: true,
          birthday: true,
          phone_number: true,
          avatar: true,
          profile: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          vehicle_ownerships: {
            include: {
              vehicle: {
                select: {
                  id: true,
                  license_plate: true,
                  vehicle_type: true,
                  fipe_brand_code: true,
                  fipe_model_code: true,
                  year_id: true,
                  display_year: true,
                  brand_name: true,
                  model_name: true,
                  display_fuel: true,
                  color: true,
                  is_company_vehicle: true,
                },
              },
            },
          },
        },
      })

      if (!user) {
        return res.status(404).send({ error: 'Usuário não encontrado' })
      }

      return res.send({ data: user })
    } catch (error) {
      return res.status(400).send({
        error: 'Erro ao buscar usuário',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // POST /users - Criar novo usuário
  app.post('/users', async (req, res) => {
    await authenticate(req, res)

    try {
      const data = createUserSchema.parse(req.body)

      // Verificar se CPF já existe
      const existingCpf = await prisma.user.findUnique({
        where: { num_cpf: data.num_cpf },
      })

      if (existingCpf) {
        return res.status(400).send({
          error: 'Já existe um usuário cadastrado com este CPF',
        })
      }

      // Verificar se email já existe
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email },
      })

      if (existingEmail) {
        return res.status(400).send({
          error: 'Já existe um usuário cadastrado com este email',
        })
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(data.password, 10)

      const user = await prisma.user.create({
        data: {
          ...data,
          password: hashedPassword,
          birthday: new Date(data.birthday),
          profile: data.profile as UserProfile,
        },
        select: {
          id: true,
          name: true,
          email: true,
          num_cpf: true,
          profile: true,
          avatar: true,
          is_active: true,
          created_at: true,
        },
      })

      return res.status(201).send({
        data: user,
        message: 'Usuário criado com sucesso',
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }

      return res.status(400).send({
        error: 'Erro ao criar usuário',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // PUT /users/:id - Atualizar usuário
  app.put('/users/:id', async (req, res) => {
    await authenticate(req, res)

    try {
      const { id } = getUserParamsSchema.parse(req.params)
      const data = updateUserSchema.parse(req.body)

      // Verificar se usuário existe
      const existingUser = await prisma.user.findUnique({
        where: { id },
      })

      if (!existingUser) {
        return res.status(404).send({ error: 'Usuário não encontrado' })
      }

      // Verificar duplicatas se CPF ou email estão sendo alterados
      if (data.num_cpf && data.num_cpf !== existingUser.num_cpf) {
        const duplicateCpf = await prisma.user.findUnique({
          where: { num_cpf: data.num_cpf },
        })
        if (duplicateCpf) {
          return res.status(400).send({
            error: 'Já existe um usuário cadastrado com este CPF',
          })
        }
      }

      if (data.email && data.email !== existingUser.email) {
        const duplicateEmail = await prisma.user.findUnique({
          where: { email: data.email },
        })
        if (duplicateEmail) {
          return res.status(400).send({
            error: 'Já existe um usuário cadastrado com este email',
          })
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          ...data,
          birthday: data.birthday
            ? new Date(data.birthday)
            : undefined,
          profile: data.profile
            ? (data.profile as UserProfile)
            : undefined,
        },
        select: {
          id: true,
          name: true,
          email: true,
          num_cpf: true,
          profile: true,
          avatar: true,
          is_active: true,
          updated_at: true,
        },
      })

      return res.send({
        data: updatedUser,
        message: 'Usuário atualizado com sucesso',
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }

      return res.status(400).send({
        error: 'Erro ao atualizar usuário',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // PUT /users/:id/password - Alterar senha
  app.put('/users/:id/password', async (req, res) => {
    await authenticate(req, res)

    try {
      const { id } = getUserParamsSchema.parse(req.params)
      const {
        currentPassword,
        newPassword,
      } = changePasswordSchema.parse(req.body)

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, password: true },
      })

      if (!user) {
        return res.status(404).send({ error: 'Usuário não encontrado' })
      }

      // Verificar senha atual
      const isCurrentPasswordValid =
      await bcrypt.compare(currentPassword, user.password)
      if (!isCurrentPasswordValid) {
        return res.status(400).send({ error: 'Senha atual incorreta' })
      }

      // Hash da nova senha
      const hashedNewPassword = await bcrypt.hash(newPassword, 10)

      await prisma.user.update({
        where: { id },
        data: { password: hashedNewPassword },
      })

      return res.send({ message: 'Senha alterada com sucesso' })
    } catch (error) {
      return res.status(400).send({
        error: 'Erro ao alterar senha',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // DELETE /users/:id - Desativar usuário
  app.delete('/users/:id', async (req, res) => {
    await authenticate(req, res)

    try {
      const { id } = getUserParamsSchema.parse(req.params)

      const existingUser = await prisma.user.findUnique({
        where: { id },
        include: { vehicle_ownerships: true },
      })

      if (!existingUser) {
        return res.status(404).send({ error: 'Usuário não encontrado' })
      }

      // Verificar se tem veículos
      if (existingUser.vehicle_ownerships.length > 0) {
        return res.status(400).send({
          error: 'Não é possível desativar usuário com veículos',
          message:
            'Remova todas as participações em veículos antes de desativar o ' +
            'usuário',
        })
      }

      // Desativar em vez de deletar
      await prisma.user.update({
        where: { id },
        data: { is_active: false },
      })

      return res.send({
        message: 'Usuário desativado com sucesso',
      })
    } catch (error) {
      return res.status(400).send({
        error: 'Erro ao desativar usuário',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // GET /users/stats - Estatísticas dos usuários
  app.get('/users/stats', async (req, res) => {
    await authenticate(req, res)

    try {
      const [
        totalUsers,
        usersByProfile,
        activeUsers,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.groupBy({
          by: ['profile'],
          _count: { id: true },
        }),
        prisma.user.count({ where: { is_active: true } }),
      ])

      // Calcular estatísticas por perfil
      const statsByProfile = usersByProfile.reduce((acc, item) => {
        acc[item.profile] = item._count.id
        return acc
      }, {} as Record<string, number>)

      // Calcular média de veículos por usuário
      const usersWithVehiclesList = await prisma.vehicleOwnership.groupBy({
        by: ['user_id'],
        _count: {
          vehicle_id: true,
        },
      })

      const avgVehicles = usersWithVehiclesList.length > 0
        ? usersWithVehiclesList.reduce(
          (acc, curr) => acc + curr._count.vehicle_id,
          0,
        ) / usersWithVehiclesList.length
        : 0

      return res.send({
        data: {
          total_users: totalUsers,
          active_users: activeUsers,
          inactive_users: totalUsers - activeUsers,
          users_with_vehicles: usersWithVehiclesList.length,
          users_without_vehicles: totalUsers - usersWithVehiclesList.length,
          average_vehicles_per_user: Math.round(avgVehicles * 100) / 100,
          users_by_profile: statsByProfile,
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

  // GET /users/partners - Listar apenas sócios (compatibilidade)
  app.get('/users/partners', async (req, res) => {
    await authenticate(req, res)

    try {
      const {
        page = 1,
        limit = 10,
      } = req.query as { page?: number; limit?: number }

      const skip = (page - 1) * limit

      const [partners, total] = await Promise.all([
        prisma.user.findMany({
          where: {
            profile: 'PARTNER',
            is_active: true,
          },
          skip,
          take: limit,
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            avatar: true,
            is_active: true,
            created_at: true,
            vehicle_ownerships: {
              select: {
                ownership_percentage: true,
                vehicle: {
                  select: {
                    license_plate: true,
                    vehicle_type: true,
                  },
                },
              },
            },
          },
        }),
        prisma.user.count({
          where: {
            profile: 'PARTNER',
            is_active: true,
          },
        }),
      ])

      // Adicionar contagem de veículos
      const partnersWithVehicleCount = partners.map(partner => ({
        ...partner,
        vehicle_count: partner.vehicle_ownerships.length,
      }))

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
        error: 'Erro ao buscar sócios',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // GET /users/investors - Listar apenas investidores
  app.get('/users/investors', async (req, res) => {
    await authenticate(req, res)

    try {
      const {
        page = 1,
        limit = 10,
      } = req.query as { page?: number; limit?: number }

      const skip = (page - 1) * limit

      const [investors, total] = await Promise.all([
        prisma.user.findMany({
          where: {
            profile: 'INVESTOR',
            is_active: true,
          },
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
            vehicle_ownerships: {
              select: {
                ownership_percentage: true,
                vehicle: {
                  select: {
                    license_plate: true,
                    vehicle_type: true,
                  },
                },
              },
            },
          },
        }),
        prisma.user.count({
          where: {
            profile: 'INVESTOR',
            is_active: true,
          },
        }),
      ])

      // Adicionar contagem de veículos
      const investorsWithVehicleCount = investors.map(investor => ({
        ...investor,
        vehicle_count: investor.vehicle_ownerships.length,
      }))

      return res.send({
        data: investorsWithVehicleCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      return res.status(400).send({
        error: 'Erro ao buscar investidores',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })
}
