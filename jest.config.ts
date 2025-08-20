import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],

  // Padrões de busca de arquivos de teste
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts',
  ],

  // Transformações
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  // Setup global
  setupFiles: ['tsconfig-paths/register'],
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setup/test-database.ts',
  ],

  // Mapeamento de módulos para alias @
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Cobertura
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/tests/**/*',
    '!src/scripts/**/*',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Timeouts
  testTimeout: 30000,

  // Configurações de limpeza
  clearMocks: true,
  restoreMocks: true,

  // Verbose para debug
  verbose: true,

  // Ignorar transformações desnecessárias
  transformIgnorePatterns: [
    'node_modules/(?!(module-that-needs-transformation)/)',
  ],

  // Reporters
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage',
        filename: 'test-report.html',
        expand: true,
      },
    ],
  ],
}

export default config
