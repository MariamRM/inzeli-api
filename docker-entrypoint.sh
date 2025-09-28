#!/bin/sh
set -e

# تأكد من وجود DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set"; exit 1;
fi

# نطبّق السكيما (استخدمي migrate deploy لو عندك migrations)
npx prisma migrate deploy || npx prisma db push

# شغل Nest من dist
node dist/main.js
