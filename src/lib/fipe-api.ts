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

export type VehicleType = 'cars' | 'motorcycles' | 'trucks'

export class FipeAPI {
  private baseURL = env.API_FIPE_PATH

  // Buscar marcas
  async getBrands(vehicleType: VehicleType): Promise<FipeBrand[]> {
    const response = await fetch(`${this.baseURL}/${vehicleType}/brands`)
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
    const response = await fetch(url)

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

    const response = await fetch(url)

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

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch value: ${response.statusText}`)
    }
    return response.json() as Promise<FipeValue>
  }

  static isValidVehicleType(type: string): type is VehicleType {
    return ['cars', 'motorcycles', 'trucks'].includes(type)
  }
}

export const fipeAPI = new FipeAPI()
