import { env } from '../env'
import { ExternalServiceError } from '../utils/error-handler'
import { withExternalApiSpan } from '../tracing/custom-spans'

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

// ✅ Interface corrigida para a resposta da API FIPE v2
interface FipeValue {
  price: string        // Preço no formato "R$ 45.000,00"
  brand: string        // Nome da marca
  model: string        // Nome do modelo
  modelYear: number    // Ano do modelo
  fuel: string         // Nome do combustível
  codeFipe: string     // Código FIPE
  referenceMonth: string // Mês de referência
  vehicleType: number  // Tipo do veículo
  fuelAcronym: string  // Sigla do combustível
}

export type VehicleType = 'cars' | 'motorcycles'

export class FipeAPI {
  private baseURL = env.API_FIPE_PATH

  // Buscar marcas
  async getBrands(vehicleType: VehicleType): Promise<FipeBrand[]> {
    return withExternalApiSpan(
      'FIPE-API',
      `/${vehicleType}/brands`,
      async () => {
        const response = await fetch(`${this.baseURL}/${vehicleType}/brands`)
        if (!response.ok) {
          throw new ExternalServiceError(
            'FIPE API',
            `Failed to fetch brands: ${response.statusText}`,
          )
        }
        return response.json() as Promise<FipeBrand[]>
      },
    )
  }

  // Buscar modelos
  async getModels(
    vehicleType: VehicleType,
    brandCode: number,
  ): Promise<FipeModel[]> {
    const url = `${this.baseURL}/${vehicleType}/brands/${brandCode}/models`
    const response = await fetch(url)

    if (!response.ok) {
      throw new ExternalServiceError(
        'FIPE API',
        `Failed to fetch models: ${response.statusText}`,
      )
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
      throw new ExternalServiceError(
        'FIPE API',
        `Failed to fetch years: ${response.statusText}`,
      )
    }
    return response.json() as Promise<FipeYear[]>
  }

  // ✅ CORRIGIDO: Método getValue para buscar preço do veículo
  async getValue(
    vehicleType: VehicleType,
    brandCode: number,
    modelCode: number,
    yearCode: string,
  ): Promise<FipeValue> {
    const url = `${this.baseURL}/${vehicleType}/brands/` +
      `${brandCode}/models/${modelCode}/years/${yearCode}`

    console.log(`🌐 FIPE API Request: ${url}`)

    const response = await fetch(url)

    if (!response.ok) {
      throw new ExternalServiceError(
        'FIPE API',
        `Failed to fetch value: ${response.statusText}`,
      )
    }

    const data = await response.json() as FipeValue
    console.log('📊 FIPE API Response:', {
      price: data.price,
      brand: data.brand,
      model: data.model,
      year: data.modelYear,
      fuel: data.fuel,
      reference: data.referenceMonth,
    })

    return data
  }

  // Método alternativo usando parâmetros em objeto (para compatibilidade)
  async getVehiclePrice(params: {
    vehicleType: VehicleType
    brandCode: number
    modelCode: number
    yearCode: string
  }): Promise<FipeValue> {
    return this.getValue(
      params.vehicleType,
      params.brandCode,
      params.modelCode,
      params.yearCode,
    )
  }

  static isValidVehicleType(type: string): type is VehicleType {
    return ['cars', 'motorcycles'].includes(type)
  }
}

export const fipeAPI = new FipeAPI()
