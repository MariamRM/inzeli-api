import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sponsorCode = 'SP-TEST';
  const games = [
    { id: 'CHESS', name: 'شطرنج', category: 'ألعاب شعبية', prizeAmount: 500 },
    { id: 'BILLIARD', name: 'بلياردو', category: 'رياضة', prizeAmount: 300 },
  ];

  // Ensure games exist
  for (const g of games) {
    await prisma.game.upsert({
      where: { id: g.id },
      update: {},
      create: { id: g.id, name: g.name, category: g.category },
    });
  }

  // Ensure sponsor
  await prisma.sponsor.upsert({
    where: { code: sponsorCode },
    update: { active: true, name: 'Test Sponsor' },
    create: { code: sponsorCode, name: 'Test Sponsor', active: true },
  });

  // SponsorGame rows
  for (const g of games) {
    await prisma.sponsorGame.upsert({
      where: { sponsorCode_gameId: { sponsorCode, gameId: g.id } },
      update: { prizeAmount: g.prizeAmount },
      create: { sponsorCode, gameId: g.id, prizeAmount: g.prizeAmount },
    });
  }

  // OPTIONAL: attach to a user by email and give 5 pearls wallet per sponsor+game
  const testEmail = 'player@example.com'; // <-- change!
  const user = await prisma.user.findUnique({ where: { email: testEmail } });
  if (user) {
    // UserSponsor
    await prisma.userSponsor.upsert({
      where: { userId_sponsorCode: { userId: user.id, sponsorCode } },
      update: {},
      create: { userId: user.id, sponsorCode },
    });

    // SponsorGameWallet seeds (5 pearls each)
    for (const g of games) {
      await prisma.sponsorGameWallet.upsert({
        where: { userId_sponsorCode_gameId: { userId: user.id, sponsorCode, gameId: g.id } },
        update: { pearls: 5 },
        create: { userId: user.id, sponsorCode, gameId: g.id, pearls: 5 },
      });
    }
    console.log(`Seeded sponsor wallets for ${testEmail}`);
  } else {
    console.log(`(Optional) Create a user with email ${testEmail} first to seed wallets.`);
  }
}

main().finally(async () => prisma.$disconnect());
//prisma/seed-sponsor.ts