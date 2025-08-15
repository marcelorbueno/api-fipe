// src/services/patrimony-service.ts
import { PrismaClient, VehicleType, UserProfile } from '@prisma/client'
import { fipeAPI, VehicleType as ApiVehicleType } from '../lib/fipe-api'

const prisma = new PrismaClient()

// Interface para o veículo com includes
interface VehicleWithDetails {
  id: string
  fipe_brand_code: number
  fipe_model_code: number
  year: string
  fuel_type: string
  vehicle_type: VehicleType
  license_plate: string
  is_company_vehicle: boolean
}

interface UserPatrimony {
  user_id: string
  user_name: string
  user_profile: UserProfile
  total_patrimony: number
  vehicles: Array<{
    vehicle_id: string
    license_plate: string
    ownership_percentage: number
    fipe_value: number
    user_value: number
    vehicle_type: string
    is_company_vehicle: boolean
  }>
}

interface CompanyPatrimonyBreakdown {
  total_company_patrimony: number
  vehicles_count: number
  partners: Array<{
    user_id: string
    user_name: string
    participation_percentage: number
    patrimony_value: number
  }>
}

export class PatrimonyService {
  // Calcular patrimônio de um usuário específico (sócio ou investidor)
  async calculateUserPatrimony(userId: string): Promise<UserPatrimony> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        vehicle_ownerships: {
          include: {
            vehicle: true,
          },
        },
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const vehicles = []
    let totalPatrimony = 0

    for (const ownership of user.vehicle_ownerships) {
      const fipeValue = await this.getVehicleFipeValue(ownership.vehicle)
      const userValue =
        (fipeValue * Number(ownership.ownership_percentage)) / 100

      vehicles.push({
        vehicle_id: ownership.vehicle.id,
        license_plate: ownership.vehicle.license_plate,
        ownership_percentage: Number(ownership.ownership_percentage),
        fipe_value: fipeValue,
        user_value: userValue,
        vehicle_type: ownership.vehicle.vehicle_type,
        is_company_vehicle: ownership.vehicle.is_company_vehicle,
      })

      totalPatrimony += userValue
    }

    return {
      user_id: user.id,
      user_name: user.name,
      user_profile: user.profile,
      total_patrimony: totalPatrimony,
      vehicles,
    }
  }

  // Calcular patrimônio de todos os sócios
  async calculateAllPartnersPatrimony(): Promise<UserPatrimony[]> {
    const partners = await prisma.user.findMany({
      where: {
        profile: UserProfile.PARTNER,
        is_active: true,
      },
      include: {
        vehicle_ownerships: {
          include: {
            vehicle: true,
          },
        },
      },
    })

    const partnersPatrimony: UserPatrimony[] = []

    for (const partner of partners) {
      const patrimony = await this.calculateUserPatrimony(partner.id)
      partnersPatrimony.push(patrimony)
    }

    return partnersPatrimony
  }

  // Calcular patrimônio de todos os investidores
  async calculateAllInvestorsPatrimony(): Promise<UserPatrimony[]> {
    const investors = await prisma.user.findMany({
      where: {
        profile: UserProfile.INVESTOR,
        is_active: true,
      },
      include: {
        vehicle_ownerships: {
          include: {
            vehicle: true,
          },
        },
      },
    })

    const investorsPatrimony: UserPatrimony[] = []

    for (const investor of investors) {
      const patrimony = await this.calculateUserPatrimony(investor.id)
      investorsPatrimony.push(patrimony)
    }

    return investorsPatrimony
  }

  // Calcular patrimônio consolidado da empresa (apenas veículos da empresa)
  async calculateCompanyPatrimony(): Promise<CompanyPatrimonyBreakdown> {
    // Buscar veículos da empresa
    const companyVehicles = await prisma.vehicle.findMany({
      where: { is_company_vehicle: true },
      include: {
        ownerships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profile: true,
              },
            },
          },
        },
      },
    })

    let totalCompanyPatrimony = 0
    const partnersParticipation = new Map<string, {
      user_id: string
      user_name: string
      patrimony_value: number
    }>()

    // Calcular valor de cada veículo da empresa
    for (const vehicle of companyVehicles) {
      const fipeValue = await this.getVehicleFipeValue(vehicle)
      totalCompanyPatrimony += fipeValue

      // Distribuir valor entre os sócios conforme participação
      for (const ownership of vehicle.ownerships) {
        const userValue =
          (fipeValue * Number(ownership.ownership_percentage)) / 100

        if (partnersParticipation.has(ownership.user_id)) {
          partnersParticipation.get(
            ownership.user_id)!.patrimony_value += userValue
        } else {
          partnersParticipation.set(ownership.user_id, {
            user_id: ownership.user_id,
            user_name: ownership.user.name,
            patrimony_value: userValue,
          })
        }
      }
    }

    // Calcular percentual de participação de cada sócio
    const partners =
      Array.from(partnersParticipation.values()).map(partner => ({
        ...partner,
        participation_percentage: totalCompanyPatrimony > 0
          ? (partner.patrimony_value / totalCompanyPatrimony) * 100
          : 0,
      }))

    return {
      total_company_patrimony: totalCompanyPatrimony,
      vehicles_count: companyVehicles.length,
      partners: partners.sort((a, b) => b.patrimony_value - a.patrimony_value),
    }
  }

  // Relatório completo de patrimônio (empresa + sócios + investidores)
  async generateCompletePatrimonyReport(): Promise<{
    company: CompanyPatrimonyBreakdown
    partners: UserPatrimony[]
    investors: UserPatrimony[]
    summary: {
      total_patrimony: number
      company_patrimony: number
      partners_personal_patrimony: number
      investors_patrimony: number
      total_vehicles: number
    }
  }> {
    const [companyPatrimony, partnersPatrimony, investorsPatrimony] =
      await Promise.all([
        this.calculateCompanyPatrimony(),
        this.calculateAllPartnersPatrimony(),
        this.calculateAllInvestorsPatrimony(),
      ])

    // Calcular patrimônio pessoal dos sócios (excluindo veículos da empresa)
    const partnersPersonalPatrimony =
      partnersPatrimony.reduce((total, partner) => {
        const personalVehiclesValue = partner.vehicles
          .filter(vehicle => !vehicle.is_company_vehicle)
          .reduce((sum, vehicle) => sum + vehicle.user_value, 0)
        return total + personalVehiclesValue
      }, 0)

    const investorsPatrimonyTotal = investorsPatrimony.reduce(
      (total, investor) => total + investor.total_patrimony, 0,
    )

    const totalVehicles = await prisma.vehicle.count()

    return {
      company: companyPatrimony,
      partners: partnersPatrimony,
      investors: investorsPatrimony,
      summary: {
        total_patrimony:
          companyPatrimony.total_company_patrimony + partnersPersonalPatrimony +
          investorsPatrimonyTotal,
        company_patrimony: companyPatrimony.total_company_patrimony,
        partners_personal_patrimony: partnersPersonalPatrimony,
        investors_patrimony: investorsPatrimonyTotal,
        total_vehicles: totalVehicles,
      },
    }
  }

  // Buscar valor FIPE do veículo (com cache)
  private async getVehicleFipeValue(
    vehicle: VehicleWithDetails): Promise<number> {
    // Primeiro, verificar cache
    const cached = await prisma.fipeCache.findUnique({
      where: {
        brand_code_model_code_year_fuel_type_vehicle_type: {
          brand_code: vehicle.fipe_brand_code,
          model_code: vehicle.fipe_model_code,
          year: vehicle.year,
          fuel_type: vehicle.fuel_type,
          vehicle_type: vehicle.vehicle_type,
        },
      },
    })

    if (cached) {
      console.log(
        `💾 Cache hit for vehicle ${vehicle.license_plate}: R$ ` +
        `${Number(cached.fipe_value).toLocaleString('pt-BR')}`,
      )
      return Number(cached.fipe_value)
    }

    // Se não estiver em cache, buscar na API
    try {
      console.log(
        `🌐 Fetching FIPE value for vehicle ${vehicle.license_plate}...`)

      const fipeData = await fipeAPI.getValue(
        vehicle.vehicle_type as ApiVehicleType,
        vehicle.fipe_brand_code,
        vehicle.fipe_model_code,
        vehicle.year,
      )

      // Converter valor de string para número (API v2 usa "price")
      const value = parseFloat(
        fipeData.price.replace(/[R$\s.]/g, '').replace(',', '.'))

      // Salvar no cache
      await prisma.fipeCache.create({
        data: {
          brand_code: vehicle.fipe_brand_code,
          model_code: vehicle.fipe_model_code,
          year: vehicle.year,
          fuel_type: vehicle.fuel_type,
          vehicle_type: vehicle.vehicle_type,
          fipe_value: value,
          reference_month: fipeData.referenceMonth,
        },
      })

      console.log(
        `✅ FIPE value cached for vehicle ${vehicle.license_plate}: R$ ` +
        `${value.toLocaleString('pt-BR')}`,
      )
      return value
    } catch (error) {
      console.error(
        `❌ Error fetching FIPE value for vehicle ${vehicle.license_plate}:`,
        error,
      )

      // Em caso de erro, retornar valor padrão ou último valor conhecido
      const lastKnownValue = await prisma.fipeCache.findFirst({
        where: {
          brand_code: vehicle.fipe_brand_code,
          model_code: vehicle.fipe_model_code,
          vehicle_type: vehicle.vehicle_type,
        },
        orderBy: { created_at: 'desc' },
      })

      if (lastKnownValue) {
        console.log(
          `⚠️  Using last known value for vehicle ${vehicle.license_plate}: ` +
          `R$ ${Number(lastKnownValue.fipe_value).toLocaleString('pt-BR')}`,
        )
        return Number(lastKnownValue.fipe_value)
      }

      // Se não há valor conhecido, retornar 0 e logar erro
      console.error(
        `💥 No FIPE value available for vehicle ${vehicle.license_plate}, ` +
        'using R$ 0',
      )
      return 0
    }
  }

  // Método utilitário para atualizar cache FIPE de todos os veículos
  async refreshAllVehiclesFipeCache(): Promise<{
    updated: number
    errors: number
    total: number
  }> {
    console.log('🔄 Starting FIPE cache refresh for all vehicles...')

    const vehicles = await prisma.vehicle.findMany()
    let updated = 0
    let errors = 0

    for (const vehicle of vehicles) {
      try {
        await this.getVehicleFipeValue(vehicle)
        updated++
      } catch (error) {
        console.error(
          `❌ Error updating cache for vehicle ${vehicle.license_plate}:`,
          error,
        )
        errors++
      }

      // Pequena pausa para não sobrecarregar a API FIPE
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log(
      `✅ FIPE cache refresh completed: ${updated} updated, ${errors} errors, ` +
      `${vehicles.length} total`,
    )

    return {
      updated,
      errors,
      total: vehicles.length,
    }
  }
}

export const patrimonyService = new PatrimonyService()
