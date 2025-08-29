import { PrismaClient, VehicleType } from '@prisma/client'
import { fipeAPI, VehicleType as ApiVehicleType } from '../lib/fipe-api'

const prisma = new PrismaClient()

export interface FipeVehicleData {
  brand_code: number
  model_code: number
  year_id: string
  fuel_acronym?: string | null
  vehicle_type: VehicleType
}

export interface FipeApiResponse {
  brand: string
  model: string
  fuel: string
  fuelAcronym: string
  price: string
  modelYear: number
  codeFipe: string
  referenceMonth: string
}

export interface FipeCacheResult {
  fipe_value: number
  brand_name?: string | null
  model_name?: string | null
  fuel_name?: string | null
  reference_month: string
  was_cached: boolean
}

export class FipeCacheService {
  private static readonly DEFAULT_FUEL_ACRONYM = 'G'
  private static readonly FIPE_REFRESH_DELAY = 1500
  private static readonly FUEL_MAP: Record<string, string> = {
    G: 'Gasolina',
    D: 'Diesel',
    E: 'Etanol',
    F: 'Flex',
  }

  static normalizeFuelAcronym(fuelAcronym?: string | null): string {
    return fuelAcronym || this.DEFAULT_FUEL_ACRONYM
  }

  static convertFuelAcronymToDisplay(fuelAcronym: string): string {
    return this.FUEL_MAP[fuelAcronym.toUpperCase()] || fuelAcronym
  }

  static parsePrice(priceString: string): number {
    return Number(priceString.replace(/[R$\s.]/g, '').replace(',', '.'))
  }

  static convertVehicleType(vehicleType: VehicleType): ApiVehicleType {
    return vehicleType === VehicleType.cars
      ? 'cars'
      : 'motorcycles'
  }

  async getVehicleFipeValue(
    vehicleData: FipeVehicleData,
  ): Promise<FipeCacheResult> {
    const normalizedFuel = FipeCacheService.normalizeFuelAcronym(
      vehicleData.fuel_acronym,
    )

    // 1. Try cache first
    const cachedValue = await this.getCachedValue({
      ...vehicleData,
      fuel_acronym: normalizedFuel,
    })

    if (cachedValue) {
      console.log(
        `✅ Cache hit para veículo ${vehicleData.brand_code}/` +
        `${vehicleData.model_code}`,
      )
      return { ...cachedValue, was_cached: true }
    }

    // 2. Fetch from API
    console.log(
      `🌐 Buscando FIPE API para ${vehicleData.brand_code}/` +
      `${vehicleData.model_code}...`,
    )

    try {
      const apiVehicleType = FipeCacheService.convertVehicleType(
        vehicleData.vehicle_type,
      )
      const fipeData = await fipeAPI.getValue(
        apiVehicleType,
        vehicleData.brand_code,
        vehicleData.model_code,
        vehicleData.year_id,
      )

      if (!fipeData?.price) {
        return await this.getFallbackValue(vehicleData)
      }

      const result = await this.cacheAndReturnValue(
        vehicleData,
        fipeData,
        normalizedFuel,
      )
      return { ...result, was_cached: false }
    } catch (error) {
      console.error('❌ FIPE API error:', error)
      return await this.getFallbackValue(vehicleData)
    }
  }

  private async getCachedValue(
    vehicleData: FipeVehicleData & { fuel_acronym: string },
  ): Promise<FipeCacheResult | null> {
    const cached = await prisma.fipeCache.findUnique({
      where: {
        brand_code_model_code_year_id_fuel_acronym_vehicle_type: {
          brand_code: vehicleData.brand_code,
          model_code: vehicleData.model_code,
          year_id: vehicleData.year_id,
          fuel_acronym: vehicleData.fuel_acronym,
          vehicle_type: vehicleData.vehicle_type,
        },
      },
    })

    if (!cached) return null

    return {
      fipe_value: Number(cached.fipe_value),
      brand_name: cached.brand_name,
      model_name: cached.model_name,
      fuel_name: cached.fuel_name,
      reference_month: cached.reference_month,
      was_cached: true,
    }
  }

  private async getFallbackValue(
    vehicleData: FipeVehicleData,
  ): Promise<FipeCacheResult> {
    console.log('🔄 Tentando fallback para último valor conhecido...')
    const lastKnown = await prisma.fipeCache.findFirst({
      where: {
        brand_code: vehicleData.brand_code,
        model_code: vehicleData.model_code,
        vehicle_type: vehicleData.vehicle_type,
      },
      orderBy: { created_at: 'desc' },
    })

    if (lastKnown) {
      console.log(
        '📦 Usando último valor conhecido: R$ ' +
        `${Number(lastKnown.fipe_value).toLocaleString('pt-BR')}`,
      )
      return {
        fipe_value: Number(lastKnown.fipe_value),
        brand_name: lastKnown.brand_name,
        model_name: lastKnown.model_name,
        fuel_name: lastKnown.fuel_name,
        reference_month: lastKnown.reference_month,
        was_cached: true,
      }
    }

    console.warn('⚠️ Nenhum valor FIPE encontrado (cache ou API)')
    return {
      fipe_value: 0,
      reference_month: 'N/A',
      was_cached: false,
    }
  }

  private async cacheAndReturnValue(
    vehicleData: FipeVehicleData,
    fipeData: FipeApiResponse,
    normalizedFuel: string,
  ): Promise<FipeCacheResult> {
    const fipeValue = FipeCacheService.parsePrice(fipeData.price)

    await prisma.fipeCache.create({
      data: {
        brand_code: vehicleData.brand_code,
        model_code: vehicleData.model_code,
        year_id: vehicleData.year_id,
        fuel_acronym: normalizedFuel,
        vehicle_type: vehicleData.vehicle_type,
        fipe_value: fipeValue,
        brand_name: fipeData.brand || null,
        model_name: fipeData.model || null,
        model_year: fipeData.modelYear || null,
        fuel_name: fipeData.fuel || null,
        code_fipe: fipeData.codeFipe || null,
        reference_month: fipeData.referenceMonth || 'N/A',
      },
    })

    console.log(`💾 Cache FIPE criado: R$ ${fipeValue.toLocaleString('pt-BR')}`)

    return {
      fipe_value: fipeValue,
      brand_name: fipeData.brand,
      model_name: fipeData.model,
      fuel_name: fipeData.fuel,
      reference_month: fipeData.referenceMonth || 'N/A',
      was_cached: false,
    }
  }

  async refreshAllVehiclesCache(): Promise<{
    updated: number
    errors: number
  }> {
    console.log('🔄 Iniciando refresh completo do cache FIPE...')
    const vehicles = await prisma.vehicle.findMany()
    let updated = 0
    let errors = 0

    for (const vehicle of vehicles) {
      try {
        console.log(`🔄 Processando ${vehicle.license_plate}...`)

        // Remove old cache
        await prisma.fipeCache.deleteMany({
          where: {
            brand_code: vehicle.fipe_brand_code,
            model_code: vehicle.fipe_model_code,
            year_id: vehicle.year_id,
            vehicle_type: vehicle.vehicle_type,
          },
        })

        // Get fresh value
        const result = await this.getVehicleFipeValue({
          brand_code: vehicle.fipe_brand_code,
          model_code: vehicle.fipe_model_code,
          year_id: vehicle.year_id,
          fuel_acronym: vehicle.fuel_acronym,
          vehicle_type: vehicle.vehicle_type,
        })

        if (result.fipe_value > 0) updated++

        // Rate limiting
        await new Promise(resolve =>
          setTimeout(resolve, FipeCacheService.FIPE_REFRESH_DELAY),
        )
      } catch (error) {
        console.error(`❌ Erro ao processar ${vehicle.license_plate}:`, error)
        errors++
      }
    }

    console.log(`✅ Refresh concluído: ${updated} sucessos, ${errors} erros`)
    return { updated, errors }
  }
}
