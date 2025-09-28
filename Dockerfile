# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# don't trigger postinstall yet
ENV PRISMA_SKIP_POSTINSTALL=1
RUN npm ci --no-audit --no-fund

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
ENV PRISMA_SKIP_POSTINSTALL=1
COPY --from=deps /app/node_modules ./node_modules

# copy prisma BEFORE generating client
COPY prisma ./prisma
RUN npx prisma generate

# now copy the rest and build Nest
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# prod deps only
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# prisma runtime bits + app
COPY prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist

# entrypoint
COPY docker-entrypoint.sh /usr/local/bin/entry.sh
RUN chmod +x /usr/local/bin/entry.sh

EXPOSE 3000
CMD ["entry.sh"]
