import { PrismaClient, VehicleType, UserProfile } from '@prisma/client'
import { fipeAPI, VehicleType as ApiVehicleType } from '../lib/fipe-api'

const prisma = new PrismaClient()

// Interface para o veículo com includes (CORRIGIDA PARA NOVOS CAMPOS)
interface VehicleWithDetails {
  id: string
  fipe_brand_code: number
  fipe_model_code: number
  year_id: string
  fuel_acronym: string
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
  personal_vehicles_value: number
  company_vehicles_value: number
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
    console.log(
      `🚗 Veículos com participação: ${user.vehicle_ownerships.length}`)

    const vehicles = []
    let totalPatrimony = 0
    let personalVehiclesValue = 0
    let companyVehiclesValue = 0

    for (const ownership of user.vehicle_ownerships) {
      console.log(`🔍 Processando veículo ${ownership.vehicle.license_plate}...`)

      const fipeValue = await this.getVehicleFipeValue(ownership.vehicle)
      const userValue = (
        fipeValue * Number(ownership.ownership_percentage)) / 100

      // ✅ CORREÇÃO: Separar veículos pessoais dos da empresa
      if (ownership.vehicle.is_company_vehicle) {
        companyVehiclesValue += userValue
      } else {
        personalVehiclesValue += userValue
      }

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

      console.log(
        `${ownership.vehicle.license_plate}: ` +
        `R$ ${fipeValue.toLocaleString('pt-BR')} (` +
        `${ownership.ownership_percentage}% = ` +
        `R$ ${userValue.toLocaleString('pt-BR')}) ` +
        `[${ownership.vehicle.is_company_vehicle
? 'EMPRESA'
: 'PESSOAL'}]`,
      )
    }

    console.log(
      `✅ Patrimônio total de ${user.name}: ` +
      `R$ ${totalPatrimony.toLocaleString('pt-BR')} ` +
      `(Pessoal: R$ ${personalVehiclesValue.toLocaleString('pt-BR')}, ` +
      `Empresa: R$ ${companyVehiclesValue.toLocaleString('pt-BR')})`,
    )

    return {
      user_id: user.id,
      user_name: user.name,
      user_profile: user.profile,
      total_patrimony: totalPatrimony,
      personal_vehicles_value: personalVehiclesValue,
      company_vehicles_value: companyVehiclesValue,
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
        const userValue = (
          fipeValue * Number(ownership.ownership_percentage)) / 100

        if (partnersParticipation.has(ownership.user_id)) {
          partnersParticipation.get(ownership.user_id)!.patrimony_value +=
            userValue
        } else {
          partnersParticipation.set(ownership.user_id, {
            user_id: ownership.user_id,
            user_name: ownership.user.name,
            patrimony_value: userValue,
          })
        }

        console.log(
          `${ownership.user.name}: ${ownership.ownership_percentage}% = ` +
          `R$ ${userValue.toLocaleString('pt-BR')}`,
        )
      }
    }

    // Calcular percentual de participação de cada sócio
    const partners = Array.from(
      partnersParticipation.values()).map(partner => ({
      ...partner,
      participation_percentage: totalCompanyPatrimony > 0
        ? (partner.patrimony_value / totalCompanyPatrimony) * 100
        : 0,
    }))

    console.log(
      '✅ Patrimônio total da empresa: ' +
      `R$ ${totalCompanyPatrimony.toLocaleString('pt-BR')}`,
    )

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
      partners_company_participation: number
      investors_patrimony: number
      total_vehicles: number
    }
  }> {
    console.log('📊 Gerando relatório completo de patrimônio...')

    const [
      companyPatrimony,
      partnersPatrimony,
      investorsPatrimony,
    ] = await Promise.all([
      this.calculateCompanyPatrimony(),
      this.calculateAllPartnersPatrimony(),
      this.calculateAllInvestorsPatrimony(),
    ])

    // Calcular patrimônio pessoal dos sócios (excluindo veículos da empresa)
    const partnersPersonalPatrimony = partnersPatrimony.reduce(
      (total, partner) => total + partner.personal_vehicles_value, 0)

    // ✅ NOVO: Calcular participação dos sócios nos veículos da empresa
    const partnersCompanyParticipation = partnersPatrimony.reduce(
      (total, partner) => total + partner.company_vehicles_value, 0)

    const investorsPatrimonyTotal = investorsPatrimony.reduce(
      (total, investor) => total + investor.total_patrimony, 0,
    )

    const totalVehicles = await prisma.vehicle.count()

    const summary = {
      total_patrimony:
        companyPatrimony.total_company_patrimony + partnersPersonalPatrimony +
        investorsPatrimonyTotal,
      company_patrimony: companyPatrimony.total_company_patrimony,
      partners_personal_patrimony: partnersPersonalPatrimony,
      partners_company_participation: partnersCompanyParticipation, // ✅ NOVO
      investors_patrimony: investorsPatrimonyTotal,
      total_vehicles: totalVehicles,
    }

    console.log('📈 Resumo do relatório:')
    console.log(
      '🏢 Patrimônio da empresa: ' +
      `R$ ${summary.company_patrimony.toLocaleString('pt-BR')}`,
    )
    console.log(
      '🤝 Patrimônio pessoal sócios: ' +
      `R$ ${summary.partners_personal_patrimony.toLocaleString('pt-BR')}`,
    )
    console.log(
      '📊 Participação sócios na empresa: ' +
      `R$ ${summary.partners_company_participation.toLocaleString('pt-BR')}`,
    )
    console.log(
      '💼 Patrimônio investidores: ' +
      `R$ ${summary.investors_patrimony.toLocaleString('pt-BR')}`,
    )
    console.log(
      '💰 Patrimônio total: ' +
      `R$ ${summary.total_patrimony.toLocaleString('pt-BR')}`,
    )
    console.log(`🚗 Total de veículos: ${summary.total_vehicles}`)

    return {
      company: companyPatrimony,
      partners: partnersPatrimony,
      investors: investorsPatrimony,
      summary,
    }
  }

  // Buscar valor FIPE do veículo (com cache)
  async getVehicleFipeValue(vehicle: VehicleWithDetails): Promise<number> {
    try {
      // Verificar se já existe cache
      const cachedValue = await prisma.fipeCache.findUnique({
        where: {
          brand_code_model_code_year_id_fuel_acronym_vehicle_type: {
            brand_code: vehicle.fipe_brand_code,
            model_code: vehicle.fipe_model_code,
            year_id: vehicle.year_id,
            fuel_acronym: vehicle.fuel_acronym,
            vehicle_type: vehicle.vehicle_type,
          },
        },
      })

      if (cachedValue) {
        console.log(
          `💾 Cache FIPE encontrado para ${vehicle.license_plate}: ` +
          `R$ ${Number(cachedValue.fipe_value).toLocaleString('pt-BR')}`,
        )
        return Number(cachedValue.fipe_value)
      }

      console.log(
        `🌐 Buscando valor FIPE na API para ${vehicle.license_plate}...`,
      )

      // Mapear VehicleType para o formato da API
      const apiVehicleType: ApiVehicleType =
        vehicle.vehicle_type === VehicleType.cars
          ? 'cars'
          : 'motorcycles'

      // Buscar na API FIPE
      const fipeData = await fipeAPI.getValue(
        apiVehicleType,
        vehicle.fipe_brand_code,
        vehicle.fipe_model_code,
        vehicle.year_id,
      )

      if (!fipeData.price) {
        console.warn(
          `⚠️ Valor FIPE não encontrado para ${vehicle.license_plate}`,
        )
        return 0
      }

      // Parse do valor FIPE (API v2 usa formato diferente)
      const fipeValue = Number(
        fipeData.price.replace(/[R$\s.]/g, '').replace(',', '.'),
      )

      // Salvar no cache
      await prisma.fipeCache.create({
        data: {
          brand_code: vehicle.fipe_brand_code,
          model_code: vehicle.fipe_model_code,
          year_id: vehicle.year_id,
          fuel_acronym: vehicle.fuel_acronym,
          vehicle_type: vehicle.vehicle_type,
          fipe_value: fipeValue,
          brand_name: fipeData.brand,
          model_name: fipeData.model,
          model_year: fipeData.modelYear,
          fuel_name: fipeData.fuel,
          code_fipe: fipeData.codeFipe,
          reference_month: fipeData.referenceMonth,
        },
      })

      console.log(
        `💰 Valor FIPE obtido para ${vehicle.license_plate}: ` +
        `R$ ${fipeValue.toLocaleString('pt-BR')} (${fipeData.referenceMonth})`,
      )

      return fipeValue
    } catch (error) {
      console.error(
        `❌ Erro ao obter valor FIPE para ${vehicle.license_plate}:`,
        error,
      )
      return 0
    }
  }

  // Atualizar cache FIPE de todos os veículos
  async refreshAllVehiclesFipeCache(): Promise<{
    updated: number
    errors: number
  }> {
    console.log('🔄 Iniciando atualização do cache FIPE...')

    const vehicles = await prisma.vehicle.findMany()
    let updated = 0
    let errors = 0

    for (const vehicle of vehicles) {
      try {
        console.log(`🔄 Atualizando cache FIPE para ${vehicle.license_plate}`)

        // Remover cache existente
        await prisma.fipeCache.deleteMany({
          where: {
            brand_code: vehicle.fipe_brand_code,
            model_code: vehicle.fipe_model_code,
            year_id: vehicle.year_id,
            fuel_acronym: vehicle.fuel_acronym,
            vehicle_type: vehicle.vehicle_type,
          },
        })

        // Buscar novo valor
        await this.getVehicleFipeValue(vehicle)
        updated++

        // Delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(
          `❌ Erro ao atualizar cache FIPE para ${vehicle.license_plate}:`,
          error,
        )
        errors++
      }
    }

    console.log(
      `✅ Cache FIPE atualizado: ${updated} sucessos, ${errors} erros`,
    )

    return { updated, errors }
  }
}
