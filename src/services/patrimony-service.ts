import { PrismaClient, VehicleType, UserProfile } from '@prisma/client'
import { fipeAPI, VehicleType as ApiVehicleType } from '../lib/fipe-api'

const prisma = new PrismaClient()

interface VehicleWithDetails {
  id: string
  fipe_brand_code: number
  fipe_model_code: number
  year_id: string
  fuel_acronym: string | null
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
  company_participation_value: number
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
  private async getVehicleFipeValue(
    vehicle: VehicleWithDetails): Promise<number> {
    try {
      console.log(`Buscando valor FIPE para ${vehicle.license_plate}...`)

      if (!vehicle.fipe_brand_code || !vehicle.fipe_model_code ||
        !vehicle.year_id) {
        console.warn(`Dados FIPE incompletos para ${vehicle.license_plate}`)
        return 0
      }

      // Tratar fuel_acronym NULL
      let fuelAcronym = vehicle.fuel_acronym
      if (!fuelAcronym) {
        fuelAcronym = '1' // Gasolina como padrão
        console.log(
          `fuel_acronym NULL para ${vehicle.license_plate}, usando padrão: ` +
          `${fuelAcronym}`,
        )
      }

      // Verificar cache
      const cachedValue = await prisma.fipeCache.findUnique({
        where: {
          brand_code_model_code_year_id_fuel_acronym_vehicle_type: {
            brand_code: vehicle.fipe_brand_code,
            model_code: vehicle.fipe_model_code,
            year_id: vehicle.year_id,
            fuel_acronym: fuelAcronym,
            vehicle_type: vehicle.vehicle_type,
          },
        },
      })

      if (cachedValue) {
        console.log(
          `Cache encontrado para ${vehicle.license_plate}: R$ ` +
          `${Number(cachedValue.fipe_value).toLocaleString('pt-BR')}`,
        )
        return Number(cachedValue.fipe_value)
      }

      console.log(`Buscando na API FIPE para ${vehicle.license_plate}...`)

      const apiVehicleType: ApiVehicleType =
        vehicle.vehicle_type === VehicleType.cars
          ? 'cars'
          : 'motorcycles'
      const fipeData = await fipeAPI.getValue(
        apiVehicleType,
        vehicle.fipe_brand_code,
        vehicle.fipe_model_code,
        vehicle.year_id,
      )

      if (!fipeData?.price) {
        console.warn(
          `Valor FIPE não encontrado na API para ${vehicle.license_plate}`)

        // Buscar último valor conhecido
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
            'Usando último valor conhecido: R$ ' +
            `${Number(lastKnownValue.fipe_value).toLocaleString('pt-BR')}`,
          )
          return Number(lastKnownValue.fipe_value)
        }

        return 0
      }

      const fipeValue =
        Number(fipeData.price.replace(/[R$\s.]/g, '').replace(',', '.'))

      // Salvar no cache
      await prisma.fipeCache.create({
        data: {
          brand_code: vehicle.fipe_brand_code,
          model_code: vehicle.fipe_model_code,
          year_id: vehicle.year_id,
          fuel_acronym: fuelAcronym,
          vehicle_type: vehicle.vehicle_type,
          fipe_value: fipeValue,
          brand_name: fipeData.brand || null,
          model_name: fipeData.model || null,
          model_year: fipeData.modelYear || null,
          fuel_name: fipeData.fuel || null,
          code_fipe: fipeData.codeFipe || null,
          reference_month: fipeData.referenceMonth || 'N/A',
        },
      })

      console.log(
        `Valor FIPE obtido e cacheado: ${vehicle.license_plate} = R$ ` +
        `${fipeValue.toLocaleString('pt-BR')}`,
      )
      return fipeValue
    } catch (error) {
      console.error(
        `Erro ao obter valor FIPE para ${vehicle.license_plate}:`, error)

      // Em caso de erro, buscar último valor conhecido
      try {
        const lastKnownValue = await prisma.fipeCache.findFirst({
          where: {
            brand_code: vehicle.fipe_brand_code,
            model_code: vehicle.fipe_model_code,
            vehicle_type: vehicle.vehicle_type,
          },
          orderBy: { created_at: 'desc' },
        })

        if (lastKnownValue) {
          console.log(`Erro na API, usando valor em cache: R$ ${Number(lastKnownValue.fipe_value).toLocaleString('pt-BR')}`)
          return Number(lastKnownValue.fipe_value)
        }
      } catch (cacheError) {
        console.error('Erro ao buscar cache:', cacheError)
      }

      return 0
    }
  }

  async calculateUserPatrimony(userId: string): Promise<UserPatrimony> {
    console.log(`Calculando patrimônio para usuário ${userId}`)

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

    console.log(`Usuário encontrado: ${user.name} (${user.profile})`)

    const vehicles = []
    let personalVehiclesValue = 0
    let companyParticipationValue = 0

    // 1. CALCULAR VEÍCULOS PESSOAIS (usando vehicle_ownerships)
    for (const ownership of user.vehicle_ownerships) {
      const vehicle = ownership.vehicle

      // Só processar veículos pessoais aqui
      if (!vehicle.is_company_vehicle) {
        console.log(`Processando veículo pessoal: ${vehicle.license_plate}`)

        const fipeValue = await this.getVehicleFipeValue(vehicle)
        const userValue = (fipeValue * Number(ownership.ownership_percentage)) / 100
        personalVehiclesValue += userValue

        vehicles.push({
          vehicle_id: vehicle.id,
          license_plate: vehicle.license_plate,
          ownership_percentage: Number(ownership.ownership_percentage),
          fipe_value: fipeValue,
          user_value: userValue,
          vehicle_type: vehicle.vehicle_type,
          is_company_vehicle: false,
          brand_name: vehicle.brand_name,
          model_name: vehicle.model_name,
          display_year: vehicle.display_year,
          display_fuel: vehicle.display_fuel,
        })

        console.log(`${vehicle.license_plate} (pessoal): R$ ${fipeValue.toLocaleString('pt-BR')} x ${ownership.ownership_percentage}% = R$ ${userValue.toLocaleString('pt-BR')}`)
      }
    }

    // 2. CALCULAR PARTICIPAÇÃO NOS VEÍCULOS DA EMPRESA (só para sócios)
    if (user.profile === UserProfile.PARTNER) {
      // Buscar total de sócios ativos
      const totalActivePartners = await prisma.user.count({
        where: {
          profile: UserProfile.PARTNER,
          is_active: true,
        },
      })

      // Buscar todos os veículos da empresa
      const companyVehicles = await prisma.vehicle.findMany({
        where: { is_company_vehicle: true },
      })

      console.log(`Total de sócios ativos: ${totalActivePartners}`)
      console.log(`Veículos da empresa: ${companyVehicles.length}`)

      // Calcular participação igual para todos os sócios
      const partnerParticipationPercentage = totalActivePartners > 0
        ? 100 / totalActivePartners
        : 0

      for (const vehicle of companyVehicles) {
        console.log(`Processando veículo da empresa: ${vehicle.license_plate}`)

        const fipeValue = await this.getVehicleFipeValue(vehicle)
        const userValue = (fipeValue * partnerParticipationPercentage) / 100
        companyParticipationValue += userValue

        vehicles.push({
          vehicle_id: vehicle.id,
          license_plate: vehicle.license_plate,
          ownership_percentage: partnerParticipationPercentage,
          fipe_value: fipeValue,
          user_value: userValue,
          vehicle_type: vehicle.vehicle_type,
          is_company_vehicle: true,
          brand_name: vehicle.brand_name,
          model_name: vehicle.model_name,
          display_year: vehicle.display_year,
          display_fuel: vehicle.display_fuel,
        })

        console.log(`${vehicle.license_plate} (empresa): R$ ${fipeValue.toLocaleString('pt-BR')} x ${partnerParticipationPercentage.toFixed(2)}% = R$ ${userValue.toLocaleString('pt-BR')}`)
      }
    }

    const totalPatrimony = personalVehiclesValue + companyParticipationValue

    console.log(`Patrimônio total de ${user.name}: R$ ${totalPatrimony.toLocaleString('pt-BR')}`)
    console.log(`- Veículos pessoais: R$ ${personalVehiclesValue.toLocaleString('pt-BR')}`)
    console.log(`- Participação na empresa: R$ ${companyParticipationValue.toLocaleString('pt-BR')}`)

    return {
      user_id: user.id,
      user_name: user.name,
      user_profile: user.profile,
      total_patrimony: totalPatrimony,
      personal_vehicles_value: personalVehiclesValue,
      company_participation_value: companyParticipationValue,
      vehicles,
    }
  }

  async calculateCompanyPatrimony(): Promise<CompanyPatrimonyBreakdown> {
    console.log('Calculando patrimônio da empresa...')

    const companyVehicles = await prisma.vehicle.findMany({
      where: { is_company_vehicle: true },
    })

    console.log(`Veículos da empresa encontrados: ${companyVehicles.length}`)

    let totalCompanyPatrimony = 0

    for (const vehicle of companyVehicles) {
      console.log(`Processando veículo da empresa: ${vehicle.license_plate}`)
      const fipeValue = await this.getVehicleFipeValue(vehicle)
      totalCompanyPatrimony += fipeValue
      console.log(`${vehicle.license_plate}: R$ ${fipeValue.toLocaleString('pt-BR')}`)
    }

    // Buscar todos os sócios ativos para distribuir a participação
    const activePartners = await prisma.user.findMany({
      where: {
        profile: UserProfile.PARTNER,
        is_active: true,
      },
      select: {
        id: true,
        name: true,
      },
    })

    const participationPercentage = activePartners.length > 0
      ? 100 / activePartners.length
      : 0
    const valuePerPartner = totalCompanyPatrimony * (participationPercentage / 100)

    const partners = activePartners.map(partner => ({
      user_id: partner.id,
      user_name: partner.name,
      participation_percentage: participationPercentage,
      patrimony_value: valuePerPartner,
    }))

    console.log(`Patrimônio total da empresa: R$ ${totalCompanyPatrimony.toLocaleString('pt-BR')}`)
    console.log(`Participação por sócio (${participationPercentage.toFixed(2)}%): R$ ${valuePerPartner.toLocaleString('pt-BR')}`)

    return {
      total_company_patrimony: totalCompanyPatrimony,
      vehicles_count: companyVehicles.length,
      partners,
    }
  }

  async calculateAllPartnersPatrimony(): Promise<UserPatrimony[]> {
    console.log('Calculando patrimônio de todos os sócios...')

    const partners = await prisma.user.findMany({
      where: {
        profile: UserProfile.PARTNER,
        is_active: true,
      },
    })

    const partnersPatrimony: UserPatrimony[] = []

    for (const partner of partners) {
      console.log(`\nProcessando sócio: ${partner.name}`)
      const patrimony = await this.calculateUserPatrimony(partner.id)
      partnersPatrimony.push(patrimony)
    }

    return partnersPatrimony
  }

  async calculateAllInvestorsPatrimony(): Promise<UserPatrimony[]> {
    console.log('Calculando patrimônio de todos os investidores...')

    const investors = await prisma.user.findMany({
      where: {
        profile: UserProfile.INVESTOR,
        is_active: true,
      },
    })

    const investorsPatrimony: UserPatrimony[] = []

    for (const investor of investors) {
      console.log(`\nProcessando investidor: ${investor.name}`)
      const patrimony = await this.calculateUserPatrimony(investor.id)
      investorsPatrimony.push(patrimony)
    }

    return investorsPatrimony
  }

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
    console.log('Gerando relatório completo de patrimônio...')

    const [companyPatrimony, partnersPatrimony, investorsPatrimony] = await Promise.all([
      this.calculateCompanyPatrimony(),
      this.calculateAllPartnersPatrimony(),
      this.calculateAllInvestorsPatrimony(),
    ])

    const partnersPersonalPatrimony = partnersPatrimony.reduce(
      (total, partner) => total + partner.personal_vehicles_value, 0,
    )

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

    console.log('Resumo do relatório:')
    console.log(`Patrimônio da empresa: R$ ${summary.company_patrimony.toLocaleString('pt-BR')}`)
    console.log(`Patrimônio pessoal sócios: R$ ${summary.partners_personal_patrimony.toLocaleString('pt-BR')}`)
    console.log(`Patrimônio investidores: R$ ${summary.investors_patrimony.toLocaleString('pt-BR')}`)
    console.log(`Patrimônio total: R$ ${summary.total_patrimony.toLocaleString('pt-BR')}`)
    console.log(`Total de veículos: ${summary.total_vehicles}`)

    return {
      company: companyPatrimony,
      partners: partnersPatrimony,
      investors: investorsPatrimony,
      summary,
    }
  }

  async refreshAllVehiclesFipeCache(): Promise<{ updated: number; errors: number }> {
    console.log('Iniciando atualização do cache FIPE...')

    const vehicles = await prisma.vehicle.findMany()
    let updated = 0
    let errors = 0

    for (const vehicle of vehicles) {
      try {
        console.log(`Atualizando cache para ${vehicle.license_plate}...`)

        // Remover cache antigo
        await prisma.fipeCache.deleteMany({
          where: {
            brand_code: vehicle.fipe_brand_code,
            model_code: vehicle.fipe_model_code,
            year_id: vehicle.year_id,
            vehicle_type: vehicle.vehicle_type,
          },
        })

        // Buscar novo valor
        const fipeValue = await this.getVehicleFipeValue(vehicle)
        if (fipeValue > 0) {
          updated++
        }

        // Delay para não sobrecarregar API
        await new Promise(resolve => setTimeout(resolve, 1500))
      } catch (error) {
        console.error(`Erro ao atualizar ${vehicle.license_plate}:`, error)
        errors++
      }
    }

    console.log(`Cache atualizado: ${updated} sucessos, ${errors} erros`)
    return { updated, errors }
  }
}
