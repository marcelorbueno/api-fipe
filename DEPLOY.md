# Guia de Deploy na Netlify

## Pré-requisitos

1. **Conta na Netlify**: Crie uma conta em [netlify.com](https://netlify.com)
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

## Passo 2: Deploy na Netlify

### Via Interface Web (Recomendado)
1. Acesse [netlify.com](https://netlify.com)
2. Clique em "Add new site" > "Import an existing project"
3. Conecte seu repositório do GitHub
4. Configure as variáveis de ambiente (veja seção abaixo)
5. Build settings já configurados no `netlify.toml`
6. Clique em "Deploy site"

### Via CLI
```bash
# Instalar Netlify CLI
npm i -g netlify-cli

# Login na Netlify
netlify login

# Inicializar projeto
netlify init

# Deploy do projeto
netlify deploy

# Deploy em produção
netlify deploy --prod
```

## Passo 3: Configurar Variáveis de Ambiente

Na dashboard da Netlify, vá em Site Settings > Environment Variables e configure:

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
# Via Netlify CLI
netlify env:import .env
npx prisma migrate deploy

# Ou via função serverless disponível em /database/reset
```

## Passo 5: Popular Banco (Seed)

Para popular o banco com dados iniciais, use a função serverless:

```bash
# Acessar endpoint de seed (após deploy)
curl https://seu-site.netlify.app/database/seed

# Ou localmente
npm run seed
```

## Estrutura de URLs em Produção

Após o deploy, sua API estará disponível em:
- **API Base**: `https://seu-site.netlify.app`
- **Health Check**: `https://seu-site.netlify.app/health`
- **Ping**: `https://seu-site.netlify.app/ping`
- **Auth**: `https://seu-site.netlify.app/auth/*`
- **Database Reset**: `https://seu-site.netlify.app/database/reset`
- **Database Seed**: `https://seu-site.netlify.app/database/seed`

## Endpoints Principais (Netlify Functions)

- `POST /auth/login` - Login de usuário
- `POST /auth/refresh` - Renovar token
- `POST /auth/logout` - Logout de usuário
- `GET /auth/me` - Dados do usuário logado
- `GET /health` - Health check do serviço
- `GET /ping` - Teste de conectividade
- `GET /database/reset` - Resetar banco de dados (use com cuidado!)
- `GET /database/seed` - Popular banco com dados iniciais

## Logs e Monitoramento

### Logs da Netlify
- Acesse Functions na dashboard para ver logs
- Logs em tempo real durante desenvolvimento com `netlify dev`
- Logs de produção disponíveis na aba Functions

### Observabilidade (Opcional)
- Configure logging provider de sua preferência
- Netlify fornece logs básicos gratuitamente

## Domínio Personalizado (Opcional)

1. Na dashboard da Netlify, vá em Domain Settings
2. Clique em "Add custom domain"
3. Configure DNS conforme instruções da Netlify
4. SSL será configurado automaticamente via Let's Encrypt

## Troubleshooting

### Erro de Conexão com Banco
- Verifique se a `DATABASE_URL` está correta
- Teste conectividade do seu provedor de banco
- Verifique se as migrações foram aplicadas

### Erro de JWT
- Verifique se `JWT_SECRET` está configurada
- Confirme se não há espaços extras na variável

### Timeout em Funções
- Netlify Functions têm timeout de 10s no plano gratuito (26s no Pro)
- Otimize consultas ao banco de dados para evitar timeouts

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

### Netlify (Starter - Gratuito)
- 100GB bandwidth/mês
- 125k Function requests/mês
- Serverless Functions
- Domínio personalizado
- SSL gratuito

### Neon (Free Tier)
- 1 projeto
- 1GB de dados
- Suficiente para MVP

**Total estimado para MVP**: R$ 0,00/mês

## Desenvolvimento Local

Para testar localmente com Netlify Functions:

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Executar em modo dev
netlify dev

# A API estará disponível em http://localhost:8888
```