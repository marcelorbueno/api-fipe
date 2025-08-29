import { PrismaClient, VehicleType, UserProfile } from '@prisma/client'
import type { Decimal } from '@prisma/client/runtime/library'
import { BUSINESS_RULES, FUEL_TYPES } from '../constants/business-rules'
import { ConflictError, NotFoundError } from '../utils/error-handler'
import axios from '../config/axios'
import { env } from '../env'

const prisma = new PrismaClient()

export interface VehicleCreateData {
  license_plate: string
  renavam: string
  fipe_brand_code: number
  fipe_model_code: number
  year_id: string
  fuel_acronym?: string
  vehicle_type: string
  display_year?: number
  display_fuel?: string
  brand_name?: string
  model_name?: string
  color?: string
  observations?: string
  purchase_date?: string
  purchase_value?: number
  is_company_vehicle: boolean
}

export type VehicleUpdateData = Partial<VehicleCreateData>

export interface VehicleWithOwnerships {
  id: string
  license_plate: string
  renavam: string
  fipe_brand_code: number
  fipe_model_code: number
  year_id: string
  fuel_acronym?: string | null
  vehicle_type: VehicleType
  display_year?: number | null
  display_fuel?: string | null
  brand_name?: string | null
  model_name?: string | null
  color?: string | null
  observations?: string | null
  purchase_date?: Date | null
  purchase_value?: Decimal | null
  is_company_vehicle: boolean
  created_at: Date
  updated_at: Date
  ownerships: Array<{
    id: string
    ownership_percentage: Decimal
    user: {
      id: string
      name: string
      email: string
      profile: UserProfile
    }
  }>
}

export class VehicleService {
  async createVehicle(
    data: VehicleCreateData,
  ): Promise<VehicleWithOwnerships> {
    await this.validateUniqueFields(data.license_plate, data.renavam)

    const enrichedData = await this.enrichVehicleData(data)
    const vehicle = await this.saveVehicle(enrichedData)

    if (data.is_company_vehicle) {
      await this.createCompanyVehicleOwnerships(vehicle.id)
    }

    return await this.getVehicleWithOwnerships(vehicle.id)
  }

  async updateVehicle(
    id: string,
    data: VehicleUpdateData,
  ): Promise<VehicleWithOwnerships> {
    const existingVehicle = await this.getVehicleById(id)

    if (
      data.license_plate &&
      data.license_plate !== existingVehicle.license_plate
    ) {
      await this.validateUniquePlate(data.license_plate)
    }

    if (data.renavam && data.renavam !== existingVehicle.renavam) {
      await this.validateUniqueRenavam(data.renavam)
    }

    const enrichedData = await this.enrichVehicleDataForUpdate(
      existingVehicle,
      data,
    )

    await prisma.vehicle.update({
      where: { id },
      data: this.buildUpdateData(existingVehicle, enrichedData),
    })

    return await this.getVehicleWithOwnerships(id)
  }

  async getVehicleWithOwnerships(
    id: string,
  ): Promise<VehicleWithOwnerships> {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        ownerships: {
          include: {
            user: {
              select: { id: true, name: true, email: true, profile: true },
            },
          },
        },
      },
    })

    if (!vehicle) {
      throw new NotFoundError('Veículo')
    }

    return vehicle
  }

  async deleteVehicle(id: string): Promise<{
    license_plate: string
    deleted_ownerships: number
  }> {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { ownerships: true },
    })

    if (!vehicle) {
      throw new NotFoundError('Veículo')
    }

    await prisma.vehicle.delete({ where: { id } })

    console.log(
      `🗑️ Veículo ${vehicle.license_plate} deletado ` +
        `(${vehicle.ownerships.length} participações removidas)`,
    )

    return {
      license_plate: vehicle.license_plate,
      deleted_ownerships: vehicle.ownerships.length,
    }
  }

  async addOwnership(
    vehicleId: string,
    userId: string,
    ownershipPercentage: number,
  ) {
    await this.validateOwnershipCreation(
      vehicleId,
      userId,
      ownershipPercentage,
    )

    const ownership = await prisma.vehicleOwnership.create({
      data: {
        vehicle_id: vehicleId,
        user_id: userId,
        ownership_percentage: ownershipPercentage,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, profile: true },
        },
      },
    })

    console.log(
      `👥 Participação criada: ${ownership.user.name} - ` +
        `${ownershipPercentage}%`,
    )
    return ownership
  }

  async updateOwnership(
    vehicleId: string,
    userId: string,
    ownershipPercentage: number,
  ) {
    await this.validateOwnershipUpdate(
      vehicleId,
      userId,
      ownershipPercentage,
    )

    return await prisma.vehicleOwnership.update({
      where: {
        vehicle_id_user_id: {
          vehicle_id: vehicleId,
          user_id: userId,
        },
      },
      data: { ownership_percentage: ownershipPercentage },
      include: {
        user: {
          select: { id: true, name: true, email: true, profile: true },
        },
      },
    })
  }

  async deleteOwnership(vehicleId: string, userId: string) {
    const ownership = await prisma.vehicleOwnership.findUnique({
      where: {
        vehicle_id_user_id: {
          vehicle_id: vehicleId,
          user_id: userId,
        },
      },
      include: { user: true, vehicle: true },
    })

    if (!ownership) {
      throw new NotFoundError('Participação')
    }

    await prisma.vehicleOwnership.delete({
      where: {
        vehicle_id_user_id: {
          vehicle_id: vehicleId,
          user_id: userId,
        },
      },
    })

    console.log(
      `🗑️ Participação removida: ${ownership.user.name} do ` +
        `veículo ${ownership.vehicle.license_plate}`,
    )

    return ownership
  }

  // Private helper methods

  private async validateUniqueFields(
    licensePlate: string,
    renavam: string,
  ) {
    const [existingPlate, existingRenavam] = await Promise.all([
      prisma.vehicle.findUnique({
        where: { license_plate: licensePlate },
      }),
      prisma.vehicle.findUnique({ where: { renavam } }),
    ])

    if (existingPlate) {
      throw new ConflictError(
        'Já existe um veículo cadastrado com esta placa',
      )
    }

    if (existingRenavam) {
      throw new ConflictError(
        'Já existe um veículo cadastrado com este RENAVAM',
      )
    }
  }

  private async validateUniquePlate(licensePlate: string) {
    const existing = await prisma.vehicle.findUnique({
      where: { license_plate: licensePlate },
    })
    if (existing) {
      throw new ConflictError(
        'Já existe um veículo cadastrado com esta placa',
      )
    }
  }

  private async validateUniqueRenavam(renavam: string) {
    const existing = await prisma.vehicle.findUnique({ where: { renavam } })
    if (existing) {
      throw new ConflictError(
        'Já existe um veículo cadastrado com este RENAVAM',
      )
    }
  }

  private async getVehicleById(id: string) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id } })
    if (!vehicle) {
      throw new NotFoundError('Veículo')
    }
    return vehicle
  }

  private async enrichVehicleData(data: VehicleCreateData) {
    if (this.hasAllFipeData(data)) {
      return data
    }

    try {
      console.log('🌐 Buscando dados FIPE automaticamente...')
      const fipeData = await this.fetchFipeData(data)

      return {
        ...data,
        fuel_acronym: data.fuel_acronym || fipeData.fuelAcronym,
        display_fuel: data.display_fuel || fipeData.fuel,
        brand_name: data.brand_name || fipeData.brand,
        model_name: data.model_name || fipeData.model,
        display_year: data.display_year ||
          this.extractYearFromYearId(data.year_id),
      }
    } catch (error) {
      console.warn('⚠️ Erro ao buscar dados FIPE, usando fallbacks:', error)
      return this.applyFallbacks(data)
    }
  }

  private async enrichVehicleDataForUpdate(
    existingVehicle: Omit<VehicleWithOwnerships, 'ownerships'>,
    data: VehicleUpdateData,
  ) {
    const fipeFieldsChanged = !!(
      data.fipe_brand_code ||
      data.fipe_model_code ||
      data.year_id ||
      data.vehicle_type
    )
    const needsEnrichment = fipeFieldsChanged &&
      this.hasMissingFipeData(data, existingVehicle)

    if (!needsEnrichment) {
      return data
    }

    try {
      console.log('🌐 Buscando dados FIPE atualizados...')
      const mergedData = {
        ...existingVehicle,
        ...data,
        fuel_acronym: data.fuel_acronym ??
          existingVehicle.fuel_acronym ??
          undefined,
      }
      const fipeData = await this.fetchFipeData(mergedData)

      return {
        ...data,
        fuel_acronym: data.fuel_acronym !== undefined
          ? data.fuel_acronym
          : fipeData.fuelAcronym,
        display_fuel: data.display_fuel !== undefined
          ? data.display_fuel
          : fipeData.fuel,
        brand_name: data.brand_name !== undefined
          ? data.brand_name
          : fipeData.brand,
        model_name: data.model_name !== undefined
          ? data.model_name
          : fipeData.model,
      }
    } catch (error) {
      console.warn('⚠️ Erro ao buscar dados FIPE atualizados:', error)
      return this.applyFallbacksForUpdate(data, existingVehicle)
    }
  }

  private hasAllFipeData(data: VehicleCreateData): boolean {
    return !!(
      data.fuel_acronym &&
      data.display_fuel &&
      data.brand_name &&
      data.model_name
    )
  }

  private hasMissingFipeData(
    data: VehicleUpdateData,
    existing: Omit<VehicleWithOwnerships, 'ownerships'>,
  ): boolean {
    const finalFuelAcronym = data.fuel_acronym !== undefined
      ? data.fuel_acronym
      : existing.fuel_acronym
    const finalDisplayFuel = data.display_fuel !== undefined
      ? data.display_fuel
      : existing.display_fuel
    const finalBrandName = data.brand_name !== undefined
      ? data.brand_name
      : existing.brand_name
    const finalModelName = data.model_name !== undefined
      ? data.model_name
      : existing.model_name

    return !finalFuelAcronym ||
      !finalDisplayFuel ||
      !finalBrandName ||
      !finalModelName
  }

  private async fetchFipeData(data: {
    vehicle_type: string
    fipe_brand_code?: number
    fipe_model_code?: number
    year_id?: string
  }) {
    const fipeUrl = `${env.API_FIPE_PATH}/${data.vehicle_type}/brands/` +
      `${data.fipe_brand_code}/models/${data.fipe_model_code}/years/` +
      `${data.year_id}`

    const response = await axios.get(fipeUrl, {
      params: { reference: env.FIPE_REFERENCE },
      timeout: BUSINESS_RULES.FIPE.REQUEST_TIMEOUT_MS,
    })

    return response.data
  }

  private applyFallbacks(data: VehicleCreateData) {
    return {
      ...data,
      display_fuel: data.display_fuel ||
        this.mapFuelAcronymToDisplay(data.fuel_acronym),
      display_year: data.display_year ||
        this.extractYearFromYearId(data.year_id),
    }
  }

  private applyFallbacksForUpdate(
    data: VehicleUpdateData,
    existing: Omit<VehicleWithOwnerships, 'ownerships'>,
  ) {
    const finalFuelAcronym = data.fuel_acronym !== undefined
      ? data.fuel_acronym
      : existing.fuel_acronym

    return {
      ...data,
      display_fuel: data.display_fuel !== undefined
        ? data.display_fuel
        : (existing.display_fuel ||
          this.mapFuelAcronymToDisplay(finalFuelAcronym ?? undefined)),
    }
  }

  private mapFuelAcronymToDisplay(fuelAcronym?: string): string | undefined {
    if (!fuelAcronym) return undefined
    return FUEL_TYPES[fuelAcronym.toUpperCase() as keyof typeof FUEL_TYPES] ||
      fuelAcronym
  }

  private extractYearFromYearId(yearId: string): number | undefined {
    const match = yearId.match(/^(\d{4})/)
    return match
      ? parseInt(match[1])
      : undefined
  }

  private async saveVehicle(data: VehicleCreateData) {
    return await prisma.vehicle.create({
      data: {
        license_plate: data.license_plate,
        renavam: data.renavam,
        fipe_brand_code: data.fipe_brand_code,
        fipe_model_code: data.fipe_model_code,
        year_id: data.year_id,
        fuel_acronym: data.fuel_acronym || null,
        vehicle_type: data.vehicle_type as VehicleType,
        display_year: data.display_year || undefined,
        display_fuel: data.display_fuel || undefined,
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
    })
  }

  private buildUpdateData(
    existing: Omit<VehicleWithOwnerships, 'ownerships'>,
    data: VehicleUpdateData,
  ) {
    return {
      license_plate: data.license_plate ?? existing.license_plate,
      renavam: data.renavam ?? existing.renavam,
      fipe_brand_code: data.fipe_brand_code ?? existing.fipe_brand_code,
      fipe_model_code: data.fipe_model_code ?? existing.fipe_model_code,
      year_id: data.year_id ?? existing.year_id,
      fuel_acronym: data.fuel_acronym !== undefined
        ? data.fuel_acronym
        : existing.fuel_acronym,
      vehicle_type: data.vehicle_type
        ? data.vehicle_type as VehicleType
        : existing.vehicle_type,
      display_year: data.display_year !== undefined
        ? data.display_year
        : existing.display_year,
      display_fuel: data.display_fuel !== undefined
        ? data.display_fuel
        : existing.display_fuel,
      brand_name: data.brand_name !== undefined
        ? data.brand_name
        : existing.brand_name,
      model_name: data.model_name !== undefined
        ? data.model_name
        : existing.model_name,
      color: data.color !== undefined
        ? data.color
        : existing.color,
      observations: data.observations !== undefined
        ? data.observations
        : existing.observations,
      purchase_date: data.purchase_date !== undefined
        ? (data.purchase_date
            ? new Date(data.purchase_date + 'T00:00:00.000Z')
            : null)
        : existing.purchase_date,
      purchase_value: data.purchase_value !== undefined
        ? data.purchase_value
        : existing.purchase_value,
      is_company_vehicle: data.is_company_vehicle !== undefined
        ? data.is_company_vehicle
        : existing.is_company_vehicle,
    }
  }

  private async createCompanyVehicleOwnerships(vehicleId: string) {
    const partners = await prisma.user.findMany({
      where: { profile: UserProfile.PARTNER, is_active: true },
      select: { id: true, name: true },
    })

    if (partners.length === 0) {
      console.log(
        '⚠️ Nenhum sócio ativo encontrado para veículo da empresa',
      )
      return
    }

    const ownershipPercentage = BUSINESS_RULES.OWNERSHIP.MAX_PERCENTAGE /
      partners.length

    await Promise.all(
      partners.map(partner =>
        prisma.vehicleOwnership.create({
          data: {
            vehicle_id: vehicleId,
            user_id: partner.id,
            ownership_percentage: ownershipPercentage,
          },
        }),
      ),
    )

    console.log(
      `🏢 Veículo da empresa: ${partners.length} participações de ` +
        `${ownershipPercentage.toFixed(2)}% cada`,
    )
  }

  private async validateOwnershipCreation(
    vehicleId: string,
    userId: string,
    ownershipPercentage: number,
  ) {
    // Check if vehicle exists
    await this.getVehicleById(vehicleId)

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new NotFoundError('Usuário')
    }

    // Check if ownership already exists
    const existing = await prisma.vehicleOwnership.findUnique({
      where: { vehicle_id_user_id: { vehicle_id: vehicleId, user_id: userId } },
    })

    if (existing) {
      throw new ConflictError('Usuário já possui participação neste veículo')
    }

    // Check total ownership doesn't exceed 100%
    await this.validateTotalOwnership(vehicleId, ownershipPercentage)
  }

  private async validateOwnershipUpdate(
    vehicleId: string,
    userId: string,
    ownershipPercentage: number,
  ) {
    const existing = await prisma.vehicleOwnership.findUnique({
      where: { vehicle_id_user_id: { vehicle_id: vehicleId, user_id: userId } },
    })

    if (!existing) {
      throw new NotFoundError('Participação')
    }

    await this.validateTotalOwnership(vehicleId, ownershipPercentage, userId)
  }

  private async validateTotalOwnership(
    vehicleId: string,
    newPercentage: number,
    excludeUserId?: string,
  ) {
    const total = await prisma.vehicleOwnership.aggregate({
      where: {
        vehicle_id: vehicleId,
        ...(excludeUserId && { user_id: { not: excludeUserId } }),
      },
      _sum: { ownership_percentage: true },
    })

    const currentTotal = Number(total._sum.ownership_percentage || 0)
    const newTotal = currentTotal + newPercentage

    if (newTotal > BUSINESS_RULES.OWNERSHIP.MAX_PERCENTAGE) {
      throw new ConflictError(
        `A soma das participações seria ${newTotal}%, ultrapassando ` +
          `${BUSINESS_RULES.OWNERSHIP.MAX_PERCENTAGE}%. ` +
          `Participação atual total: ${currentTotal}%`,
      )
    }
  }
}
