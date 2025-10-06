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
// src/matches/matches.service.ts
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let MatchesService = class MatchesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * New rule:
     * - stakeUnits N ∈ {1,2,3} (default 1)
     * - winners: permanentScore += N
     * - losers:  permanentScore -= N
     * - no credits/escrow distribution here
     * - if room has active countdown: forbid results until it ends
     */
    async createMatch(input) {
        var _a, _b, _c;
        const { roomCode, gameId } = input;
        const winners = (_a = input.winners) !== null && _a !== void 0 ? _a : [];
        const losers = (_b = input.losers) !== null && _b !== void 0 ? _b : [];
        if (winners.length === 0 && losers.length === 0) {
            throw new common_1.BadRequestException('EMPTY_MATCH');
        }
        // lock results until countdown ends
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
        // validate users
        const ids = Array.from(new Set([...winners, ...losers]));
        if (ids.length === 0)
            throw new common_1.BadRequestException('NO_PARTICIPANTS');
        const users = await this.prisma.user.findMany({ where: { id: { in: ids } } });
        if (users.length !== ids.length)
            throw new common_1.BadRequestException('USER_NOT_FOUND');
        // clamp stakeUnits → 1..3
        const N = Math.max(1, Math.min(3, Number((_c = input.stakeUnits) !== null && _c !== void 0 ? _c : 1)));
        // create match + parts
        const match = await this.prisma.match.create({
            data: {
                roomCode,
                gameId,
                parts: {
                    create: [
                        ...winners.map((uid) => ({ userId: uid, outcome: 'WIN' })),
                        ...losers.map((uid) => ({ userId: uid, outcome: 'LOSS' })),
                    ],
                },
            },
            include: { parts: true },
        });
        // apply +N / -N atomically and log timeline
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
            // optional timeline event
            await tx.timelineEvent.create({
                data: {
                    kind: 'MATCH_FINISHED',
                    roomCode: roomCode !== null && roomCode !== void 0 ? roomCode : null,
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
};
exports.MatchesService = MatchesService;
exports.MatchesService = MatchesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MatchesService);
// src/matches/matches.service.ts
//# sourceMappingURL=matches.service.js.map