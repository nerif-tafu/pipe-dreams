# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev

COPY --from=builder /app/build ./build
COPY --from=builder /app/static ./static

EXPOSE 3000

CMD ["node", "build/index.js"]
