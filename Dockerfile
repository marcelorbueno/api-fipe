FROM node:20-alpine

# Configurar proxy
RUN echo "http://10.3.2.55:3128" > /etc/apk/proxy_http && \
    echo "http://10.3.2.55:3128" > /etc/apk/proxy_https

ENV NODE_ENV=development \
    http_proxy=http://10.3.2.55:3128/ \
    https_proxy=http://10.3.2.55:3128/ \
    HTTP_PROXY=http://10.3.2.55:3128/ \
    HTTPS_PROXY=http://10.3.2.55:3128/ \
    no_proxy=localhost,127.0.0.1,postgres \
    NO_PROXY=localhost,127.0.0.1,postgres

RUN apk add --no-cache postgresql15-client openssl openssl-dev

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev"]
