# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# أسرع cache للـ deps
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# انسخي السورس وولّدي prisma client وابني Nest
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

# نسحب فقط ما نحتاجه للتشغيل
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ننسخ prisma + ملفّات dist المبنية من مرحلة build
COPY prisma ./prisma
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /app/dist ./dist

# سكربت entrypoint يشغّل migrate ثم السيرفر
COPY docker-entrypoint.sh /usr/local/bin/entry.sh
RUN chmod +x /usr/local/bin/entry.sh

EXPOSE 3000
CMD ["entry.sh"]
