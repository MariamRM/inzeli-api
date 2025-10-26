// src/sponsors/sponsors.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SponsorsService {
  constructor(private prisma: PrismaService) {}

  // ---------- موجودة عندك: لا تغيير ----------
  async listSponsors() {
    return this.prisma.sponsor.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  // ---------- موجودة عندك: لا تغيير ----------
  async getSponsorWithGames(code: string) {
    const sponsor = await this.prisma.sponsor.findUnique({
      where: { code },
      include: {
        users: { select: { userId: true } },
      },
    });
    if (!sponsor) throw new NotFoundException('SPONSOR_NOT_FOUND');

    const games = await this.prisma.sponsorGame.findMany({
      where: { sponsorCode: code },
      include: { game: true },
      orderBy: [{ gameId: 'asc' }],
    });

    return { sponsor, games };
  }

  // ---------- موجودة عندك: لا تغيير ----------
  async joinSponsor(userId: string, code: string) {
    const s = await this.prisma.sponsor.findUnique({ where: { code } });
    if (!s || !s.active) throw new BadRequestException('SPONSOR_INACTIVE_OR_NOT_FOUND');

    await this.prisma.userSponsor.upsert({
      where: { userId_sponsorCode: { userId, sponsorCode: code } },
      update: {},
      create: { userId, sponsorCode: code },
    });

    const sGames = await this.prisma.sponsorGame.findMany({ where: { sponsorCode: code } });
    for (const g of sGames) {
      await this.prisma.sponsorGameWallet.upsert({
        where: { userId_sponsorCode_gameId: { userId, sponsorCode: code, gameId: g.gameId } },
        update: {},
        create: { userId, sponsorCode: code, gameId: g.gameId, pearls: 5 },
      });
    }
    return { ok: true };
  }

  // ---------- موجودة عندك: لا تغيير ----------
  async userWallets(userId: string, sponsorCode: string) {
    return this.prisma.sponsorGameWallet.findMany({
      where: { userId, sponsorCode },
      include: { game: true },
      orderBy: [{ gameId: 'asc' }],
    });
  }

  // ---------- موجودة عندك: لا تغيير ----------
  async userAllWallets(userId: string) {
    return this.prisma.sponsorGameWallet.findMany({
      where: { userId },
      include: { game: true, sponsor: true },
      orderBy: [{ sponsorCode: 'asc' }, { gameId: 'asc' }],
    });
  }

  // ---------- جديدة: leaderboard لكل راعٍ + لعبة ----------
  async leaderboard(sponsorCode: string, gameId: string) {
    // يرجّع [{ userId, pearls, user: { displayName, email } }, ...] مرتّبة تنازلياً
    return this.prisma.sponsorGameWallet.findMany({
      where: { sponsorCode, gameId },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: [{ pearls: 'desc' }],
      take: 100, // حدّ معقول، غيّري إذا تحتاجين
    });
  }

  // ---------- جديدة: تأكيد/إنشاء محفظة لؤلؤ للّاعب ----------
  async ensureWallet(userId: string, sponsorCode: string, gameId: string) {
    // تأكّد الراعي موجود وActive
    const s = await this.prisma.sponsor.findUnique({ where: { code: sponsorCode } });
    if (!s || !s.active) throw new NotFoundException('SPONSOR_NOT_FOUND');

    // تأكّد اللعبة مدعومة من هذا الراعي
    const sg = await this.prisma.sponsorGame.findUnique({
      where: { sponsorCode_gameId: { sponsorCode, gameId } },
    });
    if (!sg) throw new BadRequestException('GAME_NOT_SPONSORED');

    // تأكّد المستخدم منضم للراعي
    await this.prisma.userSponsor.upsert({
      where: { userId_sponsorCode: { userId, sponsorCode } },
      update: {},
      create: { userId, sponsorCode },
    });

    // أنشئ/أكّد المحفظة (تبدأ بـ5 إذا جديدة)
    const wallet = await this.prisma.sponsorGameWallet.upsert({
      where: { userId_sponsorCode_gameId: { userId, sponsorCode, gameId } },
      update: {}, // نترك الرصيد كما هو إذا موجودة
      create: { userId, sponsorCode, gameId, pearls: 5 },
    });

    return wallet;
  }
}
//sponsors.service.ts
//src/sponsors/sponsors.service.ts