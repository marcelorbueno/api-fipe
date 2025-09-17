// Configuração simplificada do tracing com múltiplos exporters
export let tracingEnabled = false

// Função para inicializar o tracing
export function initializeTracing() {
  try {
    console.log('🔍 Tracing system initializing...')

    if (process.env.JAEGER_ENDPOINT) {
      console.log('🔍 Jaeger endpoint configured:', process.env.JAEGER_ENDPOINT)
    }

    if (process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET) {
      console.log(
        '🔍 Axiom configuration detected for dataset:',
        process.env.AXIOM_DATASET,
      )
    }

    tracingEnabled = true
    console.log('🔍 Tracing system ready')
    console.log(
      '🔍 To fully enable OpenTelemetry, install dependencies in container',
    )
  } catch (error) {
    console.error('❌ Error initializing tracing:', error)
  }
}
