import { z } from 'zod'
import { BUSINESS_RULES } from '../constants/business-rules'

export const vehicleParamsSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido'),
})

export const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .min(1)
    .default(BUSINESS_RULES.PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .min(1)
    .max(BUSINESS_RULES.PAGINATION.MAX_LIMIT)
    .default(BUSINESS_RULES.PAGINATION.DEFAULT_LIMIT),
})

export const vehicleFilterSchema = z.object({
  vehicleType: z.enum(['cars', 'motorcycles']).optional(),
  displayYear: z.coerce.number().positive().optional(),
  search: z.string().optional(),
  isCompanyVehicle: z.string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true
      if (val === 'false') return false
      return undefined
    }),
  fuelAcronym: z.string().optional(),
  brandName: z.string().optional(),
})

export const listVehiclesQuerySchema = paginationQuerySchema.merge(
  vehicleFilterSchema,
)

export const createVehicleSchema = z.object({
  license_plate: z.string()
    .min(7, 'Placa deve ter pelo menos 7 caracteres')
    .max(8, 'Placa deve ter no máximo 8 caracteres')
    .transform(val => val.toUpperCase()),
  renavam: z.string()
    .length(11, 'RENAVAM deve ter exatamente 11 dígitos')
    .regex(/^\d+$/, 'RENAVAM deve conter apenas números'),
  fipe_brand_code: z.number()
    .int()
    .positive('Código da marca deve ser um número positivo'),
  fipe_model_code: z.number()
    .int()
    .positive('Código do modelo deve ser um número positivo'),
  year_id: z.string().min(1, 'ID do ano é obrigatório'),
  fuel_acronym: z.string().min(1).max(3).optional(),
  vehicle_type: z.enum(['cars', 'motorcycles'], {
    errorMap: () => ({
      message: 'Tipo de veículo deve ser "cars" ou "motorcycles"',
    }),
  }),
  display_year: z.number().int().positive().optional(),
  display_fuel: z.string().optional(),
  brand_name: z.string().optional(),
  model_name: z.string().optional(),
  color: z.enum([
    'AZUL', 'BRANCA', 'CINZA', 'PRATA', 'PRETA', 'MARROM', 'VERMELHA',
  ], {
    errorMap: () => ({
      message:
        'Cor deve ser uma das opções: AZUL, BRANCA, CINZA, PRATA, PRETA, ' +
        'MARROM, VERMELHA',
    }),
  }).optional(),
  observations: z.string().optional().nullable(),
  purchase_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional()
    .nullable(),
  purchase_value: z.number()
    .positive('Valor de compra deve ser positivo')
    .optional()
    .nullable(),
  is_company_vehicle: z.boolean().default(false),
})

export const updateVehicleSchema = createVehicleSchema.partial()

export const ownershipSchema = z.object({
  userId: z.string().uuid('ID do usuário deve ser um UUID válido'),
  ownershipPercentage: z.number()
    .min(
      BUSINESS_RULES.OWNERSHIP.MIN_PERCENTAGE,
      `Percentual mínimo é ${BUSINESS_RULES.OWNERSHIP.MIN_PERCENTAGE}%`,
    )
    .max(
      BUSINESS_RULES.OWNERSHIP.MAX_PERCENTAGE,
      `Percentual máximo é ${BUSINESS_RULES.OWNERSHIP.MAX_PERCENTAGE}%`,
    ),
})

export const updateOwnershipSchema = z.object({
  ownershipPercentage: z.number()
    .min(BUSINESS_RULES.OWNERSHIP.MIN_PERCENTAGE)
    .max(BUSINESS_RULES.OWNERSHIP.MAX_PERCENTAGE),
})

export const ownershipParamsSchema = z.object({
  id: z.string().uuid('ID do veículo deve ser um UUID válido'),
  userId: z.string().uuid('ID do usuário deve ser um UUID válido'),
})
