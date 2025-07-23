import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Criando sócios da BMC Car...')

  // Criar os 4 sócios da BMC Car
  const partners = await Promise.all([
    prisma.partner.create({
      data: {
        name: 'João Silva',
        num_cpf: '12345678901',
        email: 'joao.silva@bmccar.com',
        birthday: new Date('1985-03-15'),
        phone_number: '11987654321',
        avatar: null,
        is_active: true,
      },
    }),

    prisma.partner.create({
      data: {
        name: 'Maria Santos',
        num_cpf: '98765432109',
        email: 'maria.santos@bmccar.com',
        birthday: new Date('1990-07-22'),
        phone_number: '11876543210',
        avatar: null,
        is_active: true,
      },
    }),

    prisma.partner.create({
      data: {
        name: 'Carlos Oliveira',
        num_cpf: '45678912345',
        email: 'carlos.oliveira@bmccar.com',
        birthday: new Date('1982-11-08'),
        phone_number: '11765432109',
        avatar: null,
        is_active: true,
      },
    }),

    prisma.partner.create({
      data: {
        name: 'Ana Costa',
        num_cpf: '78912345678',
        email: 'ana.costa@bmccar.com',
        birthday: new Date('1988-05-30'),
        phone_number: '11654321098',
        avatar: null,
        is_active: true,
      },
    }),
  ])

  console.log('✅ Sócios criados com sucesso!')

  partners.forEach((partner, index) => {
    console.log(`${index + 1}. ${partner.name} (ID: ${partner.id})`)
  })

  // Criar um usuário admin
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin BMC Car',
      num_cpf: '11111111111',
      email: 'admin@bmccar.com',
      birthday: new Date('1980-01-01'),
      phone_number: '11999999999',
      avatar: null,
      is_active: true,
    },
  })

  console.log(`✅ Usuário admin criado: ${adminUser.name} (ID: ${adminUser.id})`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Erro ao criar dados:', e)

    await prisma.$disconnect()
    process.exit(1)
  })
