import axios from '../config/axios'
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

  constructor() {
    console.log(`🔗 FIPE API configurada: ${this.baseURL}`)
    console.log(`📋 Referência: ${this.reference}`)
  }

  // Buscar marcas
  async getBrands(vehicleType: VehicleType): Promise<FipeBrand[]> {
    const url = `${this.baseURL}/${vehicleType}/brands`

    console.log(`🌐 Buscando marcas: ${url}`)

    const response = await axios.get(url, {
      params: { reference: this.reference },
    })

    console.log(`✅ ${response.data.length} marcas encontradas`)
    return response.data
  }

  // Buscar modelos
  async getModels(
    vehicleType: VehicleType,
    brandCode: number,
  ): Promise<FipeModel[]> {
    const url = `${this.baseURL}/${vehicleType}/brands/${brandCode}/models`

    console.log(`🌐 Buscando modelos: ${url}`)

    const response = await axios.get(url, {
      params: { reference: this.reference },
    })

    console.log(`✅ ${response.data.length} modelos encontrados`)
    return response.data
  }

  // Buscar anos
  async getYears(
    vehicleType: VehicleType,
    brandCode: number,
    modelCode: number,
  ): Promise<FipeYear[]> {
    const url = `${this.baseURL}/${vehicleType}/brands/` +
      `${brandCode}/models/${modelCode}/years`

    console.log(`🌐 Buscando anos: ${url}`)

    const response = await axios.get(url, {
      params: { reference: this.reference },
    })

    console.log(`✅ ${response.data.length} anos encontrados`)
    return response.data
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

    console.log(`🌐 Buscando valor FIPE: ${url}`)
    console.log(`📋 Parâmetros: reference=${this.reference}`)

    const response = await axios.get(url, {
      params: { reference: this.reference },
      timeout: 10000, // 10 segundos de timeout
    })

    console.log('📊 Resposta FIPE recebida:', {
      brand: response.data.brand,
      model: response.data.model,
      price: response.data.price,
      fuelAcronym: response.data.fuelAcronym,
      codeFipe: response.data.codeFipe,
      referenceMonth: response.data.referenceMonth,
    })

    return response.data
  }

  // Validar se tipo de veículo é válido
  static isValidVehicleType(type: string): type is VehicleType {
    return ['cars', 'motorcycles'].includes(type)
  }

  // Buscar referências disponíveis
  async getReferences(): Promise<Array<{ code: number; month: string }>> {
    const url = `${this.baseURL}/references`

    console.log(`🌐 Buscando referências: ${url}`)

    const response = await axios.get(url, {
      timeout: 10000,
    })

    console.log(`✅ ${response.data.length} referências encontradas`)
    return response.data
  }
}

export const fipeAPI = new FipeAPI()
