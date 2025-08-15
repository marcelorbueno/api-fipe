import { PrismaClient, UserProfile, VehicleType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Criando dados iniciais da BMC Car (Modelo Unificado)...')

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

  // Criar veículos de exemplo
  console.log('\n🚗 Criando veículos de exemplo...')

  const vehicles = await Promise.all([
    // V1 e V2: Veículos da empresa BMC Car
    prisma.vehicle.create({
      data: {
        license_plate: 'ABC1234',
        renavam: '12345678901',
        fipe_brand_code: 21, // Fiat
        fipe_model_code: 4828, // Uno
        year: '2020',
        fuel_type: 'Gasolina',
        vehicle_type: VehicleType.cars,
        color: 'Branco',
        is_company_vehicle: true, // Veículo da empresa
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
        year: '2021',
        fuel_type: 'Flex',
        vehicle_type: VehicleType.cars,
        color: 'Prata',
        is_company_vehicle: true, // Veículo da empresa
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
        year: '2022',
        fuel_type: 'Flex',
        vehicle_type: VehicleType.cars,
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
        year: '2021',
        fuel_type: 'Flex',
        vehicle_type: VehicleType.cars,
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
        fipe_brand_code: 1, // Acura
        fipe_model_code: 16, // MDX
        year: '2023',
        fuel_type: 'Gasolina',
        vehicle_type: VehicleType.cars,
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
        fipe_brand_code: 56, // BMW
        fipe_model_code: 102, // X5
        year: '2023',
        fuel_type: 'Gasolina',
        vehicle_type: VehicleType.cars,
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
        fipe_brand_code: 56, // BMW
        fipe_model_code: 78, // Serie 3
        year: '2022',
        fuel_type: 'Gasolina',
        vehicle_type: VehicleType.cars,
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
        fipe_brand_code: 11, // Audi
        fipe_model_code: 89, // A4
        year: '2023',
        fuel_type: 'Gasolina',
        vehicle_type: VehicleType.cars,
        color: 'Cinza',
        is_company_vehicle: false,
        observations: 'Veículo da investidora Patricia',
        purchase_date: new Date('2023-03-25'),
        purchase_value: 200000.00,
      },
    }),
  ])

  console.log(`✅ ${vehicles.length} veículos criados`)

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
  console.log(`🚗 Veículos: ${vehicles.length}`)
  console.log(`📋 Participações: ${ownerships.length}`)

  console.log('\n🔑 Credenciais de acesso:')
  console.log('🔹 Admin: admin@bmccar.com (senha: admin123)')
  console.log(
    '🔹 Sócios: *.silva@bmccar.com, *.santos@bmccar.com, etc. ' +
    '(senha: partner123)',
  )
  console.log(
    '🔹 Investidores: *.investor@example.com, *.capital@example.com ' +
    '(senha: investor123)',
  )

  console.log('\n📈 Distribuição de patrimônio exemplo:')
  console.log(
    '• João Silva (sócio): 25% V1 + 25% V2 + 100% V3 + 50% V4 + 33.33% V5')
  console.log('• Maria Santos (sócio): 25% V1 + 25% V2 + 50% V4 + 33.33% V5')
  console.log('• Carlos Oliveira (sócio): 25% V1 + 25% V2 + 33.34% V5')
  console.log('• Ana Costa (sócio): 25% V1 + 25% V2')
  console.log('• Roberto Investidor: 100% V6 + 100% V7')
  console.log('• Patricia Capital: 100% V8')
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
