import { PrismaClient, UserProfile } from '@prisma/client'
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

  // Resumo final
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
