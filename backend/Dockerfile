# ── Build ──────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# install pnpm
RUN npm install -g pnpm

# copy package files
COPY package.json pnpm-lock.yaml ./

# install dependencies
RUN pnpm install --frozen-lockfile

# copy source code
COPY . .

# build the app
RUN pnpm run build

# ── Production ──────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

RUN npm install -g pnpm

# copy package files
COPY package.json pnpm-lock.yaml ./

# install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# copy built files from builder stage (includes word/data/*.txt via nest assets)
COPY --from=builder /app/dist ./dist

# copy drizzle migrations (drizzle.config.ts expects src/database/migrations)
COPY --from=builder /app/src/database/migrations ./src/database/migrations

EXPOSE 3000

CMD ["node", "dist/main.js"]
