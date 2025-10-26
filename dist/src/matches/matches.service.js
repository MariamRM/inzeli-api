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
    }
    /**
     * v1.5.1 pearls logic:
     * - stake is fixed to 1 (client option removed/ignored)
     * - For normal games (no sponsorCode):
     *     losers: permanentScore -= 1 each
     *     winners: receive the total lost pearls, distributed evenly
     * - For sponsor games (with sponsorCode):
     *     same transfer but on SponsorGameWallet (per sponsor+game)
     * - Timer-lock still enforced if roomCode has an active countdown
     */
    async createMatch(input) {
        var _a, _b;
        const { roomCode, sponsorCode, gameId } = input;
        const winners = ((_a = input.winners) !== null && _a !== void 0 ? _a : []).filter(Boolean);
        const losers = ((_b = input.losers) !== null && _b !== void 0 ? _b : []).filter(Boolean);
        if (winners.length === 0 && losers.length === 0) {
            throw new common_1.BadRequestException('EMPTY_MATCH');
        }
        // Optional room lock
        if (roomCode) {
            const room = await this.prisma.room.findUnique({ where: { code: roomCode } });
            if (!room)
                throw new common_1.NotFoundException('ROOM_NOT_FOUND');
            if (room.startedAt && room.timerSec) {
                const endsAt = new Date(room.startedAt.getTime() + room.timerSec * 1000);
                if (new Date() < endsAt)
                    throw new common_1.ForbiddenException('RESULTS_LOCKED_UNTIL_TIMER_ENDS');
            }
        }
        // Validate sponsor (if provided)
        if (sponsorCode) {
            const s = await this.prisma.sponsor.findUnique({ where: { code: sponsorCode } });
            if (!s || !s.active)
                throw new common_1.NotFoundException('SPONSOR_NOT_FOUND_OR_INACTIVE');
            const sg = await this.prisma.sponsorGame.findUnique({
                where: { sponsorCode_gameId: { sponsorCode, gameId } },
            });
            if (!sg)
                throw new common_1.BadRequestException('GAME_NOT_SPONSORED');
        }
        // Validate users
        const ids = Array.from(new Set([...winners, ...losers]));
        if (ids.length === 0)
            throw new common_1.BadRequestException('NO_PARTICIPANTS');
        const users = await this.prisma.user.findMany({
            where: { id: { in: ids } },
            select: { id: true },
        });
        if (users.length !== ids.length)
            throw new common_1.BadRequestException('USER_NOT_FOUND');
        // stake is ALWAYS 1 now
        const N = 1;
        // Create match row for audit
        const match = await this.prisma.match.create({
            data: {
                roomCode,
                gameId,
                sponsorCode: sponsorCode !== null && sponsorCode !== void 0 ? sponsorCode : null,
                parts: {
                    create: [
                        ...winners.map((uid) => ({ userId: uid, outcome: 'WIN' })),
                        ...losers.map((uid) => ({ userId: uid, outcome: 'LOSS' })),
                    ],
                },
            },
            include: { parts: true },
        });
        // Nothing to transfer if no winners or no losers
        if (winners.length === 0 || losers.length === 0) {
            await this.prisma.timelineEvent.create({
                data: {
                    kind: 'MATCH_FINISHED',
                    roomCode: roomCode !== null && roomCode !== void 0 ? roomCode : null,
                    gameId,
                    meta: {
                        sponsorCode: sponsorCode !== null && sponsorCode !== void 0 ? sponsorCode : null,
                        winners,
                        losers,
                        stakeUnits: N,
                        transfer: 0,
                        note: 'No transfer because winners or losers are empty',
                    },
                },
            });
            return match;
        }
        // Total pearls to transfer = losers.length * 1
        const totalToTransfer = losers.length * N;
        const baseShare = Math.floor(totalToTransfer / winners.length);
        const remainder = totalToTransfer % winners.length;
        // Prepare per-winner increment map
        const incByWinner = new Map();
        winners.forEach((uid, idx) => {
            incByWinner.set(uid, baseShare + (idx < remainder ? 1 : 0));
        });
        if (!sponsorCode) {
            // ===== Global mode — permanentScore transfer =====
            await this.prisma.$transaction(async (tx) => {
                // 1) losers lose 1 each
                await tx.user.updateMany({
                    where: { id: { in: losers } },
                    data: { permanentScore: { decrement: N } },
                });
                // 2) winners receive even distribution
                for (const [uid, inc] of incByWinner.entries()) {
                    if (inc > 0) {
                        await tx.user.update({
                            where: { id: uid },
                            data: { permanentScore: { increment: inc } },
                        });
                    }
                }
                // 3) timeline
                await tx.timelineEvent.create({
                    data: {
                        kind: 'MATCH_FINISHED',
                        roomCode: roomCode !== null && roomCode !== void 0 ? roomCode : null,
                        gameId,
                        meta: {
                            mode: 'global_transfer',
                            winners,
                            losers,
                            stakeUnits: N,
                            totalTransferred: totalToTransfer,
                            distribution: Object.fromEntries(incByWinner),
                        },
                    },
                });
            });
            return match;
        }
        // ===== Sponsor mode — transfer on SponsorGameWallet =====
        await this.prisma.$transaction(async (tx) => {
            // ensure wallets
            for (const uid of ids) {
                await tx.sponsorGameWallet.upsert({
                    where: { userId_sponsorCode_gameId: { userId: uid, sponsorCode, gameId } },
                    update: {}, // if exists, keep pearls
                    create: { userId: uid, sponsorCode, gameId, pearls: 5 },
                });
            }
            // losers lose 1 each
            await tx.sponsorGameWallet.updateMany({
                where: { sponsorCode, gameId, userId: { in: losers } },
                data: { pearls: { decrement: N } },
            });
            // winners receive distribution
            for (const [uid, inc] of incByWinner.entries()) {
                if (inc > 0) {
                    await tx.sponsorGameWallet.update({
                        where: { userId_sponsorCode_gameId: { userId: uid, sponsorCode, gameId } },
                        data: { pearls: { increment: inc } },
                    });
                }
            }
            // timeline
            await tx.timelineEvent.create({
                data: {
                    kind: 'MATCH_FINISHED',
                    roomCode: roomCode !== null && roomCode !== void 0 ? roomCode : null,
                    gameId,
                    meta: {
                        sponsorCode,
                        mode: 'sponsor_transfer',
                        winners,
                        losers,
                        stakeUnits: N,
                        totalTransferred: totalToTransfer,
                        distribution: Object.fromEntries(incByWinner),
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