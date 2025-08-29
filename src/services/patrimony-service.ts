import { PrismaClient, VehicleType, UserProfile } from '@prisma/client'
import type { Decimal } from '@prisma/client/runtime/library'
import { FipeCacheService } from './fipe-cache-service'
import { BUSINESS_RULES } from '../constants/business-rules'
import { NotFoundError } from '../utils/error-handler'

const prisma = new PrismaClient()
const fipeCacheService = new FipeCacheService()

export interface VehicleWithDetails {
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

export interface PatrimonyVehicle {
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
}

export interface UserPatrimony {
  user_id: string
  user_name: string
  user_profile: UserProfile
  total_patrimony: number
  personal_vehicles_value: number
  company_participation_value: number
  vehicles: PatrimonyVehicle[]
}

export interface CompanyPatrimonyBreakdown {
  total_company_patrimony: number
  vehicles_count: number
  partners: Array<{
    user_id: string
    user_name: string
    participation_percentage: number
    patrimony_value: number
  }>
}

export interface PatrimonyReport {
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
}

export class PatrimonyService {
  async calculateUserPatrimony(userId: string): Promise<UserPatrimony> {
    console.log(`📊 Calculando patrimônio para usuário ${userId}`)

    const user = await this.getUserWithVehicles(userId)

    console.log(`👤 Usuário encontrado: ${user.name} (${user.profile})`)

    const [personalVehicles, companyParticipation] = await Promise.all([
      this.calculatePersonalVehiclesValue(user.vehicle_ownerships),
      this.calculateCompanyParticipation(user.profile),
    ])

    const totalPatrimony = personalVehicles.totalValue +
      companyParticipation.totalValue
    const allVehicles = [
      ...personalVehicles.vehicles,
      ...companyParticipation.vehicles,
    ]

    console.log(
      `💰 Patrimônio total de ${user.name}: ` +
      `R$ ${totalPatrimony.toLocaleString('pt-BR')}`,
    )

    return {
      user_id: user.id,
      user_name: user.name,
      user_profile: user.profile,
      total_patrimony: totalPatrimony,
      personal_vehicles_value: personalVehicles.totalValue,
      company_participation_value: companyParticipation.totalValue,
      vehicles: allVehicles,
    }
  }

  async calculateCompanyPatrimony(): Promise<CompanyPatrimonyBreakdown> {
    console.log('🏢 Calculando patrimônio da empresa...')

    const companyVehicles = await prisma.vehicle.findMany({
      where: { is_company_vehicle: true },
    })

    const totalValue = await this.calculateVehiclesValue(companyVehicles)
    const partners = await this.getActivePartners()
    const partnersBreakdown = this.distributeCompanyPatrimony(
      partners,
      totalValue,
    )

    console.log(
      `🏢 Patrimônio da empresa: R$ ${totalValue.toLocaleString('pt-BR')}`,
    )

    return {
      total_company_patrimony: totalValue,
      vehicles_count: companyVehicles.length,
      partners: partnersBreakdown,
    }
  }

  async calculateAllPartnersPatrimony(): Promise<UserPatrimony[]> {
    console.log('🤝 Calculando patrimônio de todos os sócios...')

    const partners = await this.getActivePartners()
    return await this.calculateMultipleUsersPatrimony(partners, 'sócio')
  }

  async calculateAllInvestorsPatrimony(): Promise<UserPatrimony[]> {
    console.log('💼 Calculando patrimônio de todos os investidores...')

    const investors = await prisma.user.findMany({
      where: {
        profile: UserProfile.INVESTOR,
        is_active: true,
      },
    })

    return await this.calculateMultipleUsersPatrimony(investors, 'investidor')
  }

  async generateCompletePatrimonyReport(): Promise<PatrimonyReport> {
    console.log('📋 Gerando relatório completo de patrimônio...')

    const [
      companyPatrimony,
      partnersPatrimony,
      investorsPatrimony,
      totalVehicles,
    ] = await Promise.all([
      this.calculateCompanyPatrimony(),
      this.calculateAllPartnersPatrimony(),
      this.calculateAllInvestorsPatrimony(),
      prisma.vehicle.count(),
    ])

    const summary = this.buildPatrimonySummary(
      companyPatrimony,
      partnersPatrimony,
      investorsPatrimony,
      totalVehicles,
    )

    console.log('📊 Relatório completo gerado')
    return {
      company: companyPatrimony,
      partners: partnersPatrimony,
      investors: investorsPatrimony,
      summary,
    }
  }

  async refreshAllVehiclesFipeCache(): Promise<{
    updated: number
    errors: number
  }> {
    return await fipeCacheService.refreshAllVehiclesCache()
  }

  // Private helper methods

  private async getUserWithVehicles(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        vehicle_ownerships: {
          include: { vehicle: true },
        },
      },
    })

    if (!user) {
      throw new NotFoundError('Usuário')
    }

    return user
  }

  private async calculatePersonalVehiclesValue(
    ownerships: Array<{
      ownership_percentage: Decimal
      vehicle: {
        id: string
        license_plate: string
        is_company_vehicle: boolean
        fipe_brand_code: number
        fipe_model_code: number
        year_id: string
        fuel_acronym: string | null
        vehicle_type: VehicleType
        brand_name?: string | null
        model_name?: string | null
        display_year?: number | null
        display_fuel?: string | null
      }
    }>,
  ) {
    const vehicles: PatrimonyVehicle[] = []
    let totalValue = 0

    for (const ownership of ownerships) {
      const vehicle = ownership.vehicle

      if (!vehicle.is_company_vehicle) {
        const fipeResult = await fipeCacheService.getVehicleFipeValue({
          brand_code: vehicle.fipe_brand_code,
          model_code: vehicle.fipe_model_code,
          year_id: vehicle.year_id,
          fuel_acronym: vehicle.fuel_acronym,
          vehicle_type: vehicle.vehicle_type,
        })

        const ownershipPerc = ownership.ownership_percentage.toNumber()
        const userValue = (fipeResult.fipe_value * ownershipPerc) /
          BUSINESS_RULES.OWNERSHIP.MAX_PERCENTAGE
        totalValue += userValue

        vehicles.push({
          vehicle_id: vehicle.id,
          license_plate: vehicle.license_plate,
          ownership_percentage: ownershipPerc,
          fipe_value: fipeResult.fipe_value,
          user_value: userValue,
          vehicle_type: vehicle.vehicle_type,
          is_company_vehicle: false,
          brand_name: vehicle.brand_name,
          model_name: vehicle.model_name,
          display_year: vehicle.display_year,
          display_fuel: vehicle.display_fuel,
        })

        console.log(
          `🚗 ${vehicle.license_plate} (pessoal): ` +
          `R$ ${fipeResult.fipe_value.toLocaleString('pt-BR')} x ` +
          `${ownershipPerc}% = ` +
          `R$ ${userValue.toLocaleString('pt-BR')}`,
        )
      }
    }

    return { vehicles, totalValue }
  }

  private async calculateCompanyParticipation(
    userProfile: UserProfile,
  ) {
    const vehicles: PatrimonyVehicle[] = []
    let totalValue = 0

    if (userProfile !== UserProfile.PARTNER) {
      return { vehicles, totalValue }
    }

    const companyVehicles = await prisma.vehicle.findMany({
      where: { is_company_vehicle: true },
    })

    const partnerCount = await prisma.user.count({
      where: {
        profile: UserProfile.PARTNER,
        is_active: true,
      },
    })

    const participationPercentage = partnerCount > 0
      ? BUSINESS_RULES.OWNERSHIP.MAX_PERCENTAGE / partnerCount
      : 0

    for (const vehicle of companyVehicles) {
      const fipeResult = await fipeCacheService.getVehicleFipeValue({
        brand_code: vehicle.fipe_brand_code,
        model_code: vehicle.fipe_model_code,
        year_id: vehicle.year_id,
        fuel_acronym: vehicle.fuel_acronym,
        vehicle_type: vehicle.vehicle_type,
      })

      const userValue = (fipeResult.fipe_value * participationPercentage) /
        BUSINESS_RULES.OWNERSHIP.MAX_PERCENTAGE
      totalValue += userValue

      vehicles.push({
        vehicle_id: vehicle.id,
        license_plate: vehicle.license_plate,
        ownership_percentage: participationPercentage,
        fipe_value: fipeResult.fipe_value,
        user_value: userValue,
        vehicle_type: vehicle.vehicle_type,
        is_company_vehicle: true,
        brand_name: vehicle.brand_name,
        model_name: vehicle.model_name,
        display_year: vehicle.display_year,
        display_fuel: vehicle.display_fuel,
      })

      console.log(
        `🏢 ${vehicle.license_plate} (empresa): ` +
        `R$ ${fipeResult.fipe_value.toLocaleString('pt-BR')} x ` +
        `${participationPercentage.toFixed(2)}% = ` +
        `R$ ${userValue.toLocaleString('pt-BR')}`,
      )
    }

    return { vehicles, totalValue }
  }

  private async calculateVehiclesValue(vehicles: Array<{
    id: string
    license_plate: string
    fipe_brand_code: number
    fipe_model_code: number
    year_id: string
    fuel_acronym: string | null
    vehicle_type: VehicleType
  }>): Promise<number> {
    let totalValue = 0

    for (const vehicle of vehicles) {
      const fipeResult = await fipeCacheService.getVehicleFipeValue({
        brand_code: vehicle.fipe_brand_code,
        model_code: vehicle.fipe_model_code,
        year_id: vehicle.year_id,
        fuel_acronym: vehicle.fuel_acronym,
        vehicle_type: vehicle.vehicle_type,
      })

      totalValue += fipeResult.fipe_value
      console.log(
        `🚗 ${vehicle.license_plate}: ` +
        `R$ ${fipeResult.fipe_value.toLocaleString('pt-BR')}`,
      )
    }

    return totalValue
  }

  private async getActivePartners() {
    return await prisma.user.findMany({
      where: {
        profile: UserProfile.PARTNER,
        is_active: true,
      },
      select: { id: true, name: true },
    })
  }

  private distributeCompanyPatrimony(
    partners: Array<{ id: string; name: string }>,
    totalValue: number,
  ) {
    const participationPercentage = partners.length > 0
      ? BUSINESS_RULES.OWNERSHIP.MAX_PERCENTAGE / partners.length
      : 0
    const valuePerPartner = totalValue *
      (participationPercentage / BUSINESS_RULES.OWNERSHIP.MAX_PERCENTAGE)

    return partners.map(partner => ({
      user_id: partner.id,
      user_name: partner.name,
      participation_percentage: participationPercentage,
      patrimony_value: valuePerPartner,
    }))
  }

  private async calculateMultipleUsersPatrimony(
    users: Array<{ id: string; name: string }>,
    userType: string,
  ): Promise<UserPatrimony[]> {
    const results: UserPatrimony[] = []

    for (const user of users) {
      console.log(`\n🔍 Processando ${userType}: ${user.name}`)
      const patrimony = await this.calculateUserPatrimony(user.id)
      results.push(patrimony)
    }

    return results
  }

  private buildPatrimonySummary(
    companyPatrimony: CompanyPatrimonyBreakdown,
    partnersPatrimony: UserPatrimony[],
    investorsPatrimony: UserPatrimony[],
    totalVehicles: number,
  ) {
    const partnersPersonalPatrimony = partnersPatrimony.reduce(
      (total, partner) => total + partner.personal_vehicles_value,
      0,
    )

    const investorsPatrimonyTotal = investorsPatrimony.reduce(
      (total, investor) => total + investor.total_patrimony,
      0,
    )

    const summary = {
      total_patrimony: companyPatrimony.total_company_patrimony +
        partnersPersonalPatrimony + investorsPatrimonyTotal,
      company_patrimony: companyPatrimony.total_company_patrimony,
      partners_personal_patrimony: partnersPersonalPatrimony,
      investors_patrimony: investorsPatrimonyTotal,
      total_vehicles: totalVehicles,
    }

    console.log('📊 Resumo:')
    console.log(
      `• Empresa: R$ ${summary.company_patrimony.toLocaleString('pt-BR')}`,
    )
    console.log(
      '• Sócios pessoal: ' +
        `R$ ${summary.partners_personal_patrimony.toLocaleString('pt-BR')}`,
    )
    console.log(
      `• Investidores: R$ ${summary.investors_patrimony.toLocaleString(
        'pt-BR',
      )}`,
    )
    console.log(
      `• Total: R$ ${summary.total_patrimony.toLocaleString('pt-BR')}`,
    )

    return summary
  }
}
