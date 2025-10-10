import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SponsorsService {
  constructor(private prisma: PrismaService) {}

  // Active sponsors list
  async listSponsors() {
    return this.prisma.sponsor.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  // Sponsor detail + games/prizes
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

  // Attach user to sponsor (creates UserSponsor + seed wallets if missing)
  async joinSponsor(userId: string, code: string) {
    const s = await this.prisma.sponsor.findUnique({ where: { code } });
    if (!s || !s.active) throw new BadRequestException('SPONSOR_INACTIVE_OR_NOT_FOUND');

    // Upsert UserSponsor
    await this.prisma.userSponsor.upsert({
      where: { userId_sponsorCode: { userId, sponsorCode: code } },
      update: {},
      create: { userId, sponsorCode: code },
    });

    // Ensure a wallet (pearls) for every sponsor game (seed 5 if new)
    const sGames = await this.prisma.sponsorGame.findMany({ where: { sponsorCode: code } });
    for (const g of sGames) {
      await this.prisma.sponsorGameWallet.upsert({
        where: {
          userId_sponsorCode_gameId: { userId, sponsorCode: code, gameId: g.gameId },
        },
        update: {},
        create: {
          userId,
          sponsorCode: code,
          gameId: g.gameId,
          pearls: 5, // starting balance per board
        },
      });
    }
    return { ok: true };
  }

  // User wallets under a sponsor
  async userWallets(userId: string, sponsorCode: string) {
    const wallets = await this.prisma.sponsorGameWallet.findMany({
      where: { userId, sponsorCode },
      include: { game: true },
      orderBy: [{ gameId: 'asc' }],
    });
    return wallets;
  }

  // All user wallets (all sponsors)
  async userAllWallets(userId: string) {
    return this.prisma.sponsorGameWallet.findMany({
      where: { userId },
      include: { game: true, sponsor: true },
      orderBy: [{ sponsorCode: 'asc' }, { gameId: 'asc' }],
    });
  }
}
