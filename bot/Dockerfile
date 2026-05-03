FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY index.js ./

ENV NODE_ENV=production

CMD ["node", "index.js"]
