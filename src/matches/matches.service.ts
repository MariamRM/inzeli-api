import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, Outcome } from '@prisma/client';

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

  async createMatch(input: {
    roomCode?: string;
    sponsorCode?: string; // NEW
    gameId: string;
    winners: string[];
    losers: string[];
    stakeUnits?: number;
  }) {
    const { roomCode, sponsorCode, gameId } = input;
    const winners = input.winners ?? [];
    const losers = input.losers ?? [];

    if (winners.length === 0 && losers.length === 0) {
      throw new BadRequestException('EMPTY_MATCH');
    }

    // Optional room lock
    if (roomCode) {
      const room = await this.prisma.room.findUnique({ where: { code: roomCode } });
      if (!room) throw new NotFoundException('ROOM_NOT_FOUND');
      if (room.startedAt && room.timerSec) {
        const endsAt = new Date(room.startedAt.getTime() + room.timerSec * 1000);
        if (new Date() < endsAt) throw new ForbiddenException('RESULTS_LOCKED_UNTIL_TIMER_ENDS');
      }
    }

    // Validate sponsor if used
    if (sponsorCode) {
      const s = await this.prisma.sponsor.findUnique({ where: { code: sponsorCode } });
      if (!s || !s.active) throw new NotFoundException('SPONSOR_NOT_FOUND_OR_INACTIVE');
      // تأكد أن اللعبة ضمن ألعاب الراعي (اختياري لكن منطقي)
      const sg = await this.prisma.sponsorGame.findUnique({
        where: { sponsorCode_gameId: { sponsorCode, gameId } },
      });
      if (!sg) throw new BadRequestException('GAME_NOT_SPONSORED');
    }

    // Validate users
    const ids = Array.from(new Set([...winners, ...losers]));
    if (ids.length === 0) throw new BadRequestException('NO_PARTICIPANTS');
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true } });
    if (users.length !== ids.length) throw new BadRequestException('USER_NOT_FOUND');

    // Clamp stakeUnits
    const N = Math.max(1, Math.min(3, Number(input.stakeUnits ?? 1)));

    // Always create Match row (مع ربط الراعي لو موجود) — هذا لا يغيّر الترتيب العام
    const match = await this.prisma.match.create({
      data: {
        roomCode,
        gameId,
        sponsorCode: sponsorCode ?? null, // keep for reporting
        parts: {
          create: [
            ...winners.map((uid) => ({ userId: uid, outcome: 'WIN' as Outcome })),
            ...losers.map((uid) => ({ userId: uid, outcome: 'LOSS' as Outcome })),
          ],
        },
      },
      include: { parts: true },
    });

    if (!sponsorCode) {
      // === مباراة عادية: إن كنت سابقاً تعدّل permanentScore، اتركها كما هي أو ألغها إن ما تحتاجها ===
      await this.prisma.$transaction(async (tx) => {
        if (winners.length) {
          await tx.user.updateMany({
            where: { id: { in: winners } },
            data: { permanentScore: { increment: N } },
          });
        }
        if (losers.length) {
          await tx.user.updateMany({
            where: { id: { in: losers } },
            data: { permanentScore: { decrement: N } },
          });
        }
        await tx.timelineEvent.create({
          data: {
            kind: 'MATCH_FINISHED',
            roomCode: roomCode ?? null,
            gameId,
            meta: { winners, losers, stakeUnits: N, mode: 'global' },
          },
        });
      });
      return match;
    }

    // === مباراة راعي: عدّل SponsorGameWallet فقط (لا تمسّ أي نقاط عامة)
    await this.prisma.$transaction(async (tx) => {
      // تأكد وجود محافظ الفائزين/الخاسرين (كل لعبة داخل الراعي تبدأ 5)
      for (const uid of ids) {
        await tx.sponsorGameWallet.upsert({
          where: { userId_sponsorCode_gameId: { userId: uid, sponsorCode, gameId } },
          update: {},
          create: { userId: uid, sponsorCode, gameId, pearls: 5 },
        });
      }

      if (winners.length) {
        await tx.sponsorGameWallet.updateMany({
          where: { sponsorCode, gameId, userId: { in: winners } },
          data: { pearls: { increment: N } },
        });
      }
      if (losers.length) {
        await tx.sponsorGameWallet.updateMany({
          where: { sponsorCode, gameId, userId: { in: losers } },
          data: { pearls: { decrement: N } },
        });
      }

      await tx.timelineEvent.create({
        data: {
          kind: 'MATCH_FINISHED',
          roomCode: roomCode ?? null,
          gameId,
          meta: { sponsorCode, winners, losers, stakeUnits: N, mode: 'sponsor_only' },
        },
      });
    });

    return match;
  }
}
