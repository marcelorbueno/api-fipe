import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals'
import { VehicleType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { cleanupTestData } from '../helpers/auth-helper'

describe('FIPE Cache System', () => {
  beforeAll(async () => {
    // Setup específico se necessário
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  beforeEach(async () => {
    await cleanupTestData()
  })

  describe('Cache Creation and Duplicate Handling', () => {
    test('should create FIPE cache for unique combination', async () => {
      const cacheData = {
        brand_code: 21,
        model_code: 7541,
        year_id: '2020-1',
        fuel_acronym: 'G',
        vehicle_type: VehicleType.cars,
        fipe_value: 50000,
        brand_name: 'Fiat',
        model_name: 'Uno Mille 1.0',
        model_year: 2020,
        fuel_name: 'Gasolina',
        code_fipe: '001004-1',
        reference_month: 'agosto/2025',
      }

      const cache = await prisma.fipeCache.create({ data: cacheData })

      expect(cache).toHaveProperty('id')
      expect(Number(cache.fipe_value)).toBe(50000)
      expect(cache.brand_code).toBe(21)
    })

    test('should handle duplicate cache creation gracefully', async () => {
      const cacheData = {
        brand_code: 21,
        model_code: 7541,
        year_id: '2020-1',
        fuel_acronym: 'G',
        vehicle_type: VehicleType.cars,
        fipe_value: 50000,
        brand_name: 'Fiat',
        model_name: 'Uno Mille 1.0',
        model_year: 2020,
        fuel_name: 'Gasolina',
        code_fipe: '001004-1',
        reference_month: 'agosto/2025',
      }

      // Criar primeiro cache
      await prisma.fipeCache.create({ data: cacheData })

      // Tentar criar duplicado deve falhar
      await expect(
        prisma.fipeCache.create({ data: cacheData }),
      ).rejects.toThrow()
    })

    test('should allow different fuel_acronym for same vehicle', async () => {
      const baseData = {
        brand_code: 21,
        model_code: 7541,
        year_id: '2020-1',
        vehicle_type: VehicleType.cars,
        fipe_value: 50000,
        brand_name: 'Fiat',
        model_name: 'Uno Mille 1.0',
        model_year: 2020,
        fuel_name: 'Gasolina',
        code_fipe: '001004-1',
        reference_month: 'agosto/2025',
      }

      // Criar cache para gasolina
      const gasCache = await prisma.fipeCache.create({
        data: { ...baseData, fuel_acronym: 'G' },
      })

      // Criar cache para etanol (diferente fuel_acronym)
      const ethanolCache = await prisma.fipeCache.create({
        data: { ...baseData, fuel_acronym: 'E', fipe_value: 48000 },
      })

      expect(gasCache.id).not.toBe(ethanolCache.id)
      expect(gasCache.fuel_acronym).toBe('G')
      expect(ethanolCache.fuel_acronym).toBe('E')
    })
  })

  describe('Cache Query and Performance', () => {
    test('should find existing cache efficiently', async () => {
      const cacheData = {
        brand_code: 59,
        model_code: 8323,
        year_id: '2020-5',
        fuel_acronym: 'F',
        vehicle_type: VehicleType.cars,
        fipe_value: 44906,
        brand_name: 'VW - VolksWagen',
        model_name: 'Gol 1.0 Flex 12V 5p',
        model_year: 2020,
        fuel_name: 'Flex',
        code_fipe: '005340-9',
        reference_month: 'setembro/2025',
      }

      const created = await prisma.fipeCache.create({ data: cacheData })

      const found = await prisma.fipeCache.findFirst({
        where: {
          brand_code: 59,
          model_code: 8323,
          year_id: '2020-5',
          fuel_acronym: 'F',
          vehicle_type: VehicleType.cars,
        },
      })

      expect(found).not.toBeNull()
      expect(found?.id).toBe(created.id)
      expect(Number(found?.fipe_value)).toBe(44906)
    })

    test('should handle null fuel_acronym correctly', async () => {
      const cacheData = {
        brand_code: 101,
        model_code: 7388,
        year_id: '2024-1',
        fuel_acronym: null,
        vehicle_type: VehicleType.motorcycles,
        fipe_value: 16000,
        brand_name: 'Honda',
        model_name: 'CG 160 Start',
        model_year: 2024,
        fuel_name: 'Gasolina',
        code_fipe: '811001-9',
        reference_month: 'setembro/2025',
      }

      const cache = await prisma.fipeCache.create({ data: cacheData })

      expect(cache.fuel_acronym).toBeNull()
      expect(cache.vehicle_type).toBe(VehicleType.motorcycles)
    })
  })

  describe('Cache Value Formatting', () => {
    test('should store and retrieve monetary values correctly', async () => {
      const cacheData = {
        brand_code: 21,
        model_code: 7541,
        year_id: '2020-1',
        fuel_acronym: 'G',
        vehicle_type: VehicleType.cars,
        fipe_value: 73721.50, // Valor com centavos
        brand_name: 'Fiat',
        model_name: 'Uno Mille 1.0',
        model_year: 2020,
        fuel_name: 'Gasolina',
        code_fipe: '001004-1',
        reference_month: 'setembro/2025',
      }

      const cache = await prisma.fipeCache.create({ data: cacheData })

      // Verificar se o valor foi armazenado corretamente
      expect(Number(cache.fipe_value)).toBe(73721.50)

      // Verificar formatação brasileira
      const formatted = Number(cache.fipe_value).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      expect(formatted).toBe('73.721,50')
    })
  })
})
