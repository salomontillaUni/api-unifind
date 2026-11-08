FROM node:20-alpine

WORKDIR /app

# Copiar dependencias primero para optimizar cache de capas Docker
COPY package*.json ./

RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Exponer el puerto configurado por el entorno o por defecto 3000
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "index.js"]
