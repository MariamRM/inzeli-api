/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sponsorCode = 'SP-TEST';
  const games = [
    { id: 'CHESS', name: 'شطرنج',  category: 'ألعاب شعبية', prizeAmount: 500 },
    { id: 'BILLIARD', name: 'بلياردو', category: 'رياضة',       prizeAmount: 300 },
  ];

  // ensure games
  for (const g of games) {
    await prisma.game.upsert({
      where: { id: g.id },
      update: {},
      create: { id: g.id, name: g.name, category: g.category },
    });
  }

  // ensure sponsor
  await prisma.sponsor.upsert({
    where: { code: sponsorCode },
    update: { name: 'Test Sponsor', active: true },
    create: { code: sponsorCode, name: 'Test Sponsor', active: true },
  });

  // link games to sponsor
  for (const g of games) {
    await prisma.sponsorGame.upsert({
      where: { sponsorCode_gameId: { sponsorCode, gameId: g.id } },
      update: { prizeAmount: g.prizeAmount },
      create: { sponsorCode, gameId: g.id, prizeAmount: g.prizeAmount },
    });
  }

  // OPTIONAL: attach wallets for a test user so the app shows 5 pearls
  const testEmail = 'player@example.com'; // change to an existing user
  const user = await prisma.user.findUnique({ where: { email: testEmail } });
  if (user) {
    await prisma.userSponsor.upsert({
      where: { userId_sponsorCode: { userId: user.id, sponsorCode } },
      update: {},
      create: { userId: user.id, sponsorCode },
    });

    for (const g of games) {
      await prisma.sponsorGameWallet.upsert({
        where: { userId_sponsorCode_gameId: { userId: user.id, sponsorCode, gameId: g.id } },
        update: { pearls: 5 },
        create: { userId: user.id, sponsorCode, gameId: g.id, pearls: 5 },
      });
    }
    console.log(`Seeded sponsor wallets for ${testEmail}`);
  } else {
    console.log(`(Optional) Create a user ${testEmail} first to auto-seed wallets.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
//seed-sponsor.js