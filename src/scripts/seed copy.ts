import { PrismaClient, UserProfile, VehicleType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log(
    '🌱 Criando dados iniciais da BMC Car (Schema Final - Compatível com ' +
    'FIPE)...',
  )

  // Criar usuário administrador
  console.log('👤 Criando usuário administrador...')
  const adminPassword = await bcrypt.hash('admin123', 10)
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin BMC Car',
      num_cpf: '11111111111',
      email: 'admin@bmccar.com',
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
  const partnerPassword = await bcrypt.hash('partner123', 10)

  const partners = await Promise.all([
    prisma.user.create({
      data: {
        name: 'João Silva',
        num_cpf: '12345678901',
        email: 'joao.silva@bmccar.com',
        password: partnerPassword,
        birthday: new Date('1985-03-15'),
        phone_number: '11987654321',
        avatar: null,
        profile: UserProfile.PARTNER,
        is_active: true,
      },
    }),

    prisma.user.create({
      data: {
        name: 'Maria Santos',
        num_cpf: '98765432109',
        email: 'maria.santos@bmccar.com',
        password: partnerPassword,
        birthday: new Date('1990-07-22'),
        phone_number: '11876543210',
        avatar: null,
        profile: UserProfile.PARTNER,
        is_active: true,
      },
    }),

    prisma.user.create({
      data: {
        name: 'Carlos Oliveira',
        num_cpf: '45678912345',
        email: 'carlos.oliveira@bmccar.com',
        password: partnerPassword,
        birthday: new Date('1982-11-08'),
        phone_number: '11765432109',
        avatar: null,
        profile: UserProfile.PARTNER,
        is_active: true,
      },
    }),

    prisma.user.create({
      data: {
        name: 'Ana Costa',
        num_cpf: '78912345678',
        email: 'ana.costa@bmccar.com',
        password: partnerPassword,
        birthday: new Date('1988-05-30'),
        phone_number: '11654321098',
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
  const investorPassword = await bcrypt.hash('investor123', 10)

  const investors = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Roberto Investidor',
        num_cpf: '22222222222',
        email: 'roberto.investor@example.com',
        password: investorPassword,
        birthday: new Date('1975-05-10'),
        phone_number: '11888777666',
        avatar: null,
        profile: UserProfile.INVESTOR,
        is_active: true,
      },
    }),

    prisma.user.create({
      data: {
        name: 'Patricia Capital',
        num_cpf: '33333333333',
        email: 'patricia.capital@example.com',
        password: investorPassword,
        birthday: new Date('1983-12-20'),
        phone_number: '11777666555',
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

  // Criar veículos de exemplo com formato FIPE correto
  console.log('\n🚗 Criando veículos de exemplo (formato FIPE)...')

  const vehicles = await Promise.all([
    // V1 e V2: Veículos da empresa BMC Car
    prisma.vehicle.create({
      data: {
        license_plate: 'ABC1234',
        renavam: '12345678901',
        fipe_brand_code: 21, // Fiat
        fipe_model_code: 4828, // Uno
        year_id: '2020-1',     // Formato FIPE
        fuel_acronym: 'G',     // Gasolina
        vehicle_type: VehicleType.cars,
        display_year: 2020,
        display_fuel: 'Gasolina',
        brand_name: 'Fiat',
        model_name: 'Uno Mille 1.0',
        color: 'Branco',
        is_company_vehicle: true,
        observations: 'Veículo da frota BMC Car',
        purchase_date: new Date('2020-01-15'),
        purchase_value: 45000.00,
      },
    }),

    prisma.vehicle.create({
      data: {
        license_plate: 'DEF5678',
        renavam: '23456789012',
        fipe_brand_code: 21, // Fiat
        fipe_model_code: 4631, // Palio
        year_id: '2021-1',     // Formato FIPE
        fuel_acronym: 'G',     // Flex (considerando como G)
        vehicle_type: VehicleType.cars,
        display_year: 2021,
        display_fuel: 'Flex',
        brand_name: 'Fiat',
        model_name: 'Palio Fire 1.0',
        color: 'Prata',
        is_company_vehicle: true,
        observations: 'Veículo da frota BMC Car',
        purchase_date: new Date('2021-03-10'),
        purchase_value: 52000.00,
      },
    }),

    // V3: Veículo individual do João
    prisma.vehicle.create({
      data: {
        license_plate: 'GHI9012',
        renavam: '34567890123',
        fipe_brand_code: 6, // Chevrolet
        fipe_model_code: 39, // Onix
        year_id: '2022-1',   // Formato FIPE
        fuel_acronym: 'G',   // Flex
        vehicle_type: VehicleType.cars,
        display_year: 2022,
        display_fuel: 'Flex',
        brand_name: 'Chevrolet',
        model_name: 'Onix 1.0 LT',
        color: 'Preto',
        is_company_vehicle: false,
        observations: 'Veículo pessoal do João',
        purchase_date: new Date('2022-06-15'),
        purchase_value: 65000.00,
      },
    }),

    // V4: Veículo compartilhado João + Maria
    prisma.vehicle.create({
      data: {
        license_plate: 'JKL3456',
        renavam: '45678901234',
        fipe_brand_code: 22, // Ford
        fipe_model_code: 25, // Focus
        year_id: '2021-1',   // Formato FIPE
        fuel_acronym: 'G',   // Flex
        vehicle_type: VehicleType.cars,
        display_year: 2021,
        display_fuel: 'Flex',
        brand_name: 'Ford',
        model_name: 'Focus Hatch 1.6',
        color: 'Azul',
        is_company_vehicle: false,
        observations: 'Veículo compartilhado João e Maria',
        purchase_date: new Date('2021-09-20'),
        purchase_value: 75000.00,
      },
    }),

    // V5: Veículo compartilhado João + Maria + Carlos
    prisma.vehicle.create({
      data: {
        license_plate: 'MNO7890',
        renavam: '56789012345',
        fipe_brand_code: 59, // Volkswagen
        fipe_model_code: 5940, // Amarok
        year_id: '2023-1',   // Formato FIPE
        fuel_acronym: 'D',   // Diesel
        vehicle_type: VehicleType.cars,
        display_year: 2023,
        display_fuel: 'Diesel',
        brand_name: 'Volkswagen',
        model_name: 'Amarok CD 2.0 TDI 4x4',
        color: 'Vermelho',
        is_company_vehicle: false,
        observations: 'Veículo compartilhado entre 3 sócios',
        purchase_date: new Date('2023-01-10'),
        purchase_value: 120000.00,
      },
    }),

    // V6 e V7: Veículos do investidor Roberto
    prisma.vehicle.create({
      data: {
        license_plate: 'PQR1234',
        renavam: '67890123456',
        fipe_brand_code: 11, // BMW
        fipe_model_code: 102, // X5
        year_id: '2023-1',   // Formato FIPE
        fuel_acronym: 'G',   // Gasolina
        vehicle_type: VehicleType.cars,
        display_year: 2023,
        display_fuel: 'Gasolina',
        brand_name: 'BMW',
        model_name: 'X5 3.0 xDrive30d',
        color: 'Preto',
        is_company_vehicle: false,
        observations: 'Veículo do investidor Roberto',
        purchase_date: new Date('2023-05-15'),
        purchase_value: 250000.00,
      },
    }),

    prisma.vehicle.create({
      data: {
        license_plate: 'STU5678',
        renavam: '78901234567',
        fipe_brand_code: 11, // BMW
        fipe_model_code: 78, // Serie 3
        year_id: '2022-1',   // Formato FIPE
        fuel_acronym: 'G',   // Gasolina
        vehicle_type: VehicleType.cars,
        display_year: 2022,
        display_fuel: 'Gasolina',
        brand_name: 'BMW',
        model_name: '320i 2.0 Active',
        color: 'Branco',
        is_company_vehicle: false,
        observations: 'Segundo veículo do investidor Roberto',
        purchase_date: new Date('2022-11-30'),
        purchase_value: 180000.00,
      },
    }),

    // V8: Veículo da investidora Patricia
    prisma.vehicle.create({
      data: {
        license_plate: 'VWX9012',
        renavam: '89012345678',
        fipe_brand_code: 1, // Audi
        fipe_model_code: 89, // A4
        year_id: '2023-1',   // Formato FIPE
        fuel_acronym: 'G',   // Gasolina
        vehicle_type: VehicleType.cars,
        display_year: 2023,
        display_fuel: 'Gasolina',
        brand_name: 'Audi',
        model_name: 'A4 2.0 TFSI',
        color: 'Cinza',
        is_company_vehicle: false,
        observations: 'Veículo da investidora Patricia',
        purchase_date: new Date('2023-03-25'),
        purchase_value: 200000.00,
      },
    }),
  ])

  console.log(`✅ ${vehicles.length} veículos criados com formato FIPE`)

  // Criar participações nos veículos
  console.log('\n📊 Criando participações nos veículos...')

  const ownerships = []

  // V1 e V2: Veículos da empresa (25% para cada sócio)
  for (let i = 0; i < 2; i++) {
    for (const partner of partners) {
      const ownership = await prisma.vehicleOwnership.create({
        data: {
          vehicle_id: vehicles[i].id,
          user_id: partner.id,
          ownership_percentage: 25.00,
        },
      })
      ownerships.push(ownership)
    }
  }

  // V3: 100% João
  ownerships.push(await prisma.vehicleOwnership.create({
    data: {
      vehicle_id: vehicles[2].id,
      user_id: partners[0].id, // João
      ownership_percentage: 100.00,
    },
  }))

  // V4: 50% João + 50% Maria
  ownerships.push(await prisma.vehicleOwnership.create({
    data: {
      vehicle_id: vehicles[3].id,
      user_id: partners[0].id, // João
      ownership_percentage: 50.00,
    },
  }))
  ownerships.push(await prisma.vehicleOwnership.create({
    data: {
      vehicle_id: vehicles[3].id,
      user_id: partners[1].id, // Maria
      ownership_percentage: 50.00,
    },
  }))

  // V5: 33.33% João + 33.33% Maria + 33.34% Carlos
  ownerships.push(await prisma.vehicleOwnership.create({
    data: {
      vehicle_id: vehicles[4].id,
      user_id: partners[0].id, // João
      ownership_percentage: 33.33,
    },
  }))
  ownerships.push(await prisma.vehicleOwnership.create({
    data: {
      vehicle_id: vehicles[4].id,
      user_id: partners[1].id, // Maria
      ownership_percentage: 33.33,
    },
  }))
  ownerships.push(await prisma.vehicleOwnership.create({
    data: {
      vehicle_id: vehicles[4].id,
      user_id: partners[2].id, // Carlos
      ownership_percentage: 33.34,
    },
  }))

  // V6 e V7: 100% Roberto (investidor)
  ownerships.push(await prisma.vehicleOwnership.create({
    data: {
      vehicle_id: vehicles[5].id,
      user_id: investors[0].id, // Roberto
      ownership_percentage: 100.00,
    },
  }))
  ownerships.push(await prisma.vehicleOwnership.create({
    data: {
      vehicle_id: vehicles[6].id,
      user_id: investors[0].id, // Roberto
      ownership_percentage: 100.00,
    },
  }))

  // V8: 100% Patricia (investidora)
  ownerships.push(await prisma.vehicleOwnership.create({
    data: {
      vehicle_id: vehicles[7].id,
      user_id: investors[1].id, // Patricia
      ownership_percentage: 100.00,
    },
  }))

  console.log(`✅ ${ownerships.length} participações criadas`)

  // Resumo final
  console.log('\n🎉 Seed executado com sucesso!')
  console.log('\n📊 Resumo dos dados criados:')
  console.log(
    `👤 Usuários: ${1 + partners.length + investors.length} (1 admin + ` +
    `${partners.length} sócios + ${investors.length} investidores)`,
  )
  console.log(`🚗 Veículos: ${vehicles.length} (formato FIPE compatível)`)
  console.log(`📋 Participações: ${ownerships.length}`)

  console.log('\n🔑 Credenciais de acesso:')
  console.log('🔹 Admin: admin@bmccar.com (senha: admin123)')
  console.log(
    '🔹 Sócios: *.silva@bmccar.com, *.santos@bmccar.com, etc. (senha: ' +
    'partner123)',
  )
  console.log(
    '🔹 Investidores: *.investor@example.com, *.capital@example.com (senha: ' +
    'investor123)',
  )

  console.log('\n📋 Exemplos de veículos FIPE:')
  console.log('• Fiat Uno 2020 (year_id: "2020-1", fuel_acronym: "G")')
  console.log('• VW Amarok 2023 (year_id: "2023-1", fuel_acronym: "D")')
  console.log('• BMW X5 2023 (year_id: "2023-1", fuel_acronym: "G")')

  console.log('\n✅ Compatível com API FIPE v2!')
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
