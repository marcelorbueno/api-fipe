module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts',
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/tests/**/*',
    '!src/scripts/**/*',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setup/test-database.ts',
  ],
  testTimeout: 30000, // 30 segundos para testes que fazem chamadas externas
  verbose: true,

  // Configurações específicas para diferentes tipos de teste
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/tests/unit/**/*.test.ts'],
      testTimeout: 10000,
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/tests/integration/**/*.test.ts'],
      testTimeout: 30000,
      setupFilesAfterEnv: [
        '<rootDir>/src/tests/setup/test-database.ts',
      ],
    },
  ],

  // Variáveis de ambiente para testes
  setupFiles: ['<rootDir>/src/tests/setup/env.ts'],

  // Ignorar node_modules exceto alguns específicos se necessário
  transformIgnorePatterns: [
    'node_modules/(?!(module-that-needs-transformation)/)',
  ],

  // Limpar mocks automaticamente entre testes
  clearMocks: true,
  restoreMocks: true,

  // Cobertura mínima (opcional)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Reporters personalizados
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
