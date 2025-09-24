# Guia de Deploy na Vercel

## Pré-requisitos

1. **Conta na Vercel**: Crie uma conta em [vercel.com](https://vercel.com)
2. **Banco de dados PostgreSQL em produção**: Recomendamos:
   - [Neon](https://neon.tech) (gratuito para desenvolvimento)
   - [Supabase](https://supabase.com) (gratuito para desenvolvimento)
   - [Railway](https://railway.app) (gratuito para desenvolvimento)

## Passo 1: Configurar Banco de Dados

### Opção A: Neon (Recomendado)
1. Acesse [neon.tech](https://neon.tech)
2. Crie uma nova conta
3. Crie um novo projeto/banco
4. Copie a connection string fornecida

### Opção B: Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Vá em Settings > Database
4. Copie a connection string

## Passo 2: Deploy na Vercel

### Via Interface Web (Recomendado)
1. Acesse [vercel.com](https://vercel.com)
2. Clique em "New Project"
3. Importe seu repositório do GitHub
4. Configure as variáveis de ambiente (veja seção abaixo)
5. Clique em "Deploy"

### Via CLI
```bash
# Instalar Vercel CLI
npm i -g vercel

# Login na Vercel
vercel login

# Deploy do projeto
vercel

# Deploy em produção
vercel --prod
```

## Passo 3: Configurar Variáveis de Ambiente

Na dashboard da Vercel, vá em Settings > Environment Variables e configure:

### Variáveis Obrigatórias
```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=sua_chave_secreta_super_segura_aqui_123
```

### Variáveis Opcionais
```
API_FIPE_PATH=https://fipe.parallelum.com.br/api/v2
FIPE_REFERENCE=325
JWT_ACCESS_TOKEN_EXPIRES_IN=24h
JWT_REFRESH_TOKEN_EXPIRES_DAYS=7
```

### Variáveis de Observabilidade (Opcional)
```
AXIOM_TOKEN=xaat-your-axiom-token-here
AXIOM_DATASET=your-dataset-name
```

## Passo 4: Executar Migrações

Após o primeiro deploy, execute as migrações do Prisma:

```bash
# Via Vercel CLI
vercel env pull .env.local
npx prisma migrate deploy

# Ou via função serverless (criar script)
```

## Passo 5: Popular Banco (Seed)

Para popular o banco com dados iniciais:

```bash
# Baixar env da Vercel
vercel env pull .env.local

# Executar seed
npm run seed
```

## Estrutura de URLs em Produção

Após o deploy, sua API estará disponível em:
- **API Base**: `https://seu-projeto.vercel.app`
- **Documentação Swagger**: `https://seu-projeto.vercel.app/docs`
- **Documentação Scalar**: `https://seu-projeto.vercel.app/reference`
- **Health Check**: `https://seu-projeto.vercel.app/health`

## Endpoints Principais

- `POST /auth/login` - Login de usuário
- `POST /auth/refresh` - Renovar token
- `GET /fipe/brands` - Listar marcas
- `GET /vehicles` - Listar veículos
- `GET /patrimony/user/{id}` - Patrimônio do usuário
- `GET /users` - Listar usuários

## Logs e Monitoramento

### Logs da Vercel
- Acesse Functions > View Function Logs na dashboard
- Logs em tempo real durante desenvolvimento

### Observabilidade (Opcional)
- Configure Axiom ou outro provider de observabilidade
- Traces automáticos com OpenTelemetry

## Domínio Personalizado (Opcional)

1. Na dashboard da Vercel, vá em Settings > Domains
2. Adicione seu domínio personalizado
3. Configure DNS conforme instruções da Vercel
4. SSL será configurado automaticamente

## Troubleshooting

### Erro de Conexão com Banco
- Verifique se a `DATABASE_URL` está correta
- Teste conectividade do seu provedor de banco
- Verifique se as migrações foram aplicadas

### Erro de JWT
- Verifique se `JWT_SECRET` está configurada
- Confirme se não há espaços extras na variável

### Timeout em Funções
- Ajuste `maxDuration` no `vercel.json` (máximo 30s no plano gratuito)
- Otimize consultas ao banco de dados

### API FIPE Lenta
- Sistema de cache já implementado
- Sem necessidade de configuração de proxy em produção

## Considerações de Produção

1. **CORS**: Atualmente configurado para `*` - ajuste conforme necessário
2. **Rate Limiting**: Considere implementar para endpoints públicos
3. **Backup**: Configure backup automático do banco de dados
4. **Monitoramento**: Configure alertas para erros em produção
5. **Segurança**: Use HTTPS sempre (automático na Vercel)

## Custos Estimados

### Vercel (Hobby - Gratuito)
- 100GB bandwidth
- Serverless Functions
- Domínio personalizado

### Neon (Free Tier)
- 1 projeto
- 1GB de dados
- Suficiente para MVP

**Total estimado para MVP**: R$ 0,00/mês