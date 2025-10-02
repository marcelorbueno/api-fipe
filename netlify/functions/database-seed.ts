import type { Handler, HandlerEvent } from '@netlify/functions'
import { PrismaClient, VehicleColor } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'minimal',
})

// Mock da API FIPE para dados básicos (evitar dependências externas)
const mockFipeData = {
  brand_name: null,
  model_name: null,
  fuel_acronym: 'G',
  display_fuel: 'Gasolina',
  display_year: null,
  fipe_value: null,
  code_fipe: null,
  reference_month: 'N/A',
}

interface VehicleData {
  license_plate: string
  renavam: string
  fipe_brand_code: number
  fipe_model_code: number
  year_id: string
  vehicle_type: 'cars' | 'motorcycles'
  color: VehicleColor
  is_company_vehicle: boolean
  purchase_date: Date | null
  purchase_value: number
}

// Dados base dos veículos (mesmos do seed-full.ts)
const vehicleBaseData: VehicleData[] = [
  // Veículos da empresa BMC Car (22 veículos)
  {
    license_plate: 'LTR6184',
    renavam: '01086680704',
    fipe_brand_code: 21,
    fipe_model_code: 7541,
    year_id: '2017-5',
    vehicle_type: 'cars',
    color: VehicleColor.BRANCA,
    is_company_vehicle: true,
    purchase_date: new Date('2024-11-12'),
    purchase_value: 38000.0,
  },
  {
    license_plate: 'KRQ8F85',
    renavam: '01092654353',
    fipe_brand_code: 56,
    fipe_model_code: 6598,
    year_id: '2017-5',
    vehicle_type: 'cars',
    color: VehicleColor.PRATA,
    is_company_vehicle: true,
    purchase_date: null,
    purchase_value: 40000.0,
  },
  {
    license_plate: 'PYP3824',
    renavam: '01101885715',
    fipe_brand_code: 48,
    fipe_model_code: 7811,
    year_id: '2017-5',
    vehicle_type: 'cars',
    color: VehicleColor.CINZA,
    is_company_vehicle: true,
    purchase_date: null,
    purchase_value: 39000.0,
  },
  {
    license_plate: 'KXN9438',
    renavam: '01116645391',
    fipe_brand_code: 56,
    fipe_model_code: 6251,
    year_id: '2018-5',
    vehicle_type: 'cars',
    color: VehicleColor.BRANCA,
    is_company_vehicle: true,
    purchase_date: null,
    purchase_value: 55000.0,
  },
  {
    license_plate: 'LTK7642',
    renavam: '01155834728',
    fipe_brand_code: 48,
    fipe_model_code: 7891,
    year_id: '2018-5',
    vehicle_type: 'cars',
    color: VehicleColor.BRANCA,
    is_company_vehicle: true,
    purchase_date: null,
    purchase_value: 67000.0,
  },
  // Adicionando mais alguns veículos da empresa
  {
    license_plate: 'QPL5J62',
    renavam: '01170086664',
    fipe_brand_code: 48,
    fipe_model_code: 7844,
    year_id: '2019-5',
    vehicle_type: 'cars',
    color: VehicleColor.PRATA,
    is_company_vehicle: true,
    purchase_date: null,
    purchase_value: 50311.0,
  },
  {
    license_plate: 'LNH6C70',
    renavam: '01176038041',
    fipe_brand_code: 56,
    fipe_model_code: 6247,
    year_id: '2019-5',
    vehicle_type: 'cars',
    color: VehicleColor.PRATA,
    is_company_vehicle: true,
    purchase_date: new Date('2025-02-24'),
    purchase_value: 60000.0,
  },
  // Veículos individuais
  {
    license_plate: 'RFI0H00',
    renavam: '01234800028',
    fipe_brand_code: 21,
    fipe_model_code: 7540,
    year_id: '2020-5',
    vehicle_type: 'cars',
    color: VehicleColor.PRATA,
    is_company_vehicle: false,
    purchase_date: new Date('2024-12-12'),
    purchase_value: 42500.0,
  },
  {
    license_plate: 'RVO7F62',
    renavam: '01328147565',
    fipe_brand_code: 21,
    fipe_model_code: 7540,
    year_id: '2023-5',
    vehicle_type: 'cars',
    color: VehicleColor.BRANCA,
    is_company_vehicle: false,
    purchase_date: new Date('2025-03-17'),
    purchase_value: 41950.0,
  },
  {
    license_plate: 'SRO9C79',
    renavam: '01392072686',
    fipe_brand_code: 101,
    fipe_model_code: 7388,
    year_id: '2024-1',
    vehicle_type: 'motorcycles',
    color: VehicleColor.AZUL,
    is_company_vehicle: false,
    purchase_date: null,
    purchase_value: 16090.0,
  },
]

export const handler: Handler = async (event: HandlerEvent) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    }
  }

  try {
    console.log('🌱 Starting database seed...')

    // 1. Criar usuário administrador
    console.log('👤 Creating admin user...')
    const adminPassword = await bcrypt.hash('bmc040526', 10)
    await prisma.user.create({
      data: {
        name: 'Admin BMC Car',
        num_cpf: '11111111111',
        email: 'contato@bmccar.com',
        password: adminPassword,
        birthday: new Date('1980-01-01'),
        phone_number: '11999999999',
        avatar: null,
        profile: 'ADMINISTRATOR',
        is_active: true,
      },
    })

    // 2. Criar os 4 sócios da BMC Car
    console.log('🤝 Creating BMC Car partners...')
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
          profile: 'PARTNER',
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
          profile: 'PARTNER',
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
          profile: 'PARTNER',
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
          profile: 'PARTNER',
          is_active: true,
        },
      }),
    ])

    // 3. Criar investidores externos
    console.log('💰 Creating external investors...')
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
          profile: 'INVESTOR',
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
          profile: 'INVESTOR',
          is_active: true,
        },
      }),
    ])

    // 4. Criar veículos
    console.log('🚗 Creating vehicles...')
    const vehicles = []

    for (let i = 0; i < vehicleBaseData.length; i++) {
      const vehicleData = vehicleBaseData[i]

      console.log(
        `Creating vehicle ${i + 1}/${vehicleBaseData.length}: ${vehicleData.license_plate}`,
      )

      // Criar o veículo
      const vehicle = await prisma.vehicle.create({
        data: {
          ...vehicleData,
          brand_name: mockFipeData.brand_name,
          model_name: mockFipeData.model_name,
          fuel_acronym: mockFipeData.fuel_acronym,
          display_fuel: mockFipeData.display_fuel,
          display_year: vehicleData.year_id
            ? parseInt(vehicleData.year_id.split('-')[0])
            : null,
          observations: null,
        },
      })

      vehicles.push(vehicle)

      // Criar participações
      if (vehicleData.is_company_vehicle) {
        // Veículo da empresa - distribuir entre todos os sócios
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
      } else {
        // Veículo individual - atribuir ao Igor (investidor principal)
        const igor = investors.find((p) => p.name === 'Igor Olivieri Carneiro')
        if (igor) {
          await prisma.vehicleOwnership.create({
            data: {
              vehicle_id: vehicle.id,
              user_id: igor.id,
              ownership_percentage: 100,
            },
          })
        }
      }
    }

    await prisma.$disconnect()

    const totalUsers = 1 + partners.length + investors.length

    console.log('✅ Database seed completed successfully!')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        message: 'Database seed completed successfully',
        timestamp: new Date().toISOString(),
        summary: {
          users: {
            total: totalUsers,
            admin: 1,
            partners: partners.length,
            investors: investors.length,
          },
          vehicles: {
            total: vehicles.length,
            company_vehicles: vehicles.filter((v) => v.is_company_vehicle)
              .length,
            individual_vehicles: vehicles.filter((v) => !v.is_company_vehicle)
              .length,
          },
        },
        credentials: {
          admin: 'contato@bmccar.com (password: bmc040526)',
          partners: 'partner emails (password: 123456)',
          investors: 'investor emails (password: 123456)',
        },
      }),
    }
  } catch (error) {
    console.error('❌ Database seed error:', error)
    await prisma.$disconnect()

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    const errorCode =
      error && typeof error === 'object' && 'code' in error
        ? (error.code as string)
        : 'UNKNOWN'

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'Database seed failed',
        timestamp: new Date().toISOString(),
        error: {
          message: errorMessage,
          code: errorCode,
        },
      }),
    }
  }
}
