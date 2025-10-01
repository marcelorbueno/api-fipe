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
    '^.+\\.ts$': ['ts-jest', {
      useESM: false,
    }],
  },

  // Setup global
  setupFiles: ['tsconfig-paths/register'],
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setup/test-database.ts',
    '<rootDir>/src/tests/setup/jest.setup.ts', // Adiciona setup p/ memory leaks
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

  // Timeouts - Aumentado para resolver problemas de API externa
  testTimeout: 60000, // 60 segundos (antes era 30s)

  // Configurações para evitar memory leaks e melhorar estabilidade
  maxWorkers: 1, // Execução sequencial para evitar conflitos
  forceExit: true, // Força saída após testes
  detectOpenHandles: true, // Detecta handles não fechados
  detectLeaks: false, // Desabilita detecção de memory leaks (pode ser instável)

  // Configurações de limpeza
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false, // Evita resetar mocks entre testes

  // Verbose para debug
  verbose: true,

  // Configurações de execução
  bail: false, // Continue mesmo com falhas (não pare no primeiro erro)
  slowTestThreshold: 30, // Marcar testes > 30s como lentos

  // Ignorar transformações desnecessárias
  transformIgnorePatterns: [
    'node_modules/(?!(module-that-needs-transformation)/)',
  ],


  // Reporters - Manter seus reporters personalizados
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

  // Configurações adicionais para estabilidade
  workerIdleMemoryLimit: '512MB', // Limite de memória por worker
  logHeapUsage: false, // Desabilitar logs de heap para reduzir noise
}

export default config
