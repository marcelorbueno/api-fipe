import { defineConfig } from 'prisma/config'

export default defineConfig({
  migrations: {
    seed: 'ts-node -r tsconfig-paths/register src/scripts/seed.ts',
  },
})
