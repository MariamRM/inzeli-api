// src/matches/matches.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, Outcome } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

  /**
   * New rule:
   * - stakeUnits N ∈ {1,2,3} (default 1)
   * - winners: permanentScore += N
   * - losers:  permanentScore -= N
   * - no credits/escrow distribution here
   * - if room has active countdown: forbid results until it ends
   */
  async createMatch(input: {
    roomCode?: string;
    gameId: string;
    winners: string[];
    losers: string[];
    stakeUnits?: number;
  }) {
    const { roomCode, gameId } = input;
    const winners = input.winners ?? [];
    const losers = input.losers ?? [];

    if (winners.length === 0 && losers.length === 0) {
      throw new BadRequestException('EMPTY_MATCH');
    }

    // lock results until countdown ends
    if (roomCode) {
      const room = await this.prisma.room.findUnique({ where: { code: roomCode } });
      if (!room) throw new NotFoundException('ROOM_NOT_FOUND');

      if (room.startedAt && room.timerSec) {
        const endsAt = new Date(room.startedAt.getTime() + room.timerSec * 1000);
        if (new Date() < endsAt) {
          throw new ForbiddenException('RESULTS_LOCKED_UNTIL_TIMER_ENDS');
        }
      }
    }

    // validate users
    const ids = Array.from(new Set([...winners, ...losers]));
    if (ids.length === 0) throw new BadRequestException('NO_PARTICIPANTS');
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } } });
    if (users.length !== ids.length) throw new BadRequestException('USER_NOT_FOUND');

    // clamp stakeUnits → 1..3
    const N = Math.max(1, Math.min(3, Number(input.stakeUnits ?? 1)));

    // create match + parts
    const match = await this.prisma.match.create({
      data: {
        roomCode,
        gameId,
        parts: {
          create: [
            ...winners.map((uid) => ({ userId: uid, outcome: 'WIN' as Outcome })),
            ...losers.map((uid) => ({ userId: uid, outcome: 'LOSS' as Outcome })),
          ],
        },
      },
      include: { parts: true },
    });

    // apply +N / -N atomically and log timeline
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

      // optional timeline event
      await tx.timelineEvent.create({
        data: {
          kind: 'MATCH_FINISHED',
          roomCode: roomCode ?? null,
          gameId,
          meta: {
            winners,
            losers,
            stakeUnits: N,
            mode: 'per_round_units_no_escrow',
          },
        },
      });
    });

    return match;
  }
}
// src/matches/matches.service.ts