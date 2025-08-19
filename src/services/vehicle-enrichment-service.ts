import { fipeAPI, VehicleType as ApiVehicleType } from '../lib/fipe-api'

interface VehicleEnrichmentData {
  brand_name: string
  model_name: string
  display_year: number
  display_fuel: string
  fuel_acronym: string
  current_fipe_value: number
  code_fipe: string
  reference_month: string
}

export class VehicleEnrichmentService {
  /**
   * Busca informações completas do veículo na API FIPE
   * e retorna dados enriquecidos para salvar no banco
   */
  async enrichVehicleData(
    vehicleType: 'cars' | 'motorcycles',
    brandCode: number,
    modelCode: number,
    yearId: string,
  ): Promise<VehicleEnrichmentData> {
    console.log('🔍 Buscando informações FIPE para veículo:', {
      vehicleType,
      brandCode,
      modelCode,
      yearId,
    })

    try {
      // Fazer requisição para API FIPE
      const fipeData = await fipeAPI.getValue(
        vehicleType as ApiVehicleType,
        brandCode,
        modelCode,
        yearId,
      )

      // Extrair ano do year_id (ex: "2017-5" -> 2017)
      const displayYear = parseInt(yearId.split('-')[0])

      // Converter valor de string para número
      // API retorna "R$ 43.807,00" -> precisamos extrair só o número
      const fipeValue = parseFloat(
        fipeData.price.replace(/[R$\s.]/g, '').replace(',', '.'),
      )

      console.log('✅ Dados FIPE obtidos:', {
        brand: fipeData.brand,
        model: fipeData.model,
        year: displayYear,
        fuel: fipeData.fuel,
        value: `R$ ${fipeValue.toLocaleString('pt-BR')}`,
      })

      return {
        brand_name: fipeData.brand,
        model_name: fipeData.model,
        display_year: displayYear,
        display_fuel: fipeData.fuel,
        fuel_acronym: fipeData.fuelAcronym,
        current_fipe_value: fipeValue,
        code_fipe: fipeData.codeFipe,
        reference_month: fipeData.referenceMonth,
      }
    } catch (error) {
      console.error('❌ Erro ao buscar dados FIPE:', error)

      throw new Error(
        'Não foi possível buscar informações do veículo na tabela FIPE. ' +
        'Verifique se os códigos informados estão corretos: ' +
        `Brand=${brandCode}, Model=${modelCode}, Year=${yearId}`,
      )
    }
  }

  /**
   * Valida se os códigos FIPE existem nas respectivas tabelas
   */
  async validateFipeCodes(
    vehicleType: 'cars' | 'motorcycles',
    brandCode: number,
    modelCode: number,
    yearId: string,
  ): Promise<{
    isValid: boolean
    errors: string[]
  }> {
    const errors: string[] = []

    try {
      // Validar se a marca existe
      const brands = await fipeAPI.getBrands(vehicleType as ApiVehicleType)
      const brandExists = brands.some(brand => brand.code === brandCode)

      if (!brandExists) {
        errors.push(`Código da marca ${brandCode} não encontrado`)
      }

      // Se marca válida, validar modelo
      if (brandExists) {
        const models =
          await fipeAPI.getModels(vehicleType as ApiVehicleType, brandCode)
        const modelExists = models.some(model => model.code === modelCode)

        if (!modelExists) {
          errors.push(
            `Código do modelo ${modelCode} não encontrado para esta marca`)
        }

        // Se modelo válido, validar ano
        if (modelExists) {
          const years = await fipeAPI.getYears(
            vehicleType as ApiVehicleType, brandCode, modelCode)
          const yearExists = years.some(year => year.code === yearId)

          if (!yearExists) {
            errors.push(
              `Código do ano ${yearId} não encontrado para este modelo`)
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
      }
    } catch (error) {
      console.error('Erro na validação dos códigos FIPE:', error)

      return {
        isValid: false,
        errors: ['Erro ao validar códigos FIPE. Tente novamente.'],
      }
    }
  }
}

export const vehicleEnrichmentService = new VehicleEnrichmentService()
