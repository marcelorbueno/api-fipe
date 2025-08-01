import { PrismaClient, UserProfile } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Criando dados iniciais da BMC Car...')

  // Criar usuário administrador
  const adminPassword = await bcrypt.hash('admin123', 10)
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin BMC Car',
      num_cpf: '11111111111',
      email: 'admin@bmccar.com',
      password: adminPassword, // ✅ Campo obrigatório adicionado
      birthday: new Date('1980-01-01'),
      phone_number: '11999999999',
      avatar: null,
      profile: UserProfile.ADMINISTRATOR, // ✅ Perfil de administrador
      is_active: true,
    },
  })

  console.log(`✅ Usuário admin criado: ${adminUser.name} (${adminUser.email})`)

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
    console.log(`${index + 1}. ${partner.name} (${partner.email})`)
  })

  // Criar usuários do sistema para cada perfil (exemplo)
  const partnerPassword = await bcrypt.hash('partner123', 10)
  const investorPassword = await bcrypt.hash('investor123', 10)

  const partnerUser = await prisma.user.create({
    data: {
      name: 'João Silva User',
      num_cpf: '22222222222',
      email: 'joao.user@bmccar.com',
      password: partnerPassword,
      birthday: new Date('1985-03-15'),
      phone_number: '11987654322',
      avatar: null,
      profile: UserProfile.PARTNER,
      is_active: true,
    },
  })

  const investorUser = await prisma.user.create({
    data: {
      name: 'Maria Investidora',
      num_cpf: '33333333333',
      email: 'maria.investor@bmccar.com',
      password: investorPassword,
      birthday: new Date('1990-05-10'),
      phone_number: '11876543211',
      avatar: null,
      profile: UserProfile.INVESTOR,
      is_active: true,
    },
  })

  console.log('✅ Usuários de sistema criados:')
  console.log(`- Admin: ${adminUser.email} (senha: admin123)`)
  console.log(`- Sócio: ${partnerUser.email} (senha: partner123)`)
  console.log(`- Investidor: ${investorUser.email} (senha: investor123)`)

  console.log('\n🎉 Seed executado com sucesso!')
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
