"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const ROOM_CREATE_COST = 5;
const ROOM_JOIN_COST = 1;
let RoomsService = class RoomsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    newCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let s = '';
        for (let i = 0; i < 6; i++)
            s += chars[Math.floor(Math.random() * chars.length)];
        return s;
    }
    // ---- LOCK HELPERS ----
    endsAt(room) {
        if (!room.startedAt || !room.timerSec)
            return null;
        return new Date(room.startedAt.getTime() + room.timerSec * 1000);
    }
    isLocked(room) {
        const end = this.endsAt(room);
        return !!end && new Date() < end;
    }
    remaining(room) {
        const end = this.endsAt(room);
        if (!end)
            return 0;
        return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 1000));
    }
    // ---- CORE ----
    async createRoom(gameId, hostId) {
        var _a;
        const host = await this.prisma.user.findUnique({ where: { id: hostId } });
        if (!host)
            throw new Error('USER_NOT_FOUND');
        if (((_a = host.creditPoints) !== null && _a !== void 0 ? _a : 0) < ROOM_CREATE_COST)
            throw new Error('NOT_ENOUGH_CREDITS');
        await this.prisma.game.upsert({
            where: { id: gameId },
            update: {},
            create: { id: gameId, name: gameId, category: 'عام' },
        });
        let code = this.newCode();
        while (await this.prisma.room.findUnique({ where: { code } }))
            code = this.newCode();
        const room = await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: hostId },
                data: { creditPoints: { decrement: ROOM_CREATE_COST } },
            });
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
                    players: { include: { user: { select: { id: true, displayName: true, email: true } } } },
                    stakes: true,
                },
            });
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
        return room;
    }
    async getByCode(code) {
        const room = await this.prisma.room.findUnique({
            where: { code },
            include: {
                players: { include: { user: { select: { id: true, displayName: true, email: true } } } },
                stakes: true,
            },
        });
        if (!room)
            throw new Error('ROOM_NOT_FOUND');
        const locked = this.isLocked(room);
        const remainingSec = this.remaining(room);
        return Object.assign(Object.assign({}, room), { locked, remainingSec });
    }
    async join(code, userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new Error('USER_NOT_FOUND');
        const room = await this.prisma.room.findUnique({ where: { code } });
        if (!room)
            throw new Error('ROOM_NOT_FOUND');
        if (room.status !== 'waiting' && room.status !== 'running') {
            throw new common_1.BadRequestException('ROOM_NOT_JOINABLE');
        }
        await this.prisma.$transaction(async (tx) => {
            var _a;
            const exists = await tx.roomPlayer.findUnique({
                where: { roomCode_userId: { roomCode: code, userId } },
            });
            if (!exists) {
                const charge = ((_a = user.creditPoints) !== null && _a !== void 0 ? _a : 0) > 0 ? ROOM_JOIN_COST : 0;
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
    async start(code, hostId, params) {
        var _a, _b, _c;
        const room = await this.prisma.room.findUnique({ where: { code } });
        if (!room)
            throw new Error('ROOM_NOT_FOUND');
        if (room.hostUserId !== hostId)
            throw new common_1.BadRequestException('ONLY_HOST_CAN_START');
        if (room.status !== 'waiting')
            throw new common_1.BadRequestException('ALREADY_STARTED');
        const target = (_a = params.targetWinPoints) !== null && _a !== void 0 ? _a : null;
        const allowZero = (_b = params.allowZeroCredit) !== null && _b !== void 0 ? _b : true;
        const sec = (_c = params.timerSec) !== null && _c !== void 0 ? _c : 600;
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
                players: { include: { user: { select: { id: true, displayName: true, email: true } } } },
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
        return Object.assign(Object.assign({}, updated), { locked: this.isLocked(updated), remainingSec: this.remaining(updated) });
    }
    async setStake(code, userId, amount) {
        var _a;
        if (amount < 0)
            throw new common_1.BadRequestException('INVALID_STAKE');
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new Error('USER_NOT_FOUND');
        const room = await this.prisma.room.findUnique({ where: { code } });
        if (!room)
            throw new Error('ROOM_NOT_FOUND');
        if (room.status !== 'waiting')
            throw new common_1.BadRequestException('STAKE_ONLY_BEFORE_START');
        if (((_a = user.creditPoints) !== null && _a !== void 0 ? _a : 0) < amount)
            throw new common_1.BadRequestException('NOT_ENOUGH_CREDITS');
        await this.prisma.$transaction(async (tx) => {
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
    // ---- TEAMS / LEADERS ----
    async setPlayerTeam(code, hostId, playerUserId, team) {
        const room = await this.prisma.room.findUnique({ where: { code } });
        if (!room)
            throw new common_1.NotFoundException('ROOM_NOT_FOUND');
        if (room.hostUserId !== hostId)
            throw new common_1.ForbiddenException('ONLY_HOST_CAN_ASSIGN_TEAMS');
        if (room.status !== 'waiting')
            throw new common_1.BadRequestException('TEAMS_LOCKED_AFTER_START');
        const rp = await this.prisma.roomPlayer.findUnique({
            where: { roomCode_userId: { roomCode: code, userId: playerUserId } },
        });
        if (!rp)
            throw new common_1.NotFoundException('PLAYER_NOT_IN_ROOM');
        await this.prisma.roomPlayer.update({
            where: { roomCode_userId: { roomCode: code, userId: playerUserId } },
            data: { team: team },
        });
        await this.prisma.timelineEvent.create({
            data: { kind: 'TEAM_SET', roomCode: code, userId: playerUserId, meta: { team } },
        });
        return this.getByCode(code);
    }
    async setTeamLeader(code, hostId, team, leaderUserId) {
        const room = await this.prisma.room.findUnique({ where: { code } });
        if (!room)
            throw new common_1.NotFoundException('ROOM_NOT_FOUND');
        if (room.hostUserId !== hostId)
            throw new common_1.ForbiddenException('ONLY_HOST_CAN_SET_LEADER');
        if (room.status !== 'waiting')
            throw new common_1.BadRequestException('LEADERS_LOCKED_AFTER_START');
        const rp = await this.prisma.roomPlayer.findUnique({
            where: { roomCode_userId: { roomCode: code, userId: leaderUserId } },
        });
        if (!rp || rp.team !== team) {
            throw new common_1.BadRequestException('LEADER_MUST_BE_IN_TEAM');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.roomPlayer.updateMany({
                where: { roomCode: code, team: { equals: team } },
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
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RoomsService);
//# sourceMappingURL=rooms.service.js.map