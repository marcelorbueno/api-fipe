# 🚗 API FIPE - Sistema de Gestão de Patrimônio Veicular

Uma API REST robusta para gestão de patrimônio veicular empresarial, integrada com a API FIPE para avaliação automática de veículos no mercado brasileiro.

## 📋 Descrição do Projeto

O API FIPE é um sistema completo de gestão patrimonial focado em veículos, desenvolvido para empresas que precisam:

- **Controlar patrimônio veicular** de sócios e investidores
- **Calcular participações** em veículos da empresa
- **Obter avaliações atualizadas** via integração com a API FIPE
- **Gerenciar usuários** com diferentes perfis de acesso
- **Acompanhar a valorização/desvalorização** da frota

### Principais Funcionalidades

- 🔐 Autenticação JWT com refresh tokens
- 🚙 Cadastro de veículos com dados FIPE
- 👥 Gestão de usuários (Administradores, Sócios, Investidores)
- 💰 Cálculo automático de patrimônio baseado em valores FIPE
- 📊 Relatórios de patrimônio individual e empresarial
- 📄 Cache inteligente para reduzir chamadas à API FIPE
- 📈 Percentuais de propriedade personalizáveis por veículo
- 📚 Documentação interativa com Swagger UI e Scalar

## 🛠️ Stack Tecnológico

### Backend
- **Node.js** - Runtime JavaScript
- **TypeScript** - Tipagem estática
- **Fastify** - Framework web de alta performance
- **Prisma** - ORM moderno para TypeScript
- **Swagger/OpenAPI 3.0** - Documentação de API padronizada

### Banco de Dados
- **PostgreSQL** - Banco de dados relacional
- **Docker** - Containerização para desenvolvimento

### Integrações
- **API FIPE** - Preços atualizados de veículos
- **JWT** - Autenticação e autorização
- **Zod** - Validação de schemas

### Documentação
- **Swagger/OpenAPI 3.0** - Especificação padrão da API
- **Swagger UI** - Interface interativa de documentação
- **Scalar API Reference** - Documentação moderna e elegante

### Testes e Qualidade
- **Jest** - Framework de testes
- **Supertest** - Testes de API
- **ESLint** - Linting de código

### Observabilidade e Monitoramento
- **Tratamento robusto de erros** - Sistema centralizado com classes personalizadas
- **Logs estruturados** - JSON logs com contexto de requisições
- **Jaeger (Pronto)** - Rastreamento distribuído configurado
- **Health Check** - Endpoint de monitoramento de saúde

## 🚀 Instalação e Setup

### Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- NPM ou Yarn

### 1. Clone do Repositório

```bash
git clone <repository-url>
cd api-fipe
```

### 2. Instalação de Dependências

```bash
npm install
```

### 3. Configuração do Ambiente

Copie o arquivo de exemplo e configure as variáveis:

```bash
cp .env.example .env
```

### 4. Configuração do Banco de Dados

Inicie o PostgreSQL com Docker:

```bash
docker-compose up postgres -d
```

Execute as migrações:

```bash
npx prisma migrate deploy
```

### 5. Seed do Banco (Opcional)

Popule o banco com dados iniciais:

```bash
npm run seed
```

### 6. Iniciar a Aplicação

**Desenvolvimento:**
```bash
npm run dev
```

**Produção:**
```bash
npm run build
npm start
```

A API estará disponível em: `http://localhost:3001`

### 7. Jaeger (Observabilidade) - Opcional

Para ativar o rastreamento distribuído:

```bash
# Iniciar Jaeger
docker-compose -f docker-compose.jaeger.yml up -d

# Acessar interface do Jaeger
open http://localhost:16686
```

## ⚙️ Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NODE_ENV` | Ambiente de execução | `development` |
| `PORT` | Porta do servidor | `3001` |
| `DATABASE_URL` | URL do PostgreSQL | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Chave secreta JWT | `sua_chave_secreta_super_segura` |
| `API_FIPE_PATH` | URL da API FIPE | `https://fipe.parallelum.com.br/api/v2` |
| `FIPE_REFERENCE` | Referência FIPE atual | `324` |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | Expiração do token | `24h` |
| `JWT_REFRESH_TOKEN_EXPIRES_DAYS` | Expiração refresh token | `7` |

### Variáveis de Proxy (Para Ambientes Corporativos)

```bash
HTTP_PROXY=http://proxy.empresa.com:3128/
HTTPS_PROXY=http://proxy.empresa.com:3128/
no_proxy=localhost,127.0.0.1
```

### Configuração de Proxy no Axios

Se necessário, configure proxy no arquivo `src/config/axios.ts`:

```typescript
const axiosConfig = {
  timeout: 10000,
  proxy: process.env.HTTP_PROXY ? {
    protocol: 'http',
    host: 'proxy.empresa.com',
    port: 3128
  } : undefined
}
```

## 📚 Documentação da API

### 🌟 Documentação Interativa

A API oferece documentação profissional e moderna através de duas interfaces:

#### 📖 **Swagger UI** - Interface Clássica
- **URL**: `http://localhost:3001/docs/`
- Interface tradicional e amplamente conhecida
- Permite testar endpoints diretamente
- Exportação da especificação OpenAPI

#### ✨ **Scalar API Reference** - Interface Moderna
- **URL**: `http://localhost:3001/reference/`
- Design moderno e elegante
- Navegação intuitiva por categorias
- Tema purple com layout responsivo

#### 🔧 **OpenAPI JSON**
- **URL**: `http://localhost:3001/docs/json`
- Especificação completa em formato JSON
- Compatível com ferramentas de geração de código
- Padrão OpenAPI 3.0

### 🚀 Como Acessar

**Desenvolvimento Local:**
```bash
npm run dev
# Acesse: http://localhost:3002/docs/ ou http://localhost:3002/reference/
```

**Via Docker:**
```bash
docker-compose up -d
# Acesse: http://localhost:3001/docs/ ou http://localhost:3001/reference/
```

### 📋 Recursos da Documentação

- ✅ **Autenticação JWT integrada** - Teste com seus tokens
- ✅ **Exemplos de requisições** - Payloads prontos para usar
- ✅ **Códigos de resposta** - Todos os cenários documentados
- ✅ **Schemas validados** - Estruturas de dados detalhadas
- ✅ **Categorização por módulos** - Organização intuitiva
- ✅ **Suporte a try-it-out** - Teste direto na interface

## 📡 Documentação das Rotas

### 🔐 Autenticação (`/auth`)

| Método | Rota | Descrição | Body/Auth |
|--------|------|-----------|-----------|
| `POST` | `/auth/login` | Login do usuário | `{ email, password }` |
| `POST` | `/auth/refresh` | Renovar token | `{ refreshToken }` |
| `POST` | `/auth/logout` | **Logout imediato** com blacklist | `{ refreshToken }` + Bearer Token |
| `GET` | `/auth/me` | Dados do usuário logado | ✅ |
| `GET` | `/auth/blacklist/stats` | Estatísticas da blacklist | 👨‍💼 Admin |
| `POST` | `/auth/blacklist/cleanup` | Limpeza de tokens expirados | 👨‍💼 Admin |

### 👥 Usuários (`/users`)

| Método | Rota | Descrição | Body/Auth |
|--------|------|-----------|-----------|
| `POST` | `/users` | Cadastrar usuário | `{ name, email, password, num_cpf, birthday, phone_number, profile }` / ✅ |
| `GET` | `/users` | Listar usuários | 👨‍💼 Admin |
| `GET` | `/users/:id` | Buscar usuário | 👨‍💼 Admin |
| `PUT` | `/users/:id` | Atualizar usuário | 👨‍💼 Admin |
| `DELETE` | `/users/:id` | Desativar usuário | 👨‍💼 Admin |

### 🚗 Veículos (`/vehicles`)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/vehicles` | Cadastrar veículo | ✅ |
| `GET` | `/vehicles` | Listar veículos | ✅ |
| `GET` | `/vehicles/:id` | Buscar veículo | ✅ |
| `PUT` | `/vehicles/:id` | Atualizar veículo | ✅ |
| `DELETE` | `/vehicles/:id` | Excluir veículo | ✅ |
| `POST` | `/vehicles/:id/ownership` | Adicionar proprietário | ✅ |
| `PUT` | `/vehicles/:id/ownership/:userId` | Alterar participação | ✅ |
| `DELETE` | `/vehicles/:id/ownership/:userId` | Remover proprietário | ✅ |

### 💰 Patrimônio (`/patrimony`)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/patrimony/user/:userId` | Patrimônio de usuário específico | ✅ |
| `GET` | `/patrimony/partners` | Patrimônio dos sócios | ✅ |
| `GET` | `/patrimony/investors` | Patrimônio dos investidores | ✅ |
| `GET` | `/patrimony/company` | Patrimônio da empresa | 🤝 Sócio |
| `GET` | `/patrimony/report` | Relatório completo | 👨‍💼 Admin |
| `POST` | `/patrimony/refresh-cache` | Atualizar cache FIPE | 👨‍💼 Admin |

### 🏷️ FIPE (`/fipe`)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/fipe/vehicle-types` | Tipos de veículos | ✅ |
| `GET` | `/fipe/:vehicleType/brands` | Listar marcas | ✅ |
| `GET` | `/fipe/:vehicleType/brands/:brandId/models` | Listar modelos | ✅ |
| `GET` | `/fipe/:vehicleType/brands/:brandId/models/:modelId/years` | Listar anos | ✅ |
| `GET` | `/fipe/:vehicleType/brands/:brandId/models/:modelId/years/:yearId` | Obter valor FIPE | ✅ |

### ❤️ Health Check (`/health`)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/health` | Status da API | ❌ |

## 📋 Regras de Negócio

### Perfis de Usuário

#### 👨‍💼 Administrador (`ADMINISTRATOR`)
- Acesso completo ao sistema
- Pode gerenciar usuários, veículos e relatórios
- Controle total sobre patrimônio

#### 🤝 Sócio (`PARTNER`)
- Possui veículos pessoais
- **Participa igualmente** dos veículos da empresa
- Acesso ao patrimônio da empresa
- Participação calculada automaticamente: `100% / número_de_sócios_ativos`

#### 💼 Investidor (`INVESTOR`)
- Possui apenas veículos pessoais
- **Não participa** dos veículos da empresa
- Acesso limitado ao próprio patrimônio

### Cálculo de Patrimônio

#### Veículos Pessoais
- Baseado na tabela `VehicleOwnership`
- Permite **percentuais de propriedade** personalizados
- Valor = `valor_fipe × percentual_propriedade`

#### Veículos da Empresa
- Apenas para usuários **PARTNER**
- Distribuição igualitária entre sócios ativos
- Valor individual = `valor_total_empresa / número_sócios_ativos`
- **Recálculo automático** quando novos sócios são adicionados

### 🚫 Sistema de Blacklist JWT

#### Logout Imediato e Seguro
- **Blacklist de tokens** para logout efetivo imediato
- Tokens são **revogados instantaneamente** no logout
- **Limpeza automática** de tokens expirados
- Proteção contra uso de tokens após logout

#### 🛡️ Segurança Aprimorada
- **Verificação dupla**: expiração natural + blacklist
- **Monitoramento** de tokens revogados via admin
- **Performance otimizada** com índices no PostgreSQL
- **Tolerante a falhas** - funciona mesmo se blacklist não existir

### 💾 Sistema de Cache FIPE

#### Serviços de Cache Inteligente
- **FipeCacheService** - Gerenciamento centralizado do cache FIPE
- **Cache automático** criado durante criação/atualização de veículos
- **Fallback inteligente** para últimos valores conhecidos quando API falha
- **Rate limiting** com delay de 1,5s entre requisições
- **Atualização manual** disponível para administradores

#### 🌐 Tratamento de Conectividade
- Em ambientes corporativos com proxy, pode haver instabilidade da API FIPE
- Sistema mantém último valor conhecido automaticamente
- **Normalização automática** do fuel_acronym (padrão: "G" para Gasolina)
- Logs detalhados para debugging de problemas de conectividade
- Valores FIPE são cacheados por combinação: `brand_code + model_code + year_id + fuel_acronym + vehicle_type`

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

```sql
-- Usuários do sistema
users (
  id: UUID PRIMARY KEY,
  name: VARCHAR NOT NULL,
  num_cpf: VARCHAR(11) UNIQUE,
  email: VARCHAR UNIQUE,
  password: VARCHAR,
  profile: ENUM(ADMINISTRATOR, PARTNER, INVESTOR),
  is_active: BOOLEAN DEFAULT true
)

-- Veículos cadastrados
vehicles (
  id: UUID PRIMARY KEY,
  license_plate: VARCHAR(8) UNIQUE,
  renavam: VARCHAR(11) UNIQUE,
  fipe_brand_code: INTEGER,
  fipe_model_code: INTEGER,
  year_id: VARCHAR, -- Formato FIPE: "2017-5"
  fuel_acronym: VARCHAR(3), -- "G", "D", "E", "F"
  vehicle_type: ENUM(cars, motorcycles),
  brand_name: VARCHAR,
  model_name: VARCHAR,
  display_year: INTEGER,
  display_fuel: VARCHAR,
  is_company_vehicle: BOOLEAN DEFAULT false
)

-- Relacionamento usuário-veículo com percentual
vehicle_ownerships (
  id: UUID PRIMARY KEY,
  vehicle_id: UUID REFERENCES vehicles(id),
  user_id: UUID REFERENCES users(id),
  ownership_percentage: DECIMAL(5,2),
  UNIQUE(vehicle_id, user_id)
)

-- Cache das consultas FIPE
fipe_cache (
  id: UUID PRIMARY KEY,
  brand_code: INTEGER,
  model_code: INTEGER,
  year_id: VARCHAR,
  fuel_acronym: VARCHAR(3),
  vehicle_type: ENUM(cars, motorcycles),
  fipe_value: DECIMAL(12,2),
  brand_name: VARCHAR,
  model_name: VARCHAR,
  model_year: INTEGER,
  fuel_name: VARCHAR,
  code_fipe: VARCHAR,
  reference_month: VARCHAR,
  UNIQUE(brand_code, model_code, year_id, fuel_acronym, vehicle_type)
)

-- Tokens de refresh JWT
refresh_tokens (
  id: UUID PRIMARY KEY,
  token: VARCHAR UNIQUE,
  user_id: UUID REFERENCES users(id),
  expires_at: TIMESTAMP
)

-- Blacklist de tokens de acesso (logout imediato)
token_blacklist (
  id: UUID PRIMARY KEY,
  token: TEXT UNIQUE,
  expires_at: TIMESTAMP,
  created_at: TIMESTAMP DEFAULT now()
)
```

### Relacionamentos

```mermaid
erDiagram
    users ||--o{ vehicle_ownerships : "possui"
    vehicles ||--o{ vehicle_ownerships : "pertence"
    users ||--o{ refresh_tokens : "gera"
    vehicles ||--o{ fipe_cache : "referencia"
    
    users {
        UUID id PK
        string name
        string num_cpf UK
        string email UK
        enum profile
        boolean is_active
    }
    
    vehicles {
        UUID id PK
        string license_plate UK
        string renavam UK
        integer fipe_brand_code
        integer fipe_model_code
        string year_id
        string fuel_acronym
        boolean is_company_vehicle
    }
    
    vehicle_ownerships {
        UUID id PK
        UUID vehicle_id FK
        UUID user_id FK
        decimal ownership_percentage
    }
    
    fipe_cache {
        UUID id PK
        integer brand_code
        integer model_code
        string year_id
        string fuel_acronym
        enum vehicle_type
        decimal fipe_value
    }
```

## 🔍 Tratamento de Erros e Observabilidade

### 🚨 Sistema de Tratamento de Erros

A API implementa um sistema robusto de tratamento de erros com:

#### Classes de Erro Personalizadas
```typescript
// Erros disponíveis
AppError           // Erro base da aplicação
ValidationError    // Erro de validação (400)
NotFoundError      // Recurso não encontrado (404)
ConflictError      // Conflito de dados (409)
UnauthorizedError  // Não autorizado (401)
ForbiddenError     // Acesso negado (403)
InternalServerError // Erro interno (500)
ExternalServiceError // Falha em serviços externos (503)
```

#### Middleware Global de Erros
- **Intercepta todos os erros** da aplicação automaticamente
- **Logs estruturados** com contexto da requisição
- **Respostas padronizadas** em formato JSON
- **Validação automática** com Zod schemas

#### Exemplo de Resposta de Erro
```json
{
  "error": "Veículo não encontrado",
  "code": "NOT_FOUND",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/vehicles/123"
}
```

### 📊 Sistema de Logs Estruturados

#### Funcionalidades do Logger
- **Logs JSON estruturados** para fácil parsing
- **Contexto de requisições** (método, URL, IP, usuário)
- **Múltiplos níveis**: ERROR, WARN, INFO, DEBUG
- **Logs de performance** para operações lentas
- **Logs de requisições** com headers e body

#### Exemplo de Log
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "ERROR",
  "message": "Application error occurred",
  "request": {
    "method": "POST",
    "url": "/vehicles",
    "userAgent": "Mozilla/5.0...",
    "ip": "192.168.1.100",
    "userId": "uuid-123"
  },
  "error": {
    "name": "ValidationError",
    "message": "Placa inválida",
    "stack": "..."
  }
}
```

### 📈 Observabilidade com Jaeger

#### Configuração do Jaeger
O sistema está preparado para rastreamento distribuído:

```bash
# Iniciar Jaeger
docker-compose -f docker-compose.jaeger.yml up -d

# Interface Web
http://localhost:16686
```

#### Spans Customizados Disponíveis
- **database-operation** - Operações no banco de dados
- **external-api-call** - Chamadas para APIs externas (FIPE)
- **cache-operation** - Operações de cache
- **user-authentication** - Processos de autenticação

#### Configuração de Tracing
```typescript
// Exemplo de span customizado
await withCustomSpan('database-operation',
  { operation: 'create-vehicle', table: 'vehicles' },
  async () => {
    return await prisma.vehicle.create(data)
  }
)
```

### 🔧 Configuração de Observabilidade

#### Variáveis de Ambiente para Tracing
```bash
# Ativar tracing (opcional)
JAEGER_ENDPOINT=http://localhost:14268/api/traces
SERVICE_NAME=api-fipe
SERVICE_VERSION=1.0.0
```

#### Health Check Avançado
```bash
# Verificar saúde da API
curl http://localhost:3001/health

# Resposta
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": "2h 30m 45s",
  "database": "connected",
  "external_apis": {
    "fipe": "available"
  }
}
```

## 🧪 Executando Testes

### Configuração dos Testes

```bash
# Configurar banco de testes
cp .env.test.example .env.test
```

### Executar Testes

```bash
# Todos os testes
npm test

# Testes com watch
npm run test:watch

# Testes com cobertura
npm run test:coverage

# Testes por módulo
npm run test:auth
npm run test:vehicles
npm run test:patrimony
npm run test:users

# Testes integração vs unitários
npm run test:integration
npm run test:unit

# Limpeza após testes
npm run test:cleanup
```

### Estrutura de Testes

```
src/tests/
├── helpers/
│   └── auth-helper.ts          # Utilitários de autenticação
├── integration/                # Testes de API
│   ├── auth.test.ts
│   ├── vehicles.test.ts
│   ├── patrimony.test.ts
│   └── users.test.ts
└── setup/                      # Configuração dos testes
    ├── jest.setup.ts
    ├── test-database.ts
    └── test-server.ts
```

## 📝 Exemplos de Uso

### 1. Registrar Usuário

```bash
curl -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "name": "João Silva",
    "email": "joao@empresa.com",
    "password": "senha123",
    "num_cpf": "12345678901",
    "birthday": "1990-01-01",
    "phone_number": "11999999999",
    "profile": "PARTNER"
  }'
```

### 2. Fazer Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@empresa.com",
    "password": "senha123"
  }'
```

### 3. Cadastrar Veículo da Empresa

```bash
curl -X POST http://localhost:3001/vehicles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "license_plate": "ABC1234",
    "renavam": "12345678901",
    "fipe_brand_code": 21,
    "fipe_model_code": 7541,
    "year_id": "2017-5",
    "vehicle_type": "cars",
    "is_company_vehicle": true
  }'
```

### 4. Consultar Patrimônio da Empresa

```bash
curl -X GET http://localhost:3001/patrimony/company \
  -H "Authorization: Bearer SEU_TOKEN"
```

## 🐳 Docker

### Desenvolvimento

```bash
# Apenas PostgreSQL
docker-compose up postgres -d

# Aplicação completa
docker-compose up -d
```

### Produção

```bash
# Build da imagem
docker build -t api-fipe .

# Executar container
docker run -p 3001:3001 --env-file .env api-fipe
```

## ⚠️ Solução de Problemas Comuns

### 🌐 API FIPE não responde

**Sintomas:**
- Patrimônio zerado após criar veículos
- Erros de timeout nos logs
- Valores FIPE não carregam

**Soluções:**
1. Verifique configurações de proxy no ambiente corporativo
2. Execute `POST /patrimony/refresh-cache` para forçar atualização
3. Verifique conectividade: teste URL da FIPE diretamente
4. Cache mantém últimos valores conhecidos automaticamente

### 💰 Patrimônio calculado incorretamente

**Diagnóstico:**
```bash
# Verificar se veículo tem fuel_acronym
SELECT license_plate, fuel_acronym, is_company_vehicle FROM vehicles;

# Verificar cache FIPE
SELECT brand_code, model_code, fipe_value FROM fipe_cache;

# Verificar participações
SELECT v.license_plate, vo.ownership_percentage, u.name 
FROM vehicle_ownerships vo 
JOIN vehicles v ON vo.vehicle_id = v.id 
JOIN users u ON vo.user_id = u.id;
```

**Soluções:**
1. Confirme que `fuel_acronym` está preenchido ("G", "D", "E", "F")
2. Execute consulta manual FIPE para verificar conectividade
3. Verifique se cache FIPE foi criado na tabela `fipe_cache`
4. Para veículos da empresa, participações são criadas automaticamente

### ⚡ Problemas de Performance

**Otimizações:**
```sql
-- Índices recomendados
CREATE INDEX idx_vehicles_fipe ON vehicles(fipe_brand_code, fipe_model_code, year_id);
CREATE INDEX idx_fipe_cache_lookup ON fipe_cache(brand_code, model_code, year_id, fuel_acronym, vehicle_type);
CREATE INDEX idx_vehicle_ownerships_user ON vehicle_ownerships(user_id);
```

### 📋 Logs Úteis para Debug

```bash
# Acompanhar logs em tempo real
docker-compose logs -f api

# Buscar erros específicos
docker-compose logs api | grep -i "fipe\|error\|patrimônio"

# Verificar cache hits/misses
docker-compose logs api | grep -i "cache"
```

## 🚢 Deploy

### Variáveis de Produção

```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=sua_chave_secreta_muito_segura_produção
API_FIPE_PATH=https://fipe.parallelum.com.br/api/v2
FIPE_REFERENCE=324
```

### Processo de Deploy

1. **Build da aplicação:**
   ```bash
   npm run build
   ```

2. **Executar migrações:**
   ```bash
   npx prisma migrate deploy
   ```

3. **Iniciar aplicação:**
   ```bash
   npm start
   ```

### Monitoramento

- **Health Check**: `GET /health`
- **Logs estruturados** com informações de patrimônio
- **Cache status** visível nos logs de operação
- **Métricas de API FIPE** nos logs
- **Jaeger Tracing**: Interface em `http://localhost:16686`
- **Sistema de alertas** via logs estruturados

## 🤝 Contribuição

### Padrões de Código

- **TypeScript** obrigatório com tipagem rigorosa
- **ESLint** com configuração rigorosa
- **Prisma** para todas as operações de banco
- **Zod** para validação de schemas
- **Swagger/OpenAPI** para documentação de todas as rotas
- **Tratamento centralizado de erros** com classes personalizadas
- **Separação clara** entre rotas, serviços e utilitários
- **Cache inteligente** com fallbacks para robustez
- **Constantes centralizadas** para regras de negócio

### Fluxo de Contribuição

1. Fork do repositório
2. Criar branch feature: `git checkout -b feature/nova-funcionalidade`
3. Commit das mudanças: `git commit -m 'feat: adiciona nova funcionalidade'`
4. Push para branch: `git push origin feature/nova-funcionalidade`
5. Abrir Pull Request

### Convenções de Commit

```
feat: nova funcionalidade
fix: correção de bug
docs: documentação
style: formatação
refactor: refatoração
test: testes
chore: tarefas de build/config
```

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Para dúvidas, problemas ou sugestões:

- Abra uma **Issue** no repositório
- Consulte a documentação em `CLAUDE.md`
- Verifique os **logs da aplicação** para debugging
- Use a seção **Solução de Problemas Comuns** deste README

---

**✨ Desenvolvido para gestão patrimonial eficiente**