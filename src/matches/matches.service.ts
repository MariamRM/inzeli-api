import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, Outcome } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}
  private WIN_CREDIT_REWARD = 0; // نعطل المكافأة العامة (نستخدم نظام نقاط اللعب)

  async createMatch(input: { roomCode?: string; gameId: string; winners: string[]; losers: string[] }) {
    const { roomCode, gameId, winners, losers } = input;
    if (!winners.length && !losers.length) throw new BadRequestException('EMPTY_MATCH');

    // NEW: hard-lock until countdown ends
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

    const ids = Array.from(new Set([...winners, ...losers]));
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } } });
    if (users.length !== ids.length) throw new BadRequestException('USER_NOT_FOUND');

    const match = await this.prisma.match.create({
      data: {
        roomCode, gameId,
        parts: {
          create: [
            ...winners.map(uid => ({ userId: uid, outcome: 'WIN' as Outcome })),
            ...losers.map(uid  => ({ userId: uid, outcome: 'LOSS' as Outcome })),
          ],
        },
      },
      include: { parts: true },
    });

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (winners.length) await tx.user.updateMany({ where: { id: { in: winners } }, data: { permanentScore: { increment: 1 } } });
      if (losers.length)  await tx.user.updateMany({ where: { id: { in: losers } }, data: { permanentScore: { decrement: 1 } } });

      const stakes = roomCode ? await tx.roomStake.findMany({ where: { roomCode } }) : [];

      // Return winner stakes
      const winnerStakes = stakes.filter(s => winners.includes(s.userId));
      for (const ws of winnerStakes) {
        if (ws.amount > 0) {
          await tx.user.update({ where: { id: ws.userId }, data: { creditPoints: { increment: ws.amount } } });
          await tx.roomStake.delete({ where: { roomCode_userId: { roomCode: ws.roomCode, userId: ws.userId } } });
        }
      }

      // Distribute loser stakes
      const loserStakes = stakes.filter(s => losers.includes(s.userId));
      const totalLoserStake = loserStakes.reduce((sum, s) => sum + s.amount, 0);

      if (totalLoserStake > 0 && winners.length > 0) {
        if (winners.length === 1) {
          await tx.user.update({ where: { id: winners[0] }, data: { creditPoints: { increment: totalLoserStake } } });
        } else {
          const per = Math.floor(totalLoserStake / winners.length);
          const rem = totalLoserStake % winners.length;
          for (let i = 0; i < winners.length; i++) {
            const inc = per + (i === 0 ? rem : 0);
            if (inc > 0) await tx.user.update({ where: { id: winners[i] }, data: { creditPoints: { increment: inc } } });
          }
        }
        for (const ls of loserStakes) {
          await tx.roomStake.delete({ where: { roomCode_userId: { roomCode: ls.roomCode, userId: ls.userId } } });
        }
      }

      // General reward disabled
      if (this.WIN_CREDIT_REWARD > 0) {
        await tx.user.updateMany({ where: { id: { in: winners } }, data: { creditPoints: { increment: this.WIN_CREDIT_REWARD } } });
      }
    });

    return match;
  }
}
//matches.service.ts