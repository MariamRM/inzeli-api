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

  /**
   * v1.5:
   * - stakeUnits N ∈ {1,2,3} (default 1)
   * - If sponsorCode is provided → adjust ONLY SponsorGameWallet (no global points)
   * - If sponsorCode is NOT provided → apply v1.4 quorum rule on global permanentScore:
   *      winners +N ONLY IF their team quorum is met (sum(permanentScore) ≥ team size)
   *      losers  −N always
   * - Room timer lock enforced.
   */
  async createMatch(input: {
    roomCode?: string;
    sponsorCode?: string;
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
    let room:
      | (Prisma.RoomGetPayload<{
          include: { players: { select: { userId: true; team: true } } };
        }>)
      | null = null;

    if (roomCode) {
      room = await this.prisma.room.findUnique({
        where: { code: roomCode },
        include: { players: { select: { userId: true, team: true } } },
      });
      if (!room) throw new NotFoundException('ROOM_NOT_FOUND');
      if (room.startedAt && room.timerSec) {
        const endsAt = new Date(room.startedAt.getTime() + room.timerSec * 1000);
        if (new Date() < endsAt) {
          throw new ForbiddenException('RESULTS_LOCKED_UNTIL_TIMER_ENDS');
        }
      }
    }

    // Validate sponsor (if any)
    if (sponsorCode) {
      const s = await this.prisma.sponsor.findUnique({ where: { code: sponsorCode } });
      if (!s || !s.active) throw new NotFoundException('SPONSOR_NOT_FOUND_OR_INACTIVE');
      const sg = await this.prisma.sponsorGame.findUnique({
        where: { sponsorCode_gameId: { sponsorCode, gameId } },
      });
      if (!sg) throw new BadRequestException('GAME_NOT_SPONSORED');
    }

    // Validate users
    const ids = Array.from(new Set([...winners, ...losers]));
    if (ids.length === 0) throw new BadRequestException('NO_PARTICIPANTS');

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (users.length !== ids.length) throw new BadRequestException('USER_NOT_FOUND');

    // Clamp stakeUnits → 1..3
    const N = Math.max(1, Math.min(3, Number(input.stakeUnits ?? 1)));

    // Create match row (keep sponsorCode if provided)
    const match = await this.prisma.match.create({
      data: {
        roomCode,
        gameId,
        sponsorCode: sponsorCode ?? null,
        parts: {
          create: [
            ...winners.map((uid) => ({ userId: uid, outcome: 'WIN' as Outcome })),
            ...losers.map((uid) => ({ userId: uid, outcome: 'LOSS' as Outcome })),
          ],
        },
      },
      include: { parts: true },
    });

    // Sponsor match: change only sponsor wallets
    if (sponsorCode) {
      await this.prisma.$transaction(async (tx) => {
        // Ensure wallets exist (start at 5)
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

    // Non-sponsor match: apply v1.4 quorum rule to global points
    const winnersEligible: string[] = [];

    if (room) {
      // Build team map
      const teamByUser = new Map<string, 'A' | 'B' | null>();
      for (const p of room.players) {
        teamByUser.set(p.userId, (p.team as 'A' | 'B' | null) ?? null);
      }

      // Fetch pearls (permanentScore) for all room players
      const roomUserIds = room.players.map((p) => p.userId);
      const scores = await this.prisma.user.findMany({
        where: { id: { in: roomUserIds } },
        select: { id: true, permanentScore: true },
      });
      const scoreMap = new Map(scores.map((u) => [u.id, u.permanentScore]));

      // Sum/count per team
      const teamSum: Record<'A' | 'B', number> = { A: 0, B: 0 };
      const teamCount: Record<'A' | 'B', number> = { A: 0, B: 0 };
      for (const p of room.players) {
        const t = (p.team as 'A' | 'B' | null) ?? null;
        if (!t) continue;
        teamSum[t] += scoreMap.get(p.userId) ?? 0;
        teamCount[t] += 1;
      }
      const quorumMet: Record<'A' | 'B', boolean> = {
        A: teamCount.A > 0 && teamSum.A >= teamCount.A,
        B: teamCount.B > 0 && teamSum.B >= teamCount.B,
      };

      // Eligible winners: no team → allowed, else only if team quorum met
      for (const uid of winners) {
        const t = teamByUser.get(uid);
        if (!t) winnersEligible.push(uid);
        else if (quorumMet[t]) winnersEligible.push(uid);
      }
    } else {
      // No room context → allow all winners
      winnersEligible.push(...winners);
    }

    await this.prisma.$transaction(async (tx) => {
      if (winnersEligible.length) {
        await tx.user.updateMany({
          where: { id: { in: winnersEligible } },
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
          meta: {
            winners,
            winnersEligible,
            losers,
            stakeUnits: N,
            pearlsBasis: 'permanentScore',
            quorumRule: 'teamSum(permScore) >= teamSize for +N',
            mode: 'global',
          },
        },
      });
    });

    return match;
  }
}
