FROM node:24.21.0-slim AS builder
WORKDIR /app
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build:prod

FROM nginx:1.30.5
COPY --from=builder  /app/dist/pizza-calculator/browser /usr/share/nginx/html
