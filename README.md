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

## 🛠️ Stack Tecnológico

### Backend
- **Node.js** - Runtime JavaScript
- **TypeScript** - Tipagem estática
- **Fastify** - Framework web de alta performance
- **Prisma** - ORM moderno para TypeScript

### Banco de Dados
- **PostgreSQL** - Banco de dados relacional
- **Docker** - Containerização para desenvolvimento

### Integrações
- **API FIPE** - Preços atualizados de veículos
- **JWT** - Autenticação e autorização
- **Zod** - Validação de schemas

### Testes e Qualidade
- **Jest** - Framework de testes
- **Supertest** - Testes de API
- **ESLint** - Linting de código

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

## 📡 Documentação das Rotas

### 🔐 Autenticação (`/auth`)

| Método | Rota | Descrição | Body |
|--------|------|-----------|------|
| `POST` | `/auth/register` | Cadastro de usuário | `{ name, email, password, num_cpf, birthday, phone_number, profile }` |
| `POST` | `/auth/login` | Login do usuário | `{ email, password }` |
| `POST` | `/auth/refresh` | Renovar token | `{ refreshToken }` |
| `POST` | `/auth/logout` | Logout do usuário | `{ refreshToken }` |
| `GET` | `/auth/me` | Dados do usuário logado | - |

### 👥 Usuários (`/users`)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/users` | Listar usuários | Admin |
| `GET` | `/users/:id` | Buscar usuário | Admin |
| `PUT` | `/users/:id` | Atualizar usuário | Admin |
| `DELETE` | `/users/:id` | Desativar usuário | Admin |

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
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
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

## 🤝 Contribuição

### Padrões de Código

- **TypeScript** obrigatório com tipagem rigorosa
- **ESLint** com configuração rigorosa
- **Prisma** para todas as operações de banco
- **Zod** para validação de schemas
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