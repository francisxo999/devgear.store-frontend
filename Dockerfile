# Etapa 1: compila Angular a archivos estáticos
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build -- --configuration production

# Etapa 2: Caddy sirve la SPA y obtiene el certificado HTTPS automáticamente
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist/devgear-store/browser /srv
