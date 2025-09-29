# Deploy no Vercel - Instruções

## 1. Preparação Concluída ✅

O projeto já está configurado para Vercel com:
- ✅ `vercel.json` configurado com rotas e runtime
- ✅ Endpoints básicos `/health` e `/ping` criados
- ✅ Estrutura de API serverless pronta

## 2. Deploy Manual no Vercel

### Opção A: Via Vercel Dashboard (Recomendado)
1. Acesse [vercel.com](https://vercel.com)
2. Faça login na sua conta
3. Clique em "New Project"
4. Conecte ao repositório GitHub: `marcelorbueno/api-fipe`
5. Configure as variáveis de ambiente (veja seção abaixo)
6. Deploy automático será executado

### Opção B: Via CLI (se preferir)
```bash
vercel login
vercel --prod
```

## 3. Variáveis de Ambiente Necessárias

Configure estas variáveis no Vercel Dashboard:

```env
DATABASE_URL=sua_url_postgresql_neon_ou_planetscale
JWT_SECRET=sua_chave_secreta_jwt
API_FIPE_PATH=https://fipe.parallelum.com.br/api/v2
FIPE_REFERENCE=325
JWT_ACCESS_TOKEN_EXPIRES_IN=1h
JWT_REFRESH_TOKEN_EXPIRES_DAYS=7
NODE_ENV=production
```

### Importante: Banco de Dados
- Use um banco PostgreSQL na nuvem (ex: Neon, PlanetScale, Supabase)
- NÃO use localhost no `DATABASE_URL`

## 4. Domínio Customizado
Após o deploy, configure:
- No Vercel Dashboard: Settings > Domains
- Adicione: `api.bmccar.com.br`

## 5. Testar Deploy
Após o deploy, teste:
```bash
curl https://seu-projeto.vercel.app/health
curl https://seu-projeto.vercel.app/ping
```

## 6. Próximos Passos
1. Configurar domínio customizado
2. Implementar endpoints completos da API
3. Configurar variáveis de produção

---
**Status**: ✅ Configuração pronta para deploy