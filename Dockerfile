FROM node:20-alpine

# Configurar proxy para apk (Alpine package manager)
RUN echo "http://10.3.2.55:3128" > /etc/apk/proxy_http && \
    echo "http://10.3.2.55:3128" > /etc/apk/proxy_https

# Configurar variáveis de ambiente do proxy
ENV NODE_ENV=development \
    http_proxy=http://10.3.2.55:3128/ \
    https_proxy=http://10.3.2.55:3128/ \
    HTTP_PROXY=http://10.3.2.55:3128/ \
    HTTPS_PROXY=http://10.3.2.55:3128/ \
    no_proxy=localhost,127.0.0.1,postgres \
    NO_PROXY=localhost,127.0.0.1,postgres

# Atualizar repositórios e instalar dependências
RUN apk update && \
    apk add --no-cache openssl musl-dev postgresql15-client

WORKDIR /app

# Copiar arquivos de dependência
COPY package*.json ./

# Instalar dependências do Node.js
RUN npm install

# Copiar schema do Prisma
COPY prisma ./prisma/

# Gerar cliente Prisma
RUN npx prisma generate

# Copiar resto do código
COPY . .

# Tornar entrypoint executável
RUN chmod +x ./entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["/app/entrypoint.sh"]
