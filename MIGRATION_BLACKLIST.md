# 🚫 Migração: Sistema de Blacklist JWT

## 📋 Sobre a Migração

Esta migração implementa um sistema de **blacklist de tokens JWT** para garantir que o logout seja **efetivo imediatamente**, resolvendo o problema onde tokens permaneciam válidos após o logout.

## 🔧 Como Executar a Migração

### Opção 1: Migração Manual (Recomendada)

Execute o script SQL diretamente no PostgreSQL:

```bash
# Conectar ao banco
psql -h postgres -U fipe -d fipe_db

# Ou via Docker Compose
docker-compose exec postgres psql -U fipe -d fipe_db

# Executar o script
\i manual_migration_token_blacklist.sql
```

### Opção 2: Via Prisma (se banco estiver rodando)

```bash
# Aplicar migração
npx prisma db push

# Ou gerar migração formal
npx prisma migrate dev --name add_token_blacklist
```

## 🛡️ O que esta Migração Resolve

### **Problema Anterior:**
- Usuário fazia logout via `POST /auth/logout`
- Refresh token era removido do banco
- **Mas o access token continuava válido até expirar naturalmente**
- Usuário ainda conseguia fazer requisições por até 24h após logout

### **Solução Implementada:**
- Logout agora adiciona o access token à blacklist **imediatamente**
- Middleware verifica blacklist antes de validar token
- **Logout é efetivo instantaneamente**
- Tokens expirados são limpos automaticamente

## 📊 Estrutura da Tabela

```sql
CREATE TABLE "token_blacklist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("id")
);

-- Índices para performance
CREATE UNIQUE INDEX "token_blacklist_token_key" ON "token_blacklist"("token");
CREATE INDEX "token_blacklist_expires_at_idx" ON "token_blacklist"("expires_at");
```

## 🚀 Novas Funcionalidades

### **Rotas Administrativas:**

1. **GET /auth/blacklist/stats** (Admin)
   - Visualizar estatísticas da blacklist
   - Total de tokens, expirados, ativos

2. **POST /auth/blacklist/cleanup** (Admin)
   - Limpeza manual de tokens expirados
   - Manutenção da performance

### **Comportamento do Logout:**

```bash
# Antes (problema)
curl -X POST /auth/logout \
  -H "Authorization: Bearer TOKEN" \
  -d '{"refreshToken": "REFRESH"}'
# ❌ Token ainda funcionava por horas

# Agora (corrigido)
curl -X POST /auth/logout \
  -H "Authorization: Bearer TOKEN" \
  -d '{"refreshToken": "REFRESH"}'
# ✅ Token é IMEDIATAMENTE inválido
```

## ⚡ Performance

- **Índice único** no token para busca O(1)
- **Limpeza automática** de tokens expirados
- **Tolerante a falhas** - funciona mesmo se tabela não existir
- **Cache-friendly** - verificação rápida

## 🧪 Como Testar

1. **Fazer login:**
   ```bash
   curl -X POST /auth/login -d '{"email":"admin@test.com","password":"123456"}'
   # Guarde o access_token
   ```

2. **Fazer logout:**
   ```bash
   curl -X POST /auth/logout \
     -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
     -d '{"refreshToken": "SEU_REFRESH_TOKEN"}'
   ```

3. **Tentar usar token (deve falhar):**
   ```bash
   curl -X GET /auth/me \
     -H "Authorization: Bearer SEU_ACCESS_TOKEN"
   # ✅ Deve retornar "Token de acesso revogado"
   ```

4. **Verificar blacklist (Admin):**
   ```bash
   curl -X GET /auth/blacklist/stats \
     -H "Authorization: Bearer ADMIN_TOKEN"
   ```

## ✅ Verificação da Instalação

Após executar a migração, verifique:

1. **Tabela criada:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name = 'token_blacklist';
   ```

2. **Índices criados:**
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename = 'token_blacklist';
   ```

3. **Teste de logout imediato:**
   - Faça login
   - Faça logout 
   - Tente usar o mesmo token (deve falhar)

## 🔄 Rollback (se necessário)

Para reverter a migração:

```sql
DROP TABLE IF EXISTS "token_blacklist";
```

**Nota:** Remova também as importações do `TokenBlacklistService` nos arquivos de código se fizer rollback completo.

---

**🎉 Com esta migração, o sistema agora garante logout imediato e seguro!**