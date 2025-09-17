// IMPORTANTE: Este arquivo deve ser importado ANTES de qualquer outro módulo da
// aplicação
import { initializeTracing } from './tracer'

// Inicializar tracing apenas se não estiver em modo de teste
if (process.env.NODE_ENV !== 'test') {
  initializeTracing()
}

// Re-exportar utilitários
export * from './custom-spans'
