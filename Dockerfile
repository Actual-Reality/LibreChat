FROM node:20-bookworm-slim AS base
ENV CI=true \
    PNPM_SKIP_UPDATE_CHECK=true
WORKDIR /app

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json ./api/
COPY client/package.json ./client/
COPY packages/api/package.json ./packages/api/
COPY packages/client/package.json ./packages/client/
COPY packages/data-provider/package.json ./packages/data-provider/
COPY packages/data-schemas/package.json ./packages/data-schemas/
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run build:data-provider \
 && npm run build:data-schemas \
 && npm run build:api \
 && npm run build:client-package \
 && npm --prefix client run build
RUN npm prune --omit=dev

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3080
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/api ./api
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/client/public ./client/public
COPY --from=builder /app/librechat.yaml ./librechat.yaml
RUN mkdir -p uploads logs \
 && chown -R node:node /app
USER node
EXPOSE 3080
CMD ["node", "api/server/index.js"]
