FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p /app/data /app/uploads /app/backups
EXPOSE 4000
CMD ["node", "server.js"]
