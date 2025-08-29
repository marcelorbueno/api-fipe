export const BUSINESS_RULES = {
  // Patrimony calculation
  OWNERSHIP: {
    MAX_PERCENTAGE: 100,
    MIN_PERCENTAGE: 0.01,
  },

  // Company vehicle distribution
  COMPANY_VEHICLES: {
    EQUAL_DISTRIBUTION: true,
  },

  // FIPE integration
  FIPE: {
    DEFAULT_FUEL_ACRONYM: 'G',
    REFRESH_DELAY_MS: 1500,
    REQUEST_TIMEOUT_MS: 10000,
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },
} as const

export const FUEL_TYPES = {
  G: 'Gasolina',
  D: 'Diesel',
  E: 'Etanol',
  F: 'Flex',
} as const

export const USER_PROFILES = {
  ADMINISTRATOR: 'ADMINISTRATOR',
  PARTNER: 'PARTNER',
  INVESTOR: 'INVESTOR',
} as const

export const VEHICLE_TYPES = {
  CARS: 'cars',
  MOTORCYCLES: 'motorcycles',
} as const
