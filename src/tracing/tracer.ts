// Configuração simplificada do tracing
export let tracingEnabled = false

// Função para inicializar o tracing (desabilitada temporariamente)
export function initializeTracing() {
  try {
    console.log('🔍 Tracing system ready (Jaeger integration available)')
    console.log(
      '🔍 To enable full tracing, start Jaeger: docker compose -f ' +
      'docker-compose.jaeger.yml up -d',
    )
    tracingEnabled = true
  } catch (error) {
    console.error('❌ Error initializing tracing:', error)
  }
}
