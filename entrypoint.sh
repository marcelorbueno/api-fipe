#!/bin/sh
set -e

echo "=== INICIANDO APLICAÇÃO FIPE ==="

# Aguardar PostgreSQL usando método compatível com sh
echo "Aguardando PostgreSQL..."
sleep 10

# Função para testar conexão sem usar <<<
test_connection() {
    npx prisma db execute --file /dev/stdin << 'EOF'
SELECT 1;
EOF
}

# Tentar conectar
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    echo "Tentativa $attempt/$max_attempts - Testando conexão..."
    
    if test_connection 2>/dev/null; then
        echo "PostgreSQL conectado!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        echo "ERRO: PostgreSQL não disponível após $max_attempts tentativas"
        exit 1
    fi
    
    sleep 2
    attempt=$((attempt + 1))
done

echo "Gerando cliente Prisma..."
npx prisma generate

echo "Executando migrações..."
npx prisma migrate deploy || npx prisma db push --accept-data-loss

echo "Compilando aplicação..."
npm run build

echo "Iniciando aplicação..."
exec npm run dev
