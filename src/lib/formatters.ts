/**
 * Converte campos Decimal do Prisma para number nas respostas da API
 */
import { Decimal } from '@prisma/client/runtime/library'

// Tipos que representam o que vem do Prisma (com Decimal)
export interface PrismaOwnership {
  id: string
  vehicle_id: string
  user_id: string
  ownership_percentage: Decimal
  created_at: Date
  updated_at: Date
  user?: {
    id: string
    name: string
    email: string
    profile: string
  }
}

export interface PrismaVehicle {
  id: string
  license_plate: string
  renavam: string
  fipe_brand_code: number
  fipe_model_code: number
  year_id: string
  fuel_acronym: string
  vehicle_type: string
  display_year?: number | null
  display_fuel?: string | null
  brand_name?: string | null
  model_name?: string | null
  color?:
    | 'AZUL'
    | 'BRANCA'
    | 'CINZA'
    | 'PRATA'
    | 'PRETA'
    | 'MARROM'
    | 'VERMELHA'
    | null
  observations?: string | null
  purchase_date?: Date | null
  purchase_value?: Decimal | null
  is_company_vehicle: boolean
  created_at: Date
  updated_at: Date
  ownerships?: PrismaOwnership[]
}

// Tipos para as respostas da API (com number)
export interface OwnershipResponse {
  id: string
  vehicle_id: string
  user_id: string
  ownership_percentage: number // Convertido para number
  created_at: Date
  updated_at: Date
  user?: {
    id: string
    name: string
    email: string
    profile: string
  }
}

export interface VehicleWithOwnerships {
  id: string
  license_plate: string
  renavam: string
  fipe_brand_code: number
  fipe_model_code: number
  year_id: string
  fuel_acronym: string
  vehicle_type: string
  display_year?: number | null
  display_fuel?: string | null
  brand_name?: string | null
  model_name?: string | null
  color?:
    | 'AZUL'
    | 'BRANCA'
    | 'CINZA'
    | 'PRATA'
    | 'PRETA'
    | 'MARROM'
    | 'VERMELHA'
    | null
  observations?: string | null
  purchase_date?: Date | null
  purchase_value?: number | null
  is_company_vehicle: boolean
  created_at: Date
  updated_at: Date
  ownerships: OwnershipResponse[]
}

/**
 * Converte ownership_percentage de Decimal (string) para number
 */
export function formatOwnershipResponse(
  ownership: PrismaOwnership):OwnershipResponse {
  return {
    ...ownership,
    ownership_percentage: Number(ownership.ownership_percentage),
    user: ownership.user
      ? {
          ...ownership.user,
        }
      : undefined,
  }
}

/**
 * Converte veículo com ownerships, formatando todos os campos decimais
 */
export function formatVehicleWithOwnerships(
  vehicle: PrismaVehicle):VehicleWithOwnerships {
  return {
    ...vehicle,
    purchase_value: vehicle.purchase_value
      ? Number(vehicle.purchase_value)
      : null,
    ownerships: vehicle.ownerships
      ? vehicle.ownerships.map(formatOwnershipResponse)
      : [],
  }
}

/**
 * Formata resposta de veículo com estatísticas de ownership
 */
export function formatVehicleWithStats(vehicle: PrismaVehicle) {
  const formattedVehicle = formatVehicleWithOwnerships(vehicle)
  const totalOwnership = formattedVehicle.ownerships.reduce(
    (sum, ownership) => sum + ownership.ownership_percentage,
    0,
  )

  return {
    ...formattedVehicle,
    totalOwnership,
    remainingOwnership: 100 - totalOwnership,
  }
}
