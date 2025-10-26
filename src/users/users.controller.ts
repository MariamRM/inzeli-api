import { Controller, Get, Param, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ok, err } from '../common/api';

@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  // GET /api/users/:id/stats?gameId=TREX
  @Get(':id/stats')
  async stats(@Param('id') id: string, @Query('gameId') gameId?: string) {
    // لا نستخدم Generics على $queryRawUnsafe؛ نعمل cast بعد الرجوع
    let rowsAny: unknown;

    if (gameId) {
      rowsAny = await this.prisma.$queryRawUnsafe(
        `
        SELECT mp."outcome", COUNT(*)::int AS cnt
        FROM "MatchParticipant" mp
        JOIN "Match" m ON m."id" = mp."matchId"
        WHERE mp."userId" = $1 AND m."gameId" = $2
        GROUP BY mp."outcome"
        `,
        id, gameId,
      );
    } else {
      rowsAny = await this.prisma.$queryRawUnsafe(
        `
        SELECT mp."outcome", COUNT(*)::int AS cnt
        FROM "MatchParticipant" mp
        JOIN "Match" m ON m."id" = mp."matchId"
        WHERE mp."userId" = $1
        GROUP BY mp."outcome"
        `,
        id,
      );
    }

    const rows = rowsAny as { outcome: string; cnt: number }[];

    const wins   = rows.find(r => r.outcome === 'WIN')?.cnt ?? 0;
    const losses = rows.find(r => r.outcome === 'LOSS')?.cnt ?? 0;

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return err('USER_NOT_FOUND', 'USER_NOT_FOUND');

    return ok('User stats', {
      userId: id,
      gameId: gameId ?? null,
      wins,
      losses,
      permanentScore: user.permanentScore,
      creditPoints:   user.creditPoints,
    });
  }
}
//users.controller.ts
//src/users/users.controller.ts