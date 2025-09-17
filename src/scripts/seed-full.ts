import { PrismaClient, UserProfile, VehicleType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import axios from '../config/axios'
import { env } from '../env'

const prisma = new PrismaClient()

// Função para buscar dados FIPE (mesma lógica da API)
async function fetchFipeData(
  brandCode: number,
  modelCode: number,
  yearId: string,
  vehicleType: VehicleType,
) {
  try {
    console.log(
      `🔍 Buscando dados FIPE: ${vehicleType}/${brandCode}/` +
        `${modelCode}/${yearId}`,
    )

    const fipeUrl =
      `${env.API_FIPE_PATH}/${vehicleType}/brands/` +
      `${brandCode}/models/${modelCode}/years/${yearId}`

    const response = await axios.get(fipeUrl, {
      params: {
        reference: env.FIPE_REFERENCE,
      },
      timeout: 10000,
    })

    const fipeData = response.data

    console.log(
      `✅ Dados FIPE obtidos: ${fipeData.brand} ` +
        `${fipeData.model} - ${fipeData.fuel}`,
    )

    return {
      brand_name: fipeData.brand,
      model_name: fipeData.model,
      fuel_acronym: fipeData.fuelAcronym,
      display_fuel: fipeData.fuel,
      display_year: fipeData.modelYear,
      fipe_value: Number(
        fipeData.price
          .replace(/[R$\s.]/g, '')
          .replace(',', '.'),
      ),
      code_fipe: fipeData.codeFipe,
      reference_month: fipeData.referenceMonth,
    }
  } catch (error) {
    console.warn(`⚠️ Erro ao buscar dados FIPE: ${error}`)

    // Fallback básico
    const yearMatch = yearId.match(/^(\d{4})/)
    const displayYear = yearMatch
      ? parseInt(yearMatch[1])
      : null

    return {
      brand_name: null,
      model_name: null,
      fuel_acronym: 'G', // Default para gasolina
      display_fuel: 'Gasolina',
      display_year: displayYear,
      fipe_value: null,
      code_fipe: null,
      reference_month: 'N/A',
    }
  }
}

// Função para aguardar um tempo
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Função para criar cache FIPE
async function createFipeCache(
  vehicleData: {
    fipe_brand_code: number
    fipe_model_code: number
    year_id: string
    vehicle_type: VehicleType
  },
  fipeData: {
    fuel_acronym: string | null
    brand_name: string | null
    model_name: string | null
    display_year: number | null
    display_fuel: string | null
    fipe_value: number | null
    code_fipe: string | null
    reference_month: string | null
  },
) {
  if (!fipeData.fipe_value) return

  try {
    // Verificar se já existe cache para essa combinação
    const existingCache = await prisma.fipeCache.findFirst({
      where: {
        brand_code: vehicleData.fipe_brand_code,
        model_code: vehicleData.fipe_model_code,
        year_id: vehicleData.year_id,
        fuel_acronym: fipeData.fuel_acronym || null,
        vehicle_type: vehicleData.vehicle_type,
      },
    })

    if (existingCache) {
      console.log(
        '💾 Cache FIPE já existe: R$ ' +
          `${Number(existingCache.fipe_value).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} (reutilizando)`,
      )
      return existingCache
    }

    // Criar novo cache se não existir
    const newCache = await prisma.fipeCache.create({
      data: {
        brand_code: vehicleData.fipe_brand_code,
        model_code: vehicleData.fipe_model_code,
        year_id: vehicleData.year_id,
        fuel_acronym: fipeData.fuel_acronym || null,
        vehicle_type: vehicleData.vehicle_type,
        fipe_value: fipeData.fipe_value,
        brand_name: fipeData.brand_name,
        model_name: fipeData.model_name,
        model_year: fipeData.display_year,
        fuel_name: fipeData.display_fuel,
        code_fipe: fipeData.code_fipe,
        reference_month: fipeData.reference_month || 'N/A',
      },
    })
    console.log(
      `💾 Cache FIPE criado: R$ ${fipeData.fipe_value?.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    )
    return newCache
  } catch (error) {
    console.warn('⚠️ Erro ao criar cache FIPE:', error)
  }
}

async function main() {
  console.log(
    '🌱 Criando dados iniciais da BMC Car (Schema Final - Compatível com ' +
    'FIPE)...',
  )

  // Criar usuário administrador
  console.log('👤 Criando usuário administrador...')
  const adminPassword = await bcrypt.hash('bmc040526', 10)
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin BMC Car',
      num_cpf: '11111111111',
      email: 'contato@bmccar.com',
      password: adminPassword,
      birthday: new Date('1980-01-01'),
      phone_number: '11999999999',
      avatar: null,
      profile: UserProfile.ADMINISTRATOR,
      is_active: true,
    },
  })

  console.log(`✅ Admin criado: ${adminUser.name} (${adminUser.email})`)

  // Criar os 4 sócios da BMC Car
  console.log('\n🤝 Criando sócios da BMC Car...')
  const partnerPassword = await bcrypt.hash('123456', 10)

  const partners = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Marcos Cavalieri',
        num_cpf: '67263895749',
        email: 'mmarcava@gmail.com',
        password: partnerPassword,
        birthday: new Date('1960-01-14'),
        phone_number: '21998316647',
        avatar: null,
        profile: UserProfile.PARTNER,
        is_active: true,
      },
    }),

    prisma.user.create({
      data: {
        name: 'Marcelo Rezende Bueno',
        num_cpf: '09993186759',
        email: 'marcelorezendebueno@gmail.com',
        password: partnerPassword,
        birthday: new Date('1983-12-05'),
        phone_number: '21998257005',
        avatar: null,
        profile: UserProfile.PARTNER,
        is_active: true,
      },
    }),

    prisma.user.create({
      data: {
        name: 'Rafael Monteiro Moreira',
        num_cpf: '12381208739',
        email: 'rafamm.contato@gmail.com',
        password: partnerPassword,
        birthday: new Date('1986-03-26'),
        phone_number: '21981199793',
        avatar: null,
        profile: UserProfile.PARTNER,
        is_active: true,
      },
    }),

    prisma.user.create({
      data: {
        name: 'Fábio Cattani Pinto Cavalieri',
        num_cpf: '10172758742',
        email: 'fabio2011cavalieri@gmail.com',
        password: partnerPassword,
        birthday: new Date('1986-07-04'),
        phone_number: '21981711099',
        avatar: null,
        profile: UserProfile.PARTNER,
        is_active: true,
      },
    }),
  ])

  console.log('✅ Sócios criados:')
  partners.forEach((partner, index) => {
    console.log(`${index + 1}. ${partner.name} (${partner.email})`)
  })

  // Criar investidores externos
  console.log('\n💰 Criando investidores externos...')
  const investorPassword = await bcrypt.hash('123456', 10)

  const investors = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Igor Olivieri Carneiro',
        num_cpf: '13105385738',
        email: 'igorocarneiro@gmail.com',
        password: investorPassword,
        birthday: new Date('1990-07-15'),
        phone_number: '21998734848',
        avatar: null,
        profile: UserProfile.INVESTOR,
        is_active: true,
      },
    }),

    prisma.user.create({
      data: {
        name: 'Andrea Dos Santos Werneck',
        num_cpf: '00210039710',
        email: 'andrea.werneck13@gmail.com',
        password: investorPassword,
        birthday: new Date('1963-05-13'),
        phone_number: '21999359387',
        avatar: null,
        profile: UserProfile.INVESTOR,
        is_active: true,
      },
    }),
  ])

  console.log('✅ Investidores criados:')
  investors.forEach((investor, index) => {
    console.log(`${index + 1}. ${investor.name} (${investor.email})`)
  })

  // Array com dados base dos veículos (todos os 65 veículos)
  const vehicleBaseData = [
    // Veículos da empresa BMC Car (22 veículos - índices 0-21)
    {
      license_plate: 'LTR6184',
      renavam: '01086680704',
      fipe_brand_code: 21,
      fipe_model_code: 7541,
      year_id: '2017-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: true,
      purchase_date: new Date('2024-11-12'),
      purchase_value: 38000.00,
    },
    {
      license_plate: 'KRQ8F85',
      renavam: '01092654353',
      fipe_brand_code: 56,
      fipe_model_code: 6598,
      year_id: '2017-5',
      vehicle_type: VehicleType.cars,
      color: 'Prata',
      is_company_vehicle: true,
      purchase_date: null,
      purchase_value: 40000.00,
    },
    {
      license_plate: 'PYP3824',
      renavam: '01101885715',
      fipe_brand_code: 48,
      fipe_model_code: 7811,
      year_id: '2017-5',
      vehicle_type: VehicleType.cars,
      color: 'Cinza',
      is_company_vehicle: true,
      purchase_date: null,
      purchase_value: 39000.00,
    },
    {
      license_plate: 'KXN9438',
      renavam: '01116645391',
      fipe_brand_code: 56,
      fipe_model_code: 6251,
      year_id: '2018-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: true,
      purchase_date: null,
      purchase_value: 55000.00,
    },
    {
      license_plate: 'LTK7642',
      renavam: '01155834728',
      fipe_brand_code: 48,
      fipe_model_code: 7891,
      year_id: '2018-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: true,
      purchase_date: null,
      purchase_value: 67000.00,
    },
    {
      license_plate: 'QPL5J62',
      renavam: '01170086664',
      fipe_brand_code: 48,
      fipe_model_code: 7844,
      year_id: '2019-5',
      vehicle_type: VehicleType.cars,
      color: 'Prata',
      is_company_vehicle: true,
      purchase_date: null,
      purchase_value: 50311.00,
    },
    {
      license_plate: 'LNH6C70',
      renavam: '01176038041',
      fipe_brand_code: 56,
      fipe_model_code: 6247,
      year_id: '2019-5',
      vehicle_type: VehicleType.cars,
      color: 'Prata',
      is_company_vehicle: true,
      purchase_date: new Date('2025-02-24'),
      purchase_value: 60000.00,
    },
    {
      license_plate: 'QQF5D71',
      renavam: '01183091033',
      fipe_brand_code: 48,
      fipe_model_code: 7808,
      year_id: '2020-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: true,
      purchase_date: null,
      purchase_value: 52900.00,
    },
    {
      license_plate: 'QUT0H27',
      renavam: '01205301400',
      fipe_brand_code: 59,
      fipe_model_code: 8323,
      year_id: '2020-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: true,
      purchase_date: new Date('2024-11-26'),
      purchase_value: 43500.00,
    },
    {
      license_plate: 'QXC9G05',
      renavam: '01215890351',
      fipe_brand_code: 59,
      fipe_model_code: 8323,
      year_id: '2020-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: true,
      purchase_date: new Date('2024-11-26'),
      purchase_value: 43500.00,
    },
    {
      license_plate: 'QXP7J13',
      renavam: '01223624614',
      fipe_brand_code: 59,
      fipe_model_code: 8326,
      year_id: '2021-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: true,
      purchase_date: null,
      purchase_value: 60500.00,
    },
    {
      license_plate: 'QXY0H34',
      renavam: '01227156690',
      fipe_brand_code: 48,
      fipe_model_code: 8792,
      year_id: '2021-5',
      vehicle_type: VehicleType.cars,
      color: 'Prata',
      is_company_vehicle: true,
      purchase_date: null,
      purchase_value: 56000.00,
    },
    {
      license_plate: 'RJQ1H61',
      renavam: '01245281140',
      fipe_brand_code: 48,
      fipe_model_code: 8023,
      year_id: '2021-5',
      vehicle_type: VehicleType.cars,
      color: 'Vermelha',
      is_company_vehicle: true,
      purchase_date: new Date('2024-09-27'),
      purchase_value: 39300.00,
    },
    {
      license_plate: 'RBW2A51',
      renavam: '01254541915',
      fipe_brand_code: 48,
      fipe_model_code: 9064,
      year_id: '2021-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: true,
      purchase_date: new Date('2024-11-21'),
      purchase_value: 66426.00,
    },
    {
      license_plate: 'RUL1G03',
      renavam: '01301705150',
      fipe_brand_code: 48,
      fipe_model_code: 9064,
      year_id: '2023-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: true,
      purchase_date: new Date('2025-04-24'),
      purchase_value: 65100.00,
    },
    {
      license_plate: 'RUL5F22',
      renavam: '01301995972',
      fipe_brand_code: 48,
      fipe_model_code: 9064,
      year_id: '2023-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: true,
      purchase_date: new Date('2025-08-07'),
      purchase_value: 62700.00,
    },
    {
      license_plate: 'TTY0C35',
      renavam: '01422355591',
      fipe_brand_code: 59,
      fipe_model_code: 10176,
      year_id: '2025-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: true,
      purchase_date: new Date('2024-12-19'),
      purchase_value: 78565.96,
    },
    {
      license_plate: 'PXD8483',
      renavam: '01073770254',
      fipe_brand_code: 48,
      fipe_model_code: 7289,
      year_id: '2016-5',
      vehicle_type: VehicleType.cars,
      color: 'Preta',
      is_company_vehicle: true,
      purchase_date: new Date('2020-10-22'),
      purchase_value: 26900.00,
    },
    {
      license_plate: 'QQE9I80',
      renavam: '01182793310',
      fipe_brand_code: 48,
      fipe_model_code: 7808,
      year_id: '2020-5',
      vehicle_type: VehicleType.cars,
      color: 'Cinza',
      is_company_vehicle: true,
      purchase_date: null,
      purchase_value: null,
    },
    {
      license_plate: 'LMV6G09',
      renavam: '01190838882',
      fipe_brand_code: 101,
      fipe_model_code: 7388,
      year_id: '2020-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Preta',
      is_company_vehicle: true,
      purchase_date: null,
      purchase_value: 11000.00,
    },
    {
      license_plate: 'SRD8J37',
      renavam: '01387837416',
      fipe_brand_code: 101,
      fipe_model_code: 7388,
      year_id: '2024-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Azul',
      is_company_vehicle: true,
      purchase_date: null,
      purchase_value: 16190.00,
    },
    {
      license_plate: 'SRQ3C87',
      renavam: '01394806326',
      fipe_brand_code: 101,
      fipe_model_code: 7388,
      year_id: '2024-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Azul',
      is_company_vehicle: true,
      purchase_date: null,
      purchase_value: 16090.00,
    },
    {
      license_plate: 'RFI0H00',
      renavam: '01234800028',
      fipe_brand_code: 21,
      fipe_model_code: 7540,
      year_id: '2020-5',
      vehicle_type: VehicleType.cars,
      color: 'Prata',
      is_company_vehicle: false,
      purchase_date: new Date('2024-12-12'),
      purchase_value: 42500.00,
    },
    {
      license_plate: 'RVO7F62',
      renavam: '01328147565',
      fipe_brand_code: 21,
      fipe_model_code: 7540,
      year_id: '2023-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: false,
      observations: null,
      purchase_date: new Date('2025-03-17'),
      purchase_value: 41950.00,
    },
    {
      license_plate: 'RVO7D83',
      renavam: '01328145589',
      fipe_brand_code: 21,
      fipe_model_code: 7540,
      year_id: '2023-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: false,
      observations: null,
      purchase_date: new Date('2025-03-17'),
      purchase_value: 43194.00,
    },
    {
      license_plate: 'RSA8H56',
      renavam: '01267155385',
      fipe_brand_code: 48,
      fipe_model_code: 9064,
      year_id: '2022-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: false,
      observations: null,
      purchase_date: new Date('2025-03-20'),
      purchase_value: 61000.00,
    },
    {
      license_plate: 'RSB9G78',
      renavam: '01274713371',
      fipe_brand_code: 48,
      fipe_model_code: 9064,
      year_id: '2022-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: false,
      observations: null,
      purchase_date: new Date('2025-03-20'),
      purchase_value: 59000.00,
    },
    {
      license_plate: 'BBI7G82',
      renavam: '01119301707',
      fipe_brand_code: 48,
      fipe_model_code: 7990,
      year_id: '2018-5',
      vehicle_type: VehicleType.cars,
      color: 'Marrom',
      is_company_vehicle: false,
      observations: null,
      purchase_date: new Date('2024-11-27'),
      purchase_value: 60000.00,
    },
    {
      license_plate: 'SRO9C79',
      renavam: '01392072686',
      fipe_brand_code: 101,
      fipe_model_code: 7388,
      year_id: '2024-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Azul',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: 16090.00,
    },
    {
      license_plate: 'SRS0B42',
      renavam: '01387834530',
      fipe_brand_code: 101,
      fipe_model_code: 7388,
      year_id: '2024-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Preta',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: 15700.00,
    },
    {
      license_plate: 'SRV5H77',
      renavam: '01400681577',
      fipe_brand_code: 101,
      fipe_model_code: 7388,
      year_id: '2024-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Azul',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: 16090.00,
    },
    {
      license_plate: 'SRR8B33',
      renavam: '01396554685',
      fipe_brand_code: 101,
      fipe_model_code: 7388,
      year_id: '2024-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Azul',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: 15700.00,
    },
    {
      license_plate: 'FWD4I31',
      renavam: '01268231417',
      fipe_brand_code: 48,
      fipe_model_code: 9064,
      year_id: '2022-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: null,
    },
    {
      license_plate: 'FQU7A83',
      renavam: '01268231069',
      fipe_brand_code: 48,
      fipe_model_code: 9064,
      year_id: '2022-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: false,
      observations: null,
      purchase_date: new Date('2025-07-15'),
      purchase_value: 59730.00,
    },
    {
      license_plate: 'QNN4D26',
      renavam: '01137672266',
      fipe_brand_code: 59,
      fipe_model_code: 6809,
      year_id: '2018-5',
      vehicle_type: VehicleType.cars,
      color: 'Prata',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: null,
    },
    {
      license_plate: 'QNZ9E15',
      renavam: '01147214058',
      fipe_brand_code: 59,
      fipe_model_code: 6809,
      year_id: '2018-5',
      vehicle_type: VehicleType.cars,
      color: 'Prata',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: 50315.00,
    },
    {
      license_plate: 'QOY6B65',
      renavam: '01162786911',
      fipe_brand_code: 43,
      fipe_model_code: 7164,
      year_id: '2019-5',
      vehicle_type: VehicleType.cars,
      color: 'Prata',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: null,
    },
    {
      license_plate: 'QQL0D87',
      renavam: '01186458345',
      fipe_brand_code: 48,
      fipe_model_code: 7809,
      year_id: '2020-5',
      vehicle_type: VehicleType.cars,
      color: 'Prata',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: null,
    },
    {
      license_plate: 'QUA7I87',
      renavam: '01194689806',
      fipe_brand_code: 48,
      fipe_model_code: 7809,
      year_id: '2020-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: 53950.00,
    },
    {
      license_plate: 'RSB0E86',
      renavam: '01267335154',
      fipe_brand_code: 48,
      fipe_model_code: 9064,
      year_id: '2022-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: false,
      observations: null,
      purchase_date: new Date('2025-03-20'),
      purchase_value: 50000.00,
    },
    {
      license_plate: 'RTU1E97',
      renavam: '01290884240',
      fipe_brand_code: 48,
      fipe_model_code: 9064,
      year_id: '2023-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: null,
    },
    {
      license_plate: 'RUL5E76',
      renavam: '01301995301',
      fipe_brand_code: 48,
      fipe_model_code: 9064,
      year_id: '2023-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: false,
      observations: null,
      purchase_date: new Date('2025-03-28'),
      purchase_value: 59000.00,
    },
    {
      license_plate: 'RUL5F04',
      renavam: '01301995670',
      fipe_brand_code: 48,
      fipe_model_code: 9064,
      year_id: '2023-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: null,
    },
    {
      license_plate: 'QPP5D56',
      renavam: '01172244054',
      fipe_brand_code: 48,
      fipe_model_code: 7844,
      year_id: '2019-5',
      vehicle_type: VehicleType.cars,
      color: 'Prata',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: 46500.00,
    },
    {
      license_plate: 'RLV7C29',
      renavam: '01253190523',
      fipe_brand_code: 21,
      fipe_model_code: 7540,
      year_id: '2021-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: null,
    },
    {
      license_plate: 'SRF7G13',
      renavam: '01394803424',
      fipe_brand_code: 101,
      fipe_model_code: 7388,
      year_id: '2024-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Preta',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: 16190.00,
    },
    {
      license_plate: 'SRK7D11',
      renavam: '01382427449',
      fipe_brand_code: 101,
      fipe_model_code: 7388,
      year_id: '2024-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Vermelha',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: 15800.00,
    },
    {
      license_plate: 'SRU7G27',
      renavam: '01389013054',
      fipe_brand_code: 101,
      fipe_model_code: 7388,
      year_id: '2024-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Vermelha',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: 16190.00,
    },
    {
      license_plate: 'SRV0I38',
      renavam: '01395238100',
      fipe_brand_code: 101,
      fipe_model_code: 7388,
      year_id: '2024-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Preta',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: 16190.00,
    },
    {
      license_plate: 'SRR2B33',
      renavam: '01395236213',
      fipe_brand_code: 101,
      fipe_model_code: 7388,
      year_id: '2024-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Preta',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: 16190.00,
    },
    {
      license_plate: 'SRU9F46',
      renavam: '01394804960',
      fipe_brand_code: 101,
      fipe_model_code: 7388,
      year_id: '2024-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Preta',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: 16190.00,
    },
    {
      license_plate: 'SRR8B06',
      renavam: '01396547182',
      fipe_brand_code: 101,
      fipe_model_code: 7388,
      year_id: '2024-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Azul',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: 15700.00,
    },
    {
      license_plate: 'SRW4F99',
      renavam: '01402580700',
      fipe_brand_code: 101,
      fipe_model_code: 7388,
      year_id: '2024-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Vermelha',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: 16690.00,
    },
    {
      license_plate: 'SRX5E49',
      renavam: '01404617776',
      fipe_brand_code: 101,
      fipe_model_code: 7388,
      year_id: '2024-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Preta',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: 16690.00,
    },
    {
      license_plate: 'SSA8F91',
      renavam: '01405931954',
      fipe_brand_code: 101,
      fipe_model_code: 7388,
      year_id: '2024-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Azul',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: 16690.00,
    },
    {
      license_plate: 'SSD3I82',
      renavam: '01415007591',
      fipe_brand_code: 101,
      fipe_model_code: 7388,
      year_id: '2024-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Preta',
      is_company_vehicle: false,
      observations: null,
      purchase_date: new Date('2024-10-23'),
      purchase_value: 16690.00,
    },
    {
      license_plate: 'TTG8I79',
      renavam: '01439090901',
      fipe_brand_code: 101,
      fipe_model_code: 11330,
      year_id: '2025-5',
      vehicle_type: VehicleType.motorcycles,
      color: 'Vermelha',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: null,
    },
    {
      license_plate: 'RIW9A17',
      renavam: '01352349652',
      fipe_brand_code: 101,
      fipe_model_code: 8143,
      year_id: '2023-5',
      vehicle_type: VehicleType.motorcycles,
      color: 'Azul',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: null,
    },
    {
      license_plate: 'TUJ1G84',
      renavam: '01448709277',
      fipe_brand_code: 101,
      fipe_model_code: 11335,
      year_id: '2025-5',
      vehicle_type: VehicleType.motorcycles,
      color: 'Branca',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: null,
    },
    {
      license_plate: 'SRP5J00',
      renavam: '01377211794',
      fipe_brand_code: 80,
      fipe_model_code: 8071,
      year_id: '2024-5',
      vehicle_type: VehicleType.motorcycles,
      color: 'Vermelha',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: null,
    },
    {
      license_plate: 'SRN5H32',
      renavam: '01377214220',
      fipe_brand_code: 80,
      fipe_model_code: 8071,
      year_id: '2024-5',
      vehicle_type: VehicleType.motorcycles,
      color: 'Vermelha',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: null,
    },
    {
      license_plate: 'SRD6I99',
      renavam: '01387222462',
      fipe_brand_code: 80,
      fipe_model_code: 7525,
      year_id: '2024-1',
      vehicle_type: VehicleType.motorcycles,
      color: 'Vermelha',
      is_company_vehicle: false,
      observations: null,
      purchase_date: null,
      purchase_value: null,
    },
    {
      license_plate: 'LMR9D82',
      renavam: '01178643791',
      fipe_brand_code: 48,
      fipe_model_code: 9587,
      year_id: '2019-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: false,
      observations: null,
      purchase_date: new Date('2024-10-02'),
      purchase_value: 67500.00,
    },
    {
      license_plate: 'LUA1J78',
      renavam: '01206386611',
      fipe_brand_code: 48,
      fipe_model_code: 9587,
      year_id: '2020-5',
      vehicle_type: VehicleType.cars,
      color: 'Branca',
      is_company_vehicle: false,
      observations: null,
      purchase_date: new Date('2025-01-08'),
      purchase_value: 69000.00,
    },
  ]

  console.log('\n🚗 Criando veículos com dados FIPE integrados...')
  console.log('⏱️ Processando sequencialmente para evitar sobrecarga da API...')

  const vehicles = []

  // Criar os veículos sequencialmente com busca FIPE
  for (let i = 0; i < vehicleBaseData.length; i++) {
    const vehicleData = vehicleBaseData[i]

    console.log(
      `\n📍 [${i + 1}/${vehicleBaseData.length}] Criando veículo ` +
        `${vehicleData.license_plate}...`,
    )

    // Buscar dados FIPE
    const fipeData = await fetchFipeData(
      vehicleData.fipe_brand_code,
      vehicleData.fipe_model_code,
      vehicleData.year_id,
      vehicleData.vehicle_type,
    )

    // Criar o veículo com dados FIPE
    const vehicle = await prisma.vehicle.create({
      data: {
        ...vehicleData,
        brand_name: fipeData.brand_name,
        model_name: fipeData.model_name,
        fuel_acronym: fipeData.fuel_acronym || null,
        display_fuel: fipeData.display_fuel,
        display_year: fipeData.display_year,
        observations: null,
      },
    })

    vehicles.push(vehicle)

    // Criar cache FIPE
    await createFipeCache(vehicleData, fipeData)

    // Se for veículo da empresa, criar participações para sócios
    if (vehicleData.is_company_vehicle) {
      const ownershipPercentage = 100 / partners.length

      for (const partner of partners) {
        await prisma.vehicleOwnership.create({
          data: {
            vehicle_id: vehicle.id,
            user_id: partner.id,
            ownership_percentage: ownershipPercentage,
          },
        })
      }

      console.log(
        `👥 Criadas ${partners.length} participações de ` +
          `${ownershipPercentage.toFixed(2)}% cada`,
      )
    } else {
      // Criar participações para veículos compartilhados/individuais
      // Veículos compartilhados Rafael + Fábio + Marcelo (índices 22-31)
      if (i >= 22 && i <= 31) {
        const sharedOwners = partners.filter(
          p =>
            p.name === 'Rafael Monteiro Moreira' ||
            p.name === 'Fábio Cattani Pinto Cavalieri' ||
            p.name === 'Marcelo Rezende Bueno',
        )
        const ownershipPercentage = 100 / sharedOwners.length

        for (const owner of sharedOwners) {
          await prisma.vehicleOwnership.create({
            data: {
              vehicle_id: vehicle.id,
              user_id: owner.id,
              ownership_percentage: ownershipPercentage,
            },
          })
        }

        console.log(
          `👥 Criadas ${sharedOwners.length} participações ` +
            `compartilhadas de ${ownershipPercentage.toFixed(2)}% cada ` +
            '(Rafael + Fábio + Marcelo)',
        )
      } else if (i === 32) {
        // Veículo compartilhado Fábio + Marcos (índice 32)
        const sharedOwners = partners.filter(
          p =>
            p.name === 'Fábio Cattani Pinto Cavalieri' ||
            p.name === 'Marcos Cavalieri',
        )
        const ownershipPercentage = 100 / sharedOwners.length

        for (const owner of sharedOwners) {
          await prisma.vehicleOwnership.create({
            data: {
              vehicle_id: vehicle.id,
              user_id: owner.id,
              ownership_percentage: ownershipPercentage,
            },
          })
        }

        console.log(
          `👥 Criadas ${sharedOwners.length} participações ` +
            `compartilhadas de ${ownershipPercentage.toFixed(2)}% cada ` +
            '(Fábio + Marcos)',
        )
      } else if (i === 33) {
        // Veículo individual de Fábio (índice 33)
        const fabio = partners.find(
          p => p.name === 'Fábio Cattani Pinto Cavalieri',
        )
        if (fabio) {
          await prisma.vehicleOwnership.create({
            data: {
              vehicle_id: vehicle.id,
              user_id: fabio.id,
              ownership_percentage: 100,
            },
          })

          console.log('👤 Criada 1 participação individual de 100% (Fábio)')
        }
      } else if (i >= 34 && i <= 62) {
        // Veículos do investidor Igor (índices 34-62)
        const igor = investors.find(p => p.name === 'Igor Olivieri Carneiro')
        if (igor) {
          await prisma.vehicleOwnership.create({
            data: {
              vehicle_id: vehicle.id,
              user_id: igor.id,
              ownership_percentage: 100,
            },
          })

          console.log('👤 Criada 1 participação individual de 100% (Igor)')
        }
      } else if (i >= 63 && i <= 64) {
        // Veículos da investidora Andrea (índices 63-64)
        const andrea = investors.find(
          p => p.name === 'Andrea Dos Santos Werneck',
        )
        if (andrea) {
          await prisma.vehicleOwnership.create({
            data: {
              vehicle_id: vehicle.id,
              user_id: andrea.id,
              ownership_percentage: 100,
            },
          })

          console.log('👤 Criada 1 participação individual de 100% (Andrea)')
        }
      }
    }

    // Delay para não sobrecarregar a API FIPE
    if (i < vehicleBaseData.length - 1) {
      console.log('⏳ Aguardando 0,2 segundos...')
      await delay(200)
    }
  }

  console.log(
    `\n✅ ${vehicles.length} veículos criados com dados FIPE integrados`,
  )

  // Resumo final
  console.log('\n🎉 Seed executado com sucesso!')
  console.log('\n📊 Resumo dos dados criados:')
  console.log(
    `👤 Usuários: ${1 + partners.length + investors.length} (1 admin + ` +
    `${partners.length} sócios + ${investors.length} investidores)`,
  )
  console.log(`🚗 Veículos: ${vehicles.length} (com dados FIPE integrados)`)

  console.log('\n🔑 Credenciais de acesso:')
  console.log('🔹 Admin: contato@bmccar.com (senha: bmc040526)')
  console.log('🔹 Sócios: emails dos sócios (senha: 123456)')
  console.log('🔹 Investidores: emails dos investidores (senha: 123456)')

  console.log('\n✅ Dados FIPE integrados automaticamente!')
  console.log('💾 Cache FIPE criado para melhor performance!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Erro ao executar seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
