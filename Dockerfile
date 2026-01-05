FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Build frontend (Vite) and backend (tsup)
RUN pnpm run build && pnpm run build:node

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built assets and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-node ./dist-node
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

# Install production dependencies only
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --prod --frozen-lockfile

# Setup non-root user
RUN addgroup --system --gid 1001 compass
RUN adduser --system --uid 1001 compass
RUN chown -R compass:compass /app
USER compass

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "dist-node/entry.node.js"]
