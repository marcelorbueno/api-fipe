import { FastifyInstance } from 'fastify'
import { PrismaClient, UserProfile } from '@prisma/client'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { authenticate } from '../middleware/auth'

const prisma = new PrismaClient()

// Schemas de validação com nomes em camelCase
const createUserSchema = z.object({
  name: z.string().min(2).max(255),
  num_cpf: z.string().length(11).regex(/^\d+$/, {
    message: 'CPF deve conter apenas números',
  }),
  email: z.string().email(),
  password: z.string().min(6),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Data de nascimento deve estar no formato YYYY-MM-DD',
  }),
  phone_number: z.string().min(10).max(15),
  avatar: z.string().url().optional().nullable(),
  profile: z.enum(['ADMINISTRATOR', 'PARTNER', 'INVESTOR']).default('INVESTOR'),
  is_active: z.boolean().default(true),
})

const updateUserSchema = createUserSchema.partial().omit({
  password: true, // Senha deve ser alterada em endpoint separado
})

// Schema com camelCase
const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
})

const getUserParamsSchema = z.object({
  id: z.string().uuid(),
})

// Schema com camelCase mas mapeamento correto
const listUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  profile: z.enum(['ADMINISTRATOR', 'PARTNER', 'INVESTOR']).optional(),
  isActive: z.string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true
      if (val === 'false') return false
      return undefined
    }),
  search: z.string().optional(),
})

export async function usersRoutes(app: FastifyInstance) {
  // GET /users - Listar usuários
  app.get('/users', async (req, res) => {
    await authenticate(req, res)

    try {
      // Destructuring com camelCase
      const queryParams = listUsersQuerySchema.parse(req.query)
      const {
        page,
        limit,
        profile,
        search,
      } = queryParams

      // Mapear isActive para is_active do banco
      const isActive = queryParams.isActive

      console.log('Filtros aplicados:', {
        profile,
        isActive,
        search,
      })

      const skip = (page - 1) * limit

      // Interface para whereCondition
      interface WhereCondition {
        profile?: UserProfile
        is_active?: boolean
        OR?: Array<{
          name?: { contains: string; mode: 'insensitive' }
          email?: { contains: string; mode: 'insensitive' }
          num_cpf?: { contains: string; mode: 'insensitive' }
        }>
      }

      const whereCondition: WhereCondition = {}

      // Aplicar filtros
      if (profile) {
        whereCondition.profile = profile as UserProfile
      }

      // Usar is_active do banco de dados
      if (isActive !== undefined) {
        whereCondition.is_active = isActive
      }

      // Filtro de busca em múltiplos campos
      if (search) {
        whereCondition.OR = [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            num_cpf: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ]
      }

      // Buscar usuários com paginação
      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
          where: whereCondition,
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            num_cpf: true,
            email: true,
            birthday: true,
            phone_number: true,
            avatar: true,
            profile: true,
            is_active: true,
            created_at: true,
            updated_at: true,
          },
          orderBy: {
            created_at: 'desc',
          },
        }),
        prisma.user.count({
          where: whereCondition,
        }),
      ])

      const totalPages = Math.ceil(totalCount / limit)
      const hasNextPage = page < totalPages
      const hasPreviousPage = page > 1

      console.log(
        `Listados ${users.length}/${totalCount} usuários ` +
        `(página ${page}/${totalPages})`,
      )

      return res.send({
        data: users,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
        filters: {
          profile,
          isActive,
          search,
        },
        message: `${users.length} usuários encontrados`,
      })
    } catch (error) {
      console.error('Erro ao listar usuários:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'Parâmetros de consulta inválidos',
          details: error.errors,
        })
      }

      return res.status(500).send({
        error: 'Erro ao listar usuários',
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

      console.log('Criando usuário:', {
        name: data.name,
        email: data.email,
        profile: data.profile,
        birthday: data.birthday,
      })

      // Verificar se email já existe
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email },
      })

      if (existingEmail) {
        return res.status(400).send({
          error: 'Já existe um usuário cadastrado com este email',
        })
      }

      // Verificar se CPF já existe
      const existingCpf = await prisma.user.findUnique({
        where: { num_cpf: data.num_cpf },
      })

      if (existingCpf) {
        return res.status(400).send({
          error: 'Já existe um usuário cadastrado com este CPF',
        })
      }

      // Criptografar senha
      const hashedPassword = await bcrypt.hash(data.password, 8)

      const user = await prisma.user.create({
        data: {
          ...data,
          password: hashedPassword,
          birthday: new Date(data.birthday + 'T00:00:00.000Z'),
          profile: data.profile as UserProfile,
        },
        select: {
          id: true,
          name: true,
          num_cpf: true,
          email: true,
          birthday: true,
          phone_number: true,
          avatar: true,
          profile: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      })

      console.log(`Usuário criado: ${user.name} (${user.profile})`)

      return res.status(201).send({
        data: user,
        message: 'Usuário criado com sucesso',
      })
    } catch (error) {
      console.error('Erro ao criar usuário:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }

      return res.status(500).send({
        error: 'Erro ao criar usuário',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // GET /users/:id - Obter usuário por ID
  app.get('/users/:id', async (req, res) => {
    await authenticate(req, res)

    try {
      const { id } = getUserParamsSchema.parse(req.params)

      console.log(`Buscando usuário: ${id}`)

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          num_cpf: true,
          email: true,
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
                  brand_name: true,
                  model_name: true,
                  display_year: true,
                  is_company_vehicle: true,
                },
              },
            },
          },
        },
      })

      if (!user) {
        return res.status(404).send({
          error: 'Usuário não encontrado',
        })
      }

      console.log(`Usuário encontrado: ${user.name}`)

      return res.send({
        data: user,
        message: 'Usuário encontrado com sucesso',
      })
    } catch (error) {
      console.error('Erro ao buscar usuário:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'ID inválido',
          details: error.errors,
        })
      }

      return res.status(500).send({
        error: 'Erro ao buscar usuário',
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

      console.log(`Atualizando usuário ${id}:`, {
        name: data.name,
        email: data.email,
        profile: data.profile,
        birthday: data.birthday,
      })

      // Verificar se o usuário existe
      const existingUser = await prisma.user.findUnique({
        where: { id },
      })

      if (!existingUser) {
        return res.status(404).send({
          error: 'Usuário não encontrado',
        })
      }

      // Verificar conflitos de email (se fornecido)
      if (data.email && data.email !== existingUser.email) {
        const emailConflict = await prisma.user.findUnique({
          where: { email: data.email },
        })

        if (emailConflict) {
          return res.status(400).send({
            error: 'Já existe um usuário cadastrado com este email',
          })
        }
      }

      // Verificar conflitos de CPF (se fornecido)
      if (data.num_cpf && data.num_cpf !== existingUser.num_cpf) {
        const cpfConflict = await prisma.user.findUnique({
          where: { num_cpf: data.num_cpf },
        })

        if (cpfConflict) {
          return res.status(400).send({
            error: 'Já existe um usuário cadastrado com este CPF',
          })
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          ...data,
          birthday: data.birthday !== undefined
            ? new Date(data.birthday + 'T00:00:00.000Z')
            : existingUser.birthday,
          profile: data.profile
            ? data.profile as UserProfile
            : existingUser.profile,
        },
        select: {
          id: true,
          name: true,
          num_cpf: true,
          email: true,
          birthday: true,
          phone_number: true,
          avatar: true,
          profile: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      })

      console.log(`Usuário atualizado: ${user.name}`)

      return res.send({
        data: user,
        message: 'Usuário atualizado com sucesso',
      })
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }

      return res.status(500).send({
        error: 'Erro ao atualizar usuário',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // PUT /users/:id/password - Alterar senha do usuário
  app.put('/users/:id/password', async (req, res) => {
    await authenticate(req, res)

    try {
      const { id } = getUserParamsSchema.parse(req.params)
      const passwordData = changePasswordSchema.parse(req.body)
      const { currentPassword, newPassword } = passwordData

      console.log(`Alterando senha do usuário: ${id}`)

      // Verificar se o usuário existe
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          password: true,
        },
      })

      if (!user) {
        return res.status(404).send({
          error: 'Usuário não encontrado',
        })
      }

      // Verificar senha atual
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password,
      )

      if (!isCurrentPasswordValid) {
        return res.status(400).send({
          error: 'Senha atual incorreta',
        })
      }

      // Criptografar nova senha
      const hashedNewPassword = await bcrypt.hash(newPassword, 8)

      // Atualizar senha
      await prisma.user.update({
        where: { id },
        data: {
          password: hashedNewPassword,
        },
      })

      console.log(`Senha alterada para usuário: ${user.name}`)

      return res.send({
        message: 'Senha alterada com sucesso',
      })
    } catch (error) {
      console.error('Erro ao alterar senha:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }

      return res.status(500).send({
        error: 'Erro ao alterar senha',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // DELETE /users/:id - Desativar usuário (soft delete)
  app.delete('/users/:id', async (req, res) => {
    await authenticate(req, res)

    try {
      const { id } = getUserParamsSchema.parse(req.params)

      console.log(`Desativando usuário: ${id}`)

      // Verificar se o usuário existe
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          is_active: true,
          vehicle_ownerships: {
            select: {
              id: true,
            },
          },
        },
      })

      if (!existingUser) {
        return res.status(404).send({
          error: 'Usuário não encontrado',
        })
      }

      if (!existingUser.is_active) {
        return res.status(400).send({
          error: 'Usuário já está desativado',
        })
      }

      // Desativar usuário (soft delete)
      await prisma.user.update({
        where: { id },
        data: {
          is_active: false,
        },
      })

      console.log(
        `Usuário ${existingUser.name} desativado com sucesso ` +
        `(${existingUser.vehicle_ownerships.length} participações mantidas)`,
      )

      return res.send({
        message: `Usuário ${existingUser.name} desativado com sucesso`,
        note:
          'As participações em veículos foram mantidas. Para reativar, ' +
          'altere is_active para true.',
      })
    } catch (error) {
      console.error('Erro ao desativar usuário:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'ID inválido',
          details: error.errors,
        })
      }

      return res.status(500).send({
        error: 'Erro ao desativar usuário',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // PATCH /users/:id/reactivate - Reativar usuário
  app.patch('/users/:id/reactivate', async (req, res) => {
    await authenticate(req, res)

    try {
      const { id } = getUserParamsSchema.parse(req.params)

      console.log(`Reativando usuário: ${id}`)

      // Verificar se o usuário existe
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          is_active: true,
        },
      })

      if (!existingUser) {
        return res.status(404).send({
          error: 'Usuário não encontrado',
        })
      }

      if (existingUser.is_active) {
        return res.status(400).send({
          error: 'Usuário já está ativo',
        })
      }

      // Reativar usuário
      await prisma.user.update({
        where: { id },
        data: {
          is_active: true,
        },
      })

      console.log(`Usuário ${existingUser.name} reativado com sucesso`)

      return res.send({
        message: `Usuário ${existingUser.name} reativado com sucesso`,
      })
    } catch (error) {
      console.error('Erro ao reativar usuário:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).send({
          error: 'ID inválido',
          details: error.errors,
        })
      }

      return res.status(500).send({
        error: 'Erro ao reativar usuário',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // GET /users/stats - Obter estatísticas dos usuários
  app.get('/users/stats', async (req, res) => {
    await authenticate(req, res)

    try {
      console.log('Calculando estatísticas de usuários')

      // Obter estatísticas básicas
      const [
        totalUsers,
        activeUsers,
        usersByProfile,
      ] = await Promise.all([
        // Total de usuários
        prisma.user.count(),

        // Usuários ativos
        prisma.user.count({
          where: { is_active: true },
        }),

        // Usuários por perfil
        prisma.user.groupBy({
          by: ['profile'],
          _count: {
            profile: true,
          },
        }),
      ])

      // Calcular média de veículos por usuário
      const vehicleOwnershipCount = await prisma.vehicleOwnership.count()
      const averageVehiclesPerUser = totalUsers > 0
        ? vehicleOwnershipCount / totalUsers
        : 0

      // Formatar dados de usuários por perfil
      const profileStats = usersByProfile.reduce((acc, item) => {
        acc[item.profile] = item._count.profile
        return acc
      }, {} as Record<string, number>)

      const stats = {
        total_users: totalUsers,
        active_users: activeUsers,
        users_by_profile: profileStats,
        average_vehicles_per_user: Math.round(averageVehiclesPerUser * 100) / 100,
      }

      console.log('Estatísticas calculadas:', stats)

      return res.send({
        data: stats,
        message: 'Estatísticas de usuários calculadas com sucesso',
      })
    } catch (error) {
      console.error('Erro ao calcular estatísticas de usuários:', error)

      return res.status(500).send({
        error: 'Erro ao calcular estatísticas de usuários',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })
}
