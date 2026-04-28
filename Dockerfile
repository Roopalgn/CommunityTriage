FROM node:20-slim

WORKDIR /app

COPY package.json ./
COPY server.js main.js index.html styles.css ./
COPY src/ ./src/
COPY demo-csv/ ./demo-csv/
COPY evaluation/ ./evaluation/

RUN mkdir -p /app/data

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]
