// src/lib/fipe-api.ts - VERSÃO ATUALIZADA
import { env } from '../env'

interface FipeBrand {
  code: number
  name: string
}

interface FipeModel {
  code: number
  name: string
}

interface FipeYear {
  code: string
  name: string
}

interface FipeValue {
  price: string
  brand: string
  model: string
  modelYear: number
  fuel: string
  codeFipe: string
  referenceMonth: string
  vehicleType: number
  fuelAcronym: string
}

export type VehicleType = 'cars' | 'motorcycles'

export class FipeAPI {
  private baseURL = env.API_FIPE_PATH
  private reference = env.FIPE_REFERENCE

  // Buscar marcas
  async getBrands(vehicleType: VehicleType): Promise<FipeBrand[]> {
    const url = `${this.baseURL}/${vehicleType}/brands`
    const params = new URLSearchParams({ reference: this.reference })

    const response = await fetch(`${url}?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch brands: ${response.statusText}`)
    }
    return response.json() as Promise<FipeBrand[]>
  }

  // Buscar modelos
  async getModels(
    vehicleType: VehicleType,
    brandCode: number,
  ): Promise<FipeModel[]> {
    const url = `${this.baseURL}/${vehicleType}/brands/${brandCode}/models`
    const params = new URLSearchParams({ reference: this.reference })

    const response = await fetch(`${url}?${params}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`)
    }
    return response.json() as Promise<FipeModel[]>
  }

  // Buscar anos
  async getYears(
    vehicleType: VehicleType,
    brandCode: number,
    modelCode: number,
  ): Promise<FipeYear[]> {
    const url = `${this.baseURL}/${vehicleType}/brands/` +
      `${brandCode}/models/${modelCode}/years`
    const params = new URLSearchParams({ reference: this.reference })

    const response = await fetch(`${url}?${params}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch years: ${response.statusText}`)
    }
    return response.json() as Promise<FipeYear[]>
  }

  // Buscar valor
  async getValue(
    vehicleType: VehicleType,
    brandCode: number,
    modelCode: number,
    yearCode: string,
  ): Promise<FipeValue> {
    const url = `${this.baseURL}/${vehicleType}/brands/` +
      `${brandCode}/models/${modelCode}/years/${yearCode}`
    const params = new URLSearchParams({ reference: this.reference })

    console.log(`🌐 Fazendo requisição FIPE: ${url}?${params}`)

    const response = await fetch(`${url}?${params}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch value: ${response.statusText}`)
    }

    const data = await response.json() as FipeValue
    console.log('📊 Resposta FIPE recebida:', {
      brand: data.brand,
      model: data.model,
      price: data.price,
      fuelAcronym: data.fuelAcronym,
    })

    return data
  }

  // Validar se tipo de veículo é válido
  static isValidVehicleType(type: string): type is VehicleType {
    return ['cars', 'motorcycles'].includes(type)
  }

  // Buscar referências disponíveis
  async getReferences(): Promise<Array<{ code: number; month: string }>> {
    const url = `${this.baseURL}/references`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch references: ${response.statusText}`)
    }
    return response.json()
  }
}

export const fipeAPI = new FipeAPI()
