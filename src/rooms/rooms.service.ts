// src/rooms/rooms.service.ts
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, $Enums } from '@prisma/client';

const ROOM_CREATE_COST = 5;
const ROOM_JOIN_COST = 1;

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  // ---------- helpers ----------
  private newCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  private endsAt(room: { startedAt: Date | null; timerSec: number | null }) {
    if (!room.startedAt || !room.timerSec) return null;
    return new Date(room.startedAt.getTime() + room.timerSec * 1000);
  }
  private isLocked(room: { startedAt: Date | null; timerSec: number | null }) {
    const end = this.endsAt(room);
    return !!end && new Date() < end;
  }
  private remaining(room: { startedAt: Date | null; timerSec: number | null }) {
    const end = this.endsAt(room);
    if (!end) return 0;
    return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 1000));
  }

  private buildTeamQuorum(room: {
    players: Array<{
      team: $Enums.TeamSide | null;
      user: { permanentScore: number | null } | null;
    }>;
  }) {
    const calc = (team: 'A' | 'B') => {
      const list = (room.players || []).filter((p) => p.team === team);
      const required = list.length; // quorum requirement = number of players in that team
      const available = list.reduce((sum, p) => sum + (p.user?.permanentScore ?? 0), 0);
      const quorumMet = required > 0 && available >= required;
      return { required, available, quorumMet };
    };
    return { A: calc('A'), B: calc('B') };
  }

  // ---------- core ----------
  async createRoom(gameId: string, hostId: string) {
    const host = await this.prisma.user.findUnique({ where: { id: hostId } });
    if (!host) throw new Error('USER_NOT_FOUND');
    if ((host.creditPoints ?? 0) < ROOM_CREATE_COST) throw new Error('NOT_ENOUGH_CREDITS');

    // ensure game exists
    await this.prisma.game.upsert({
      where: { id: gameId },
      update: {},
      create: { id: gameId, name: gameId, category: 'عام' },
    });

    // unique code
    let code = this.newCode();
    while (await this.prisma.room.findUnique({ where: { code } })) code = this.newCode();

    const room = await this.prisma.$transaction(async (tx) => {
      // charge host
      await tx.user.update({
        where: { id: hostId },
        data: { creditPoints: { decrement: ROOM_CREATE_COST } },
      });

      // create room + add host as player
      const r = await tx.room.create({
        data: {
          code,
          gameId,
          hostUserId: hostId,
          status: 'waiting',
          allowZeroCredit: true,
          players: { create: { userId: hostId } },
        },
        include: {
          players: {
            include: {
              user: {
                select: { id: true, displayName: true, email: true, permanentScore: true },
              },
            },
          },
          stakes: true,
        },
      });

      // timeline
      await tx.timelineEvent.create({
        data: {
          kind: 'ROOM_CREATED',
          roomCode: code,
          gameId,
          userId: hostId,
          meta: { cost: ROOM_CREATE_COST },
        },
      });

      return r;
    });

    const locked = this.isLocked(room);
    const remainingSec = this.remaining(room);
    const teamQuorum = this.buildTeamQuorum(room as any);

    return { ...room, locked, remainingSec, teamQuorum };
  }

  async getByCode(code: string) {
    const room = await this.prisma.room.findUnique({
      where: { code },
      include: {
        players: {
          include: {
            user: { select: { id: true, displayName: true, email: true, permanentScore: true } }, // 👈 pearls
          },
        },
        stakes: true, // kept for visibility; not used for pearls quorum
      },
    });
    if (!room) throw new Error('ROOM_NOT_FOUND');

    const locked = this.isLocked(room);
    const remainingSec = this.remaining(room);
    const teamQuorum = this.buildTeamQuorum(room as any);

    return { ...room, locked, remainingSec, teamQuorum };
  }

  async join(code: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('USER_NOT_FOUND');
    const room = await this.prisma.room.findUnique({ where: { code } });
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.status !== 'waiting' && room.status !== 'running') {
      throw new BadRequestException('ROOM_NOT_JOINABLE');
    }

    await this.prisma.$transaction(async (tx) => {
      const exists = await tx.roomPlayer.findUnique({
        where: { roomCode_userId: { roomCode: code, userId } },
      });
      if (!exists) {
        const charge = (user.creditPoints ?? 0) > 0 ? ROOM_JOIN_COST : 0;
        if (charge > 0) {
          await tx.user.update({
            where: { id: userId },
            data: { creditPoints: { decrement: charge } },
          });
        }
        await tx.roomPlayer.create({ data: { roomCode: code, userId } });
        await tx.timelineEvent.create({
          data: { kind: 'ROOM_JOINED', roomCode: code, userId, meta: { charged: charge } },
        });
      }
    });

    return this.getByCode(code);
  }

  async start(
    code: string,
    hostId: string,
    params: { targetWinPoints?: number; allowZeroCredit?: boolean; timerSec?: number },
  ) {
    const room = await this.prisma.room.findUnique({
      where: { code },
      include: {
        players: {
          include: {
            user: { select: { id: true, displayName: true, email: true, permanentScore: true } },
          },
        },
        stakes: true,
      },
    });
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.hostUserId !== hostId) throw new BadRequestException('ONLY_HOST_CAN_START');
    if (room.status !== 'waiting') throw new BadRequestException('ALREADY_STARTED');

    const target = params.targetWinPoints ?? null;
    const allowZero = params.allowZeroCredit ?? true;
    const sec = params.timerSec ?? 600;

    const updated = await this.prisma.room.update({
      where: { code },
      data: {
        status: 'running',
        targetWinPoints: target,
        allowZeroCredit: allowZero,
        timerSec: sec,
        startedAt: new Date(),
      },
      include: {
        players: {
          include: {
            user: { select: { id: true, displayName: true, email: true, permanentScore: true } },
          },
        },
        stakes: true,
      },
    });

    await this.prisma.timelineEvent.create({
      data: {
        kind: 'ROOM_STARTED',
        roomCode: code,
        userId: hostId,
        meta: { targetWinPoints: target, allowZeroCredit: allowZero, timerSec: sec },
      },
    });

    const locked = this.isLocked(updated);
    const remainingSec = this.remaining(updated);
    const teamQuorum = this.buildTeamQuorum(updated as any);

    return { ...updated, locked, remainingSec, teamQuorum };
  }

  async setStake(code: string, userId: string, amount: number) {
    if (amount < 0) throw new BadRequestException('INVALID_STAKE');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('USER_NOT_FOUND');
    const room = await this.prisma.room.findUnique({ where: { code } });
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.status !== 'waiting') throw new BadRequestException('STAKE_ONLY_BEFORE_START');
    if ((user.creditPoints ?? 0) < amount) throw new BadRequestException('NOT_ENOUGH_CREDITS');

    await this.prisma.$transaction(async (tx) => {
      // refund previous stake (if any)
      const old = await tx.roomStake.findUnique({
        where: { roomCode_userId: { roomCode: code, userId } },
      });
      if (old) {
        await tx.user.update({
          where: { id: userId },
          data: { creditPoints: { increment: old.amount } },
        });
        await tx.roomStake.delete({
          where: { roomCode_userId: { roomCode: code, userId } },
        });
      }
      // reserve new stake
      await tx.user.update({
        where: { id: userId },
        data: { creditPoints: { decrement: amount } },
      });
      await tx.roomStake.create({ data: { roomCode: code, userId, amount } });
      await tx.timelineEvent.create({
        data: { kind: 'STAKE_SET', roomCode: code, userId, meta: { amount } },
      });
    });

    return this.getByCode(code);
  }

  // ---- teams / leaders ----
  async setPlayerTeam(code: string, hostId: string, playerUserId: string, team: 'A' | 'B') {
    const room = await this.prisma.room.findUnique({ where: { code } });
    if (!room) throw new NotFoundException('ROOM_NOT_FOUND');
    if (room.hostUserId !== hostId) throw new ForbiddenException('ONLY_HOST_CAN_ASSIGN_TEAMS');
    if (room.status !== 'waiting') throw new BadRequestException('TEAMS_LOCKED_AFTER_START');

    const rp = await this.prisma.roomPlayer.findUnique({
      where: { roomCode_userId: { roomCode: code, userId: playerUserId } },
    });
    if (!rp) throw new NotFoundException('PLAYER_NOT_IN_ROOM');

    await this.prisma.roomPlayer.update({
      where: { roomCode_userId: { roomCode: code, userId: playerUserId } },
      data: { team: team as $Enums.TeamSide },
    });

    await this.prisma.timelineEvent.create({
      data: { kind: 'TEAM_SET', roomCode: code, userId: playerUserId, meta: { team } },
    });

    return this.getByCode(code);
  }

  async setTeamLeader(code: string, hostId: string, team: 'A' | 'B', leaderUserId: string) {
    const room = await this.prisma.room.findUnique({ where: { code } });
    if (!room) throw new NotFoundException('ROOM_NOT_FOUND');
    if (room.hostUserId !== hostId) throw new ForbiddenException('ONLY_HOST_CAN_SET_LEADER');
    if (room.status !== 'waiting') throw new BadRequestException('LEADERS_LOCKED_AFTER_START');

    const rp = await this.prisma.roomPlayer.findUnique({
      where: { roomCode_userId: { roomCode: code, userId: leaderUserId } },
    });
    if (!rp || rp.team !== (team as $Enums.TeamSide)) {
      throw new BadRequestException('LEADER_MUST_BE_IN_TEAM');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.roomPlayer.updateMany({
        where: { roomCode: code, team: { equals: team as $Enums.TeamSide } },
        data: { isLeader: false },
      });

      await tx.roomPlayer.update({
        where: { roomCode_userId: { roomCode: code, userId: leaderUserId } },
        data: { isLeader: true },
      });

      await tx.timelineEvent.create({
        data: { kind: 'TEAM_LEADER_SET', roomCode: code, userId: leaderUserId, meta: { team } },
      });
    });

    return this.getByCode(code);
  }
}
// src/rooms/rooms.service.ts