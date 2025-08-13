FROM node:20-alpine

# Configurar proxy
ENV http_proxy=http://10.3.2.55:3128/ \
    https_proxy=http://10.3.2.55:3128/ \
    HTTP_PROXY=http://10.3.2.55:3128/ \
    HTTPS_PROXY=http://10.3.2.55:3128/ \
    no_proxy=localhost,127.0.0.1,postgres,fipe.parallelum.com.br \
    NO_PROXY=localhost,127.0.0.1,postgres,fipe.parallelum.com.br \
    NODE_ENV=development

WORKDIR /app

# Instala as ferramentas de cliente PostgreSQL
RUN apk add --no-cache postgresql-client

COPY package*.json ./
RUN npm install

COPY . .

# Gerar o Prisma Client
RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "dev"]
