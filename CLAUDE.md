# CLAUDE.md

Este arquivo fornece orientações ao Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Comandos de Desenvolvimento

### Scripts Principais
- `npm run dev` - Iniciar servidor de desenvolvimento com hot reload usando ts-node-dev
- `npm run build` - Compilar TypeScript para JavaScript
- `npm start` - Executar servidor de produção a partir de dist/
- `npm run seed` - Popular banco de dados com dados iniciais

### Testes
- `npm test` - Executar todos os testes
- `npm run test:watch` - Executar testes em modo watch
- `npm run test:coverage` - Executar testes com relatório de cobertura
- `npm run test:integration` - Executar apenas testes de integração
- `npm run test:unit` - Executar apenas testes unitários
- `npm run test:[module]` - Executar testes de módulo específico (auth, fipe, health, patrimony, vehicles, users)
- `npm run test:verbose` - Executar testes com saída detalhada
- `npm run test:cleanup` - Limpar dados de teste do banco

### Banco de Dados
- `npm run prisma` - Comandos CLI do Prisma
- `npm run migrate:test` - Deploy de migrações para banco de teste

## Visão Geral da Arquitetura

### Stack Tecnológico Principal
- **Framework Backend**: Fastify com TypeScript
- **Banco de Dados**: PostgreSQL com Prisma ORM
- **Autenticação**: JWT tokens com suporte a refresh token
- **Testes**: Jest com Supertest para testes de API
- **API Externa**: Integração com API FIPE para precificação de veículos

### Componentes Principais

#### Schema do Banco (`prisma/schema.prisma`)
- **Users**: Gerenciamento de usuários com perfis (ADMINISTRATOR, PARTNER, INVESTOR)
- **Vehicles**: Registro de veículos com integração FIPE para precificação
- **VehicleOwnership**: Relacionamento many-to-many entre usuários e veículos com percentuais de propriedade
- **FipeCache**: Camada de cache para respostas da API FIPE para minimizar chamadas externas
- **RefreshToken**: Gerenciamento de refresh tokens JWT

#### Camada de Serviços
- **PatrimonyService** (`src/services/patrimony-service.ts`): Lógica de negócio principal para cálculo de patrimônio de usuários e empresa baseado em valores de veículos
- **VehicleEnrichmentService** (`src/services/vehicle-enrichment-service.ts`): Enriquece dados de veículos com informações FIPE
- **FipeAPI** (`src/lib/fipe-api.ts`): Integração com API brasileira de precificação de veículos

#### Estrutura das Rotas da API
- `/auth` - Autenticação e gerenciamento de tokens
- `/fipe` - Endpoints proxy da API FIPE (marcas, modelos, anos, valores)
- `/vehicles` - Operações CRUD de veículos
- `/users` - Gerenciamento de usuários
- `/patrimony` - Endpoints de cálculo de patrimônio
- `/health` - Endpoint de verificação de saúde

### Lógica de Negócio

#### Cálculo de Patrimônio
O sistema calcula patrimônio de forma diferente baseado nos perfis de usuário:
- **Veículos Pessoais**: Baseado na tabela VehicleOwnership com percentual de propriedade
- **Veículos da Empresa**: Apenas para usuários PARTNER, distribuição igual entre sócios ativos
- **Usuários INVESTOR**: Apenas propriedade de veículos pessoais, sem participação na empresa

#### Integração FIPE
- Veículos armazenam códigos FIPE (brand_code, model_code, year_id) para consulta de preços
- Sistema de cache previne chamadas excessivas à API
- Fallback para últimos valores conhecidos quando API não está disponível
- Suporte para carros e motocicletas
- **Cache Automático**: Criado automaticamente durante criação/atualização de veículos
- **Tratamento de Conectividade**: Sistema robusto contra falhas de proxy/rede

### Variáveis de Ambiente
Variáveis de ambiente principais (verificar arquivo `.env`):
- `DATABASE_URL` - String de conexão PostgreSQL
- `JWT_SECRET` - Chave secreta para assinatura JWT
- `API_FIPE_PATH` - URL base da API FIPE
- `FIPE_REFERENCE` - Referência do mês FIPE
- `PORT` - Porta do servidor

### Estratégia de Testes
- Testes de integração cobrem endpoints completos da API com banco real
- Isolamento de banco de teste usando instância PostgreSQL separada
- Helpers de autenticação para testar endpoints protegidos
- Relatórios de cobertura gerados no diretório `coverage/`

## Observações Importantes

### Considerações da API FIPE
- Rate limiting pode ser aplicado - serviço inclui delays entre requisições
- Respostas da API são cacheadas para melhorar performance e reduzir chamadas
- Formato do ano do veículo é específico: "YYYY-N" (ex: "2017-5")
- Tratamento do fuel_acronym: valores NULL defaultam para gasolina ("G")
- **Problema de Conectividade**: Em ambientes corporativos com proxy, pode haver instabilidade
- **Solução Implementada**: Cache automático durante criação de veículos para robustez

### Restrições do Banco de Dados
- Usuários identificados por CPF (documento brasileiro)
- Placas de veículos são únicas
- VehicleOwnership previne pares usuário-veículo duplicados
- Padrão de soft deletion usando flags `is_active`

### Segurança
- Autenticação JWT com refresh tokens
- CORS configurado para todas as origens (ajustar para produção)
- Hash de senhas com bcrypt
- Rotas protegidas usam middleware `authenticate`

### Regras de Negócio Específicas

#### Distribuição de Patrimônio da Empresa
- **Veículos da empresa** (`is_company_vehicle: true`) são automaticamente distribuídos entre todos os sócios ativos
- **Participação igual**: Cada sócio ativo recebe uma participação igual (100% ÷ número de sócios)
- **Recálculo automático**: Quando um novo sócio é adicionado, as participações são recalculadas automaticamente
- **Exemplo**: 1 veículo R$ 50.000 com 2 sócios = R$ 25.000 para cada sócio

#### Fluxo de Criação de Veículos
1. Validação de dados obrigatórios (placa, RENAVAM, códigos FIPE)
2. Busca automática de dados FIPE (marca, modelo, combustível)
3. Criação automática de cache FIPE se API responder
4. Se `is_company_vehicle: true`, criação automática de participações para todos os sócios
5. Preenchimento automático de campos derivados (display_year, display_fuel, etc.)

### Padrões de Desenvolvimento
- **Logs detalhados**: Uso extensivo de console.log para debugging
- **Tratamento de erros robusto**: Try/catch com fallbacks apropriados
- **Validação de entrada**: Schemas Zod para todas as rotas
- **Tipagem forte**: TypeScript em todo o projeto
- **Separação de responsabilidades**: Services para lógica de negócio, routes para HTTP