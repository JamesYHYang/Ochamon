FROM node:20-slim AS builder

WORKDIR /app

# Enable and pin pnpm version
RUN corepack enable
RUN corepack prepare pnpm@10.28.1 --activate

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy ALL source files first
COPY . .

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build shared package
RUN pnpm --filter @matcha/shared build

# Generate Prisma client
RUN pnpm --filter @matcha/api exec prisma generate

# Build API
RUN pnpm --filter @matcha/api build

# Production stage - keep full monorepo structure for pnpm
FROM node:20-slim AS runner

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy entire app (preserves pnpm monorepo node_modules structure)
COPY --from=builder /app /app

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/src/main.js"]
