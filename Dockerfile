FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .

# Build frontend (Vite) and backend (Bun bundler)
RUN bun run build && bun run build:bun

FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built assets and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-bun ./dist-bun

# Setup non-root user
RUN addgroup --system --gid 1001 compass && \
    adduser --system --uid 1001 --ingroup compass compass && \
    chown -R compass:compass /app
USER compass

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "run", "dist-bun/entry.bun.js"]
