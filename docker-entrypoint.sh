#!/bin/sh
set -e
[ -z "$DATABASE_URL" ] && echo "ERROR: DATABASE_URL is not set" && exit 1
# use migrations if you have them; otherwise db push
npx prisma migrate deploy || npx prisma db push
node dist/main.js
