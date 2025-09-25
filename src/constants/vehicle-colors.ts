// Constantes de cores de veículos
// Corresponde ao enum VehicleColor no schema Prisma

export const VEHICLE_COLORS = {
  AZUL: 'AZUL',
  BRANCA: 'BRANCA',
  CINZA: 'CINZA',
  PRATA: 'PRATA',
  PRETA: 'PRETA',
  MARROM: 'MARROM',
  VERMELHA: 'VERMELHA',
} as const

export const VEHICLE_COLOR_LABELS = {
  [VEHICLE_COLORS.AZUL]: 'Azul',
  [VEHICLE_COLORS.BRANCA]: 'Branca',
  [VEHICLE_COLORS.CINZA]: 'Cinza',
  [VEHICLE_COLORS.PRATA]: 'Prata',
  [VEHICLE_COLORS.PRETA]: 'Preta',
  [VEHICLE_COLORS.MARROM]: 'Marrom',
  [VEHICLE_COLORS.VERMELHA]: 'Vermelha',
} as const

export const VEHICLE_COLOR_OPTIONS = [
  { value: VEHICLE_COLORS.AZUL, label: VEHICLE_COLOR_LABELS.AZUL },
  { value: VEHICLE_COLORS.BRANCA, label: VEHICLE_COLOR_LABELS.BRANCA },
  { value: VEHICLE_COLORS.CINZA, label: VEHICLE_COLOR_LABELS.CINZA },
  { value: VEHICLE_COLORS.PRATA, label: VEHICLE_COLOR_LABELS.PRATA },
  { value: VEHICLE_COLORS.PRETA, label: VEHICLE_COLOR_LABELS.PRETA },
  { value: VEHICLE_COLORS.MARROM, label: VEHICLE_COLOR_LABELS.MARROM },
  { value: VEHICLE_COLORS.VERMELHA, label: VEHICLE_COLOR_LABELS.VERMELHA },
] as const

export type VehicleColorValue = keyof typeof VEHICLE_COLORS
