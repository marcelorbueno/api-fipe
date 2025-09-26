// IMPORTANTE: Este arquivo deve ser importado ANTES de qualquer outro módulo da
// aplicação
import { initializeTracing } from './tracer'

// Inicializar tracing apenas se não estiver em modo de teste ou produção
if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'production') {
  initializeTracing()
} else {
  console.log('⏭️ Skipping tracing initialization in', process.env.NODE_ENV)
}

// Re-exportar utilitários
export * from './custom-spans'
