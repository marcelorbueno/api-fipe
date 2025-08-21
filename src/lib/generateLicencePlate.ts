function generateRandomLetters(length: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''

  for (let i = 0; i < length; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length))
  }

  return result
}

function generateRandomNumbers(length: number): string {
  const numbers = '0123456789'
  let result = ''

  for (let i = 0; i < length; i++) {
    result += numbers.charAt(Math.floor(Math.random() * numbers.length))
  }

  return result
}

/**
 * Gerador de placas de veículos.
 */
export function generateLicencePlate(): string {
  const letters = generateRandomLetters(3)
  const numbers = generateRandomNumbers(4)

  return `${letters}${numbers}`
}
