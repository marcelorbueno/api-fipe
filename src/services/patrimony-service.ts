// src/services/patrimony-service.ts - VERSÃO CORRIGIDA
import { PrismaClient, VehicleType, UserProfile } from '@prisma/client'
import { fipeAPI, VehicleType as ApiVehicleType } from '../lib/fipe-api'

const prisma = new PrismaClient()

// Interface para o veículo com includes (CORRIGIDA PARA NOVOS CAMPOS)
interface VehicleWithDetails {
  id: string
  fipe_brand_code: number
  fipe_model_code: number
  year_id: string               // CORRIGIDO: era "year"
  fuel_acronym: string          // CORRIGIDO: era "fuel_type"
  vehicle_type: VehicleType
  license_plate: string
  is_company_vehicle: boolean
  brand_name?: string | null
  model_name?: string | null
  display_year?: number | null
  display_fuel?: string | null
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
    brand_name?: string | null
    model_name?: string | null
    display_year?: number | null
    display_fuel?: string | null
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
    console.log(`💰 Calculando patrimônio para usuário ${userId}`)

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

    console.log(`👤 Usuário encontrado: ${user.name} (${user.profile})`)
    console.log(`🚗 Veículos com participação: ${user.vehicle_ownerships.length}`)

    const vehicles = []
    let totalPatrimony = 0

    for (const ownership of user.vehicle_ownerships) {
      console.log(`🔍 Processando veículo ${ownership.vehicle.license_plate}...`)

      const fipeValue = await this.getVehicleFipeValue(ownership.vehicle)
      const userValue = (fipeValue * Number(ownership.ownership_percentage)) / 100

      vehicles.push({
        vehicle_id: ownership.vehicle.id,
        license_plate: ownership.vehicle.license_plate,
        ownership_percentage: Number(ownership.ownership_percentage),
        fipe_value: fipeValue,
        user_value: userValue,
        vehicle_type: ownership.vehicle.vehicle_type,
        is_company_vehicle: ownership.vehicle.is_company_vehicle,
        brand_name: ownership.vehicle.brand_name,
        model_name: ownership.vehicle.model_name,
        display_year: ownership.vehicle.display_year,
        display_fuel: ownership.vehicle.display_fuel,
      })

      totalPatrimony += userValue

      console.log(`  └ ${ownership.vehicle.license_plate}: R$ ${fipeValue.toLocaleString('pt-BR')} (${ownership.ownership_percentage}% = R$ ${userValue.toLocaleString('pt-BR')})`)
    }

    console.log(`✅ Patrimônio total de ${user.name}: R$ ${totalPatrimony.toLocaleString('pt-BR')}`)

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
    console.log('🤝 Calculando patrimônio de todos os sócios...')

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

    console.log(`📊 Encontrados ${partners.length} sócios ativos`)

    const partnersPatrimony: UserPatrimony[] = []

    for (const partner of partners) {
      console.log(`\n🔄 Processando sócio: ${partner.name}`)
      const patrimony = await this.calculateUserPatrimony(partner.id)
      partnersPatrimony.push(patrimony)
    }

    return partnersPatrimony
  }

  // Calcular patrimônio de todos os investidores
  async calculateAllInvestorsPatrimony(): Promise<UserPatrimony[]> {
    console.log('💼 Calculando patrimônio de todos os investidores...')

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

    console.log(`📊 Encontrados ${investors.length} investidores ativos`)

    const investorsPatrimony: UserPatrimony[] = []

    for (const investor of investors) {
      console.log(`\n🔄 Processando investidor: ${investor.name}`)
      const patrimony = await this.calculateUserPatrimony(investor.id)
      investorsPatrimony.push(patrimony)
    }

    return investorsPatrimony
  }

  // Calcular patrimônio consolidado da empresa (apenas veículos da empresa)
  async calculateCompanyPatrimony(): Promise<CompanyPatrimonyBreakdown> {
    console.log('🏢 Calculando patrimônio da empresa...')

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

    console.log(`🚗 Veículos da empresa encontrados: ${companyVehicles.length}`)

    let totalCompanyPatrimony = 0
    const partnersParticipation = new Map<string, {
      user_id: string
      user_name: string
      patrimony_value: number
    }>()

    // Calcular valor de cada veículo da empresa
    for (const vehicle of companyVehicles) {
      console.log(`🔍 Processando veículo da empresa: ${vehicle.license_plate}`)

      const fipeValue = await this.getVehicleFipeValue(vehicle)
      totalCompanyPatrimony += fipeValue

      // Distribuir valor entre os sócios conforme participação
      for (const ownership of vehicle.ownerships) {
        const userValue = (fipeValue * Number(ownership.ownership_percentage)) / 100

        if (partnersParticipation.has(ownership.user_id)) {
          partnersParticipation.get(ownership.user_id)!.patrimony_value += userValue
        } else {
          partnersParticipation.set(ownership.user_id, {
            user_id: ownership.user_id,
            user_name: ownership.user.name,
            patrimony_value: userValue,
          })
        }

        console.log(`  └ ${ownership.user.name}: ${ownership.ownership_percentage}% = R$ ${userValue.toLocaleString('pt-BR')}`)
      }
    }

    // Calcular percentual de participação de cada sócio
    const partners = Array.from(partnersParticipation.values()).map(partner => ({
      ...partner,
      participation_percentage: totalCompanyPatrimony > 0
        ? (partner.patrimony_value / totalCompanyPatrimony) * 100
        : 0,
    }))

    console.log(`✅ Patrimônio total da empresa: R$ ${totalCompanyPatrimony.toLocaleString('pt-BR')}`)

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
    console.log('📊 Gerando relatório completo de patrimônio...')

    const [companyPatrimony, partnersPatrimony, investorsPatrimony] = await Promise.all([
      this.calculateCompanyPatrimony(),
      this.calculateAllPartnersPatrimony(),
      this.calculateAllInvestorsPatrimony(),
    ])

    // Calcular patrimônio pessoal dos sócios (excluindo veículos da empresa)
    const partnersPersonalPatrimony = partnersPatrimony.reduce((total, partner) => {
      const personalVehiclesValue = partner.vehicles
        .filter(vehicle => !vehicle.is_company_vehicle)
        .reduce((sum, vehicle) => sum + vehicle.user_value, 0)
      return total + personalVehiclesValue
    }, 0)

    const investorsPatrimonyTotal = investorsPatrimony.reduce(
      (total, investor) => total + investor.total_patrimony, 0,
    )

    const totalVehicles = await prisma.vehicle.count()

    const summary = {
      total_patrimony: companyPatrimony.total_company_patrimony + partnersPersonalPatrimony + investorsPatrimonyTotal,
      company_patrimony: companyPatrimony.total_company_patrimony,
      partners_personal_patrimony: partnersPersonalPatrimony,
      investors_patrimony: investorsPatrimonyTotal,
      total_vehicles: totalVehicles,
    }

    console.log('📈 Resumo do relatório:')
    console.log(`  🏢 Patrimônio da empresa: R$ ${summary.company_patrimony.toLocaleString('pt-BR')}`)
    console.log(`  🤝 Patrimônio pessoal sócios: R$ ${summary.partners_personal_patrimony.toLocaleString('pt-BR')}`)
    console.log(`  💼 Patrimônio investidores: R$ ${summary.investors_patrimony.toLocaleString('pt-BR')}`)
    console.log(`  💰 Patrimônio total: R$ ${summary.total_patrimony.toLocaleString('pt-BR')}`)
    console.log(`  🚗 Total de veículos: ${summary.total_vehicles}`)

    return {
      company: companyPatrimony,
      partners: partnersPatrimony,
      investors: investorsPatrimony,
      summary,
    }
  }

  // Buscar valor FIPE do veículo (com cache) - CORRIGIDO PARA NOVOS CAMPOS
  private async getVehicleFipeValue(vehicle: VehicleWithDetails): Promise<number> {
    // Primeiro, verificar cache
    const cached = await prisma.fipeCache.findUnique({
      where: {
        brand_code_model_code_year_id_fuel_acronym_vehicle_type: {  // CORRIGIDO: nome da constraint
          brand_code: vehicle.fipe_brand_code,
          model_code: vehicle.fipe_model_code,
          year_id: vehicle.year_id,              // CORRIGIDO: era "year"
          fuel_acronym: vehicle.fuel_acronym,    // CORRIGIDO: era "fuel_type"
          vehicle_type: vehicle.vehicle_type,
        },
      },
    })

    if (cached) {
      console.log(`💾 Cache hit for vehicle ${vehicle.license_plate}: R$ ${Number(cached.fipe_value).toLocaleString('pt-BR')}`)
      return Number(cached.fipe_value)
    }

    // Se não estiver em cache, buscar na API
    try {
      console.log(`🌐 Fetching FIPE value for vehicle ${vehicle.license_plate}...`)
      console.log(`   └ FIPE params: brandCode=${vehicle.fipe_brand_code}, modelCode=${vehicle.fipe_model_code}, yearId=${vehicle.year_id}, vehicleType=${vehicle.vehicle_type}`)

      const fipeData = await fipeAPI.getValue(
        vehicle.vehicle_type as ApiVehicleType,
        vehicle.fipe_brand_code,
        vehicle.fipe_model_code,
        vehicle.year_id,                        // CORRIGIDO: era "year"
      )

      // Converter valor de string para número (API v2 usa "price")
      const value = parseFloat(fipeData.price.replace(/[R$\s.]/g, '').replace(',', '.'))

      // Salvar no cache com dados completos da API
      await prisma.fipeCache.create({
        data: {
          brand_code: vehicle.fipe_brand_code,
          model_code: vehicle.fipe_model_code,
          year_id: vehicle.year_id,              // CORRIGIDO: era "year"
          fuel_acronym: vehicle.fuel_acronym,    // CORRIGIDO: era "fuel_type"
          vehicle_type: vehicle.vehicle_type,
          fipe_value: value,
          brand_name: fipeData.brand || null,
          model_name: fipeData.model || null,
          model_year: fipeData.modelYear || null,
          fuel_name: fipeData.fuel || null,
          code_fipe: fipeData.codeFipe || null,
          reference_month: fipeData.referenceMonth,
        },
      })

      console.log(`✅ FIPE value cached for vehicle ${vehicle.license_plate}: R$ ${value.toLocaleString('pt-BR')}`)
      console.log(`   └ API returned: ${fipeData.brand} ${fipeData.model} (${fipeData.modelYear})`)

      return value
    } catch (error) {
      console.error(`❌ Error fetching FIPE value for vehicle ${vehicle.license_plate}:`, error)

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
          `⚠️ Using last known value for vehicle ${vehicle.license_plate}: ` +
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

    console.log(`📊 Found ${vehicles.length} vehicles to process`)

    for (const vehicle of vehicles) {
      try {
        console.log(
          `🔄 Processing ${updated + 1}/${vehicles.length}: ` +
          `${vehicle.license_plate}`,
        )
        await this.getVehicleFipeValue(vehicle)
        updated++
      } catch (error) {
        console.error(
          `❌ Error updating cache for vehicle ${vehicle.license_plate}:`, error)
        errors++
      }

      // Pequena pausa para não sobrecarregar a API FIPE
      await new Promise(resolve => setTimeout(resolve, 1500))
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

  // Método para atualizar informações de veículos com dados da API FIPE
  async updateVehicleInfoFromFipe(vehicleId: string): Promise<{
    updated: boolean
    vehicle?: VehicleWithDetails
    error?: string
  }> {
    try {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
      })

      if (!vehicle) {
        return { updated: false, error: 'Vehicle not found' }
      }

      console.log(
        `🔄 Updating vehicle ${vehicle.license_plate} with FIPE data...`)

      // Buscar informações da API FIPE
      const fipeData = await fipeAPI.getValue(
        vehicle.vehicle_type as ApiVehicleType,
        vehicle.fipe_brand_code,
        vehicle.fipe_model_code,
        vehicle.year_id,
      )

      // Atualizar vehicle com informações da FIPE
      const updatedVehicle = await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          brand_name: fipeData.brand || vehicle.brand_name,
          model_name: fipeData.model || vehicle.model_name,
          display_year: fipeData.modelYear || vehicle.display_year,
          display_fuel: fipeData.fuel || vehicle.display_fuel,
        },
      })

      console.log(`✅ Vehicle ${vehicle.license_plate} updated with FIPE data`)

      return { updated: true, vehicle: updatedVehicle }
    } catch (error) {
      console.error('❌ Error updating vehicle with FIPE data:', error)
      return {
        updated: false,
        error: error instanceof Error
          ? error.message
          : 'Unknown error',
      }
    }
  }

  // Método para obter estatísticas detalhadas
  async getPatrimonyStats(): Promise<{
    users_by_profile: Record<string, number>
    vehicles_by_type: Record<string, number>
    company_vs_personal: {
      company_vehicles: number
      personal_vehicles: number
      company_value: number
      personal_value: number
    }
    top_vehicles: Array<{
      license_plate: string
      brand_model: string
      fipe_value: number
      owners_count: number
    }>
  }> {
    console.log('📊 Gerando estatísticas detalhadas...')

    const [
      usersByProfile,
      vehiclesByType,
      companyVehicles,
      personalVehicles,
      allVehicles,
    ] = await Promise.all([
      prisma.user.groupBy({
        by: ['profile'],
        _count: { id: true },
      }),
      prisma.vehicle.groupBy({
        by: ['vehicle_type'],
        _count: { id: true },
      }),
      prisma.vehicle.count({ where: { is_company_vehicle: true } }),
      prisma.vehicle.count({ where: { is_company_vehicle: false } }),
      prisma.vehicle.findMany({
        include: {
          ownerships: true,
        },
        orderBy: { purchase_value: 'desc' },
        take: 10,
      }),
    ])

    // Calcular valores de empresa vs pessoal
    let companyValue = 0
    let personalValue = 0

    for (const vehicle of allVehicles) {
      const fipeValue = await this.getVehicleFipeValue(vehicle)
      if (vehicle.is_company_vehicle) {
        companyValue += fipeValue
      } else {
        personalValue += fipeValue
      }
    }

    // Top veículos
    const topVehicles = []
    for (const vehicle of allVehicles.slice(0, 5)) {
      const fipeValue = await this.getVehicleFipeValue(vehicle)
      topVehicles.push({
        license_plate: vehicle.license_plate,
        brand_model:
        `${vehicle.brand_name || 'N/A'} ${vehicle.model_name || 'N/A'}`.trim(),
        fipe_value: fipeValue,
        owners_count: vehicle.ownerships.length,
      })
    }

    return {
      users_by_profile: usersByProfile.reduce((acc, item) => {
        acc[item.profile] = item._count.id
        return acc
      }, {} as Record<string, number>),
      vehicles_by_type: vehiclesByType.reduce((acc, item) => {
        acc[item.vehicle_type] = item._count.id
        return acc
      }, {} as Record<string, number>),
      company_vs_personal: {
        company_vehicles: companyVehicles,
        personal_vehicles: personalVehicles,
        company_value: companyValue,
        personal_value: personalValue,
      },
      top_vehicles: topVehicles,
    }
  }
}

export const patrimonyService = new PatrimonyService()
