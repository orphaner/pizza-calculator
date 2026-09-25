FROM node:18.20.8-slim AS builder
WORKDIR /app
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm ci
COPY . .
RUN npm run build --prod

FROM nginx:1.17
COPY --from=builder  /app/dist/pizza-calculator /usr/share/nginx/html
