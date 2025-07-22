import { PrismaClient, VehicleType } from '@prisma/client'
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
}

interface PartnerPatrimony {
  partner_id: string
  partner_name: string
  total_patrimony: number
  vehicles: Array<{
    vehicle_id: string
    license_plate: string
    ownership_percentage: number
    fipe_value: number
    partner_value: number
    vehicle_type: string
  }>
}

export class PatrimonyService {
  // Calcular patrimônio de um sócio específico
  async calculatePartnerPatrimony(partnerId: string):
  Promise<PartnerPatrimony> {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        vehicle_ownerships: {
          include: {
            vehicle: true,
          },
        },
      },
    })

    if (!partner) {
      throw new Error('Partner not found')
    }

    const vehicles = []
    let totalPatrimony = 0

    for (const ownership of partner.vehicle_ownerships) {
      const fipeValue = await this.getVehicleFipeValue(ownership.vehicle)
      const partnerValue =
      (fipeValue * Number(ownership.ownership_percentage)) / 100

      vehicles.push({
        vehicle_id: ownership.vehicle.id,
        license_plate: ownership.vehicle.license_plate,
        ownership_percentage: Number(ownership.ownership_percentage),
        fipe_value: fipeValue,
        partner_value: partnerValue,
        vehicle_type: ownership.vehicle.vehicle_type,
      })

      totalPatrimony += partnerValue
    }

    return {
      partner_id: partner.id,
      partner_name: partner.name,
      total_patrimony: totalPatrimony,
      vehicles,
    }
  }

  // Buscar valor FIPE do veículo (com cache) - tipo corrigido
  private async getVehicleFipeValue(vehicle: VehicleWithDetails):
  Promise<number> {
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
      return Number(cached.fipe_value)
    }

    // Se não estiver em cache, buscar na API
    const fipeData = await fipeAPI.getValue(
      vehicle.vehicle_type as ApiVehicleType,
      vehicle.fipe_brand_code,
      vehicle.fipe_model_code,
      vehicle.year,
    )

    // Converter valor de string para número (API v2 usa "price")
    const value =
    parseFloat(fipeData.price.replace(/[R$\s.]/g, '').replace(',', '.'))

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

    return value
  }
}

export const patrimonyService = new PatrimonyService()
