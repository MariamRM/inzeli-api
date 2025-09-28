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
exports.MatchesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let MatchesService = class MatchesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.WIN_CREDIT_REWARD = 0; // نعطل المكافأة العامة (نستخدم نظام نقاط اللعب)
    }
    async createMatch(input) {
        const { roomCode, gameId, winners, losers } = input;
        if (!winners.length && !losers.length)
            throw new common_1.BadRequestException('EMPTY_MATCH');
        // NEW: hard-lock until countdown ends
        if (roomCode) {
            const room = await this.prisma.room.findUnique({ where: { code: roomCode } });
            if (!room)
                throw new common_1.NotFoundException('ROOM_NOT_FOUND');
            if (room.startedAt && room.timerSec) {
                const endsAt = new Date(room.startedAt.getTime() + room.timerSec * 1000);
                if (new Date() < endsAt) {
                    throw new common_1.ForbiddenException('RESULTS_LOCKED_UNTIL_TIMER_ENDS');
                }
            }
        }
        const ids = Array.from(new Set([...winners, ...losers]));
        const users = await this.prisma.user.findMany({ where: { id: { in: ids } } });
        if (users.length !== ids.length)
            throw new common_1.BadRequestException('USER_NOT_FOUND');
        const match = await this.prisma.match.create({
            data: {
                roomCode, gameId,
                parts: {
                    create: [
                        ...winners.map(uid => ({ userId: uid, outcome: 'WIN' })),
                        ...losers.map(uid => ({ userId: uid, outcome: 'LOSS' })),
                    ],
                },
            },
            include: { parts: true },
        });
        await this.prisma.$transaction(async (tx) => {
            if (winners.length)
                await tx.user.updateMany({ where: { id: { in: winners } }, data: { permanentScore: { increment: 1 } } });
            if (losers.length)
                await tx.user.updateMany({ where: { id: { in: losers } }, data: { permanentScore: { decrement: 1 } } });
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
                }
                else {
                    const per = Math.floor(totalLoserStake / winners.length);
                    const rem = totalLoserStake % winners.length;
                    for (let i = 0; i < winners.length; i++) {
                        const inc = per + (i === 0 ? rem : 0);
                        if (inc > 0)
                            await tx.user.update({ where: { id: winners[i] }, data: { creditPoints: { increment: inc } } });
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
};
exports.MatchesService = MatchesService;
exports.MatchesService = MatchesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MatchesService);
//matches.service.ts
//# sourceMappingURL=matches.service.js.map