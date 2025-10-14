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
     * v1.5:
     * - stakeUnits N ∈ {1,2,3} (default 1)
     * - If sponsorCode is provided → adjust ONLY SponsorGameWallet (no global points)
     * - If sponsorCode is NOT provided → apply v1.4 quorum rule on global permanentScore:
     *      winners +N ONLY IF their team quorum is met (sum(permanentScore) ≥ team size)
     *      losers  −N always
     * - Room timer lock enforced.
     */
    async createMatch(input) {
        var _a, _b, _c, _d, _e, _f;
        const { roomCode, sponsorCode, gameId } = input;
        const winners = (_a = input.winners) !== null && _a !== void 0 ? _a : [];
        const losers = (_b = input.losers) !== null && _b !== void 0 ? _b : [];
        if (winners.length === 0 && losers.length === 0) {
            throw new common_1.BadRequestException('EMPTY_MATCH');
        }
        // Optional room lock
        let room = null;
        if (roomCode) {
            room = await this.prisma.room.findUnique({
                where: { code: roomCode },
                include: { players: { select: { userId: true, team: true } } },
            });
            if (!room)
                throw new common_1.NotFoundException('ROOM_NOT_FOUND');
            if (room.startedAt && room.timerSec) {
                const endsAt = new Date(room.startedAt.getTime() + room.timerSec * 1000);
                if (new Date() < endsAt) {
                    throw new common_1.ForbiddenException('RESULTS_LOCKED_UNTIL_TIMER_ENDS');
                }
            }
        }
        // Validate sponsor (if any)
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
        // Clamp stakeUnits → 1..3
        const N = Math.max(1, Math.min(3, Number((_c = input.stakeUnits) !== null && _c !== void 0 ? _c : 1)));
        // Create match row (keep sponsorCode if provided)
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
                        roomCode: roomCode !== null && roomCode !== void 0 ? roomCode : null,
                        gameId,
                        meta: { sponsorCode, winners, losers, stakeUnits: N, mode: 'sponsor_only' },
                    },
                });
            });
            return match;
        }
        // Non-sponsor match: apply v1.4 quorum rule to global points
        const winnersEligible = [];
        if (room) {
            // Build team map
            const teamByUser = new Map();
            for (const p of room.players) {
                teamByUser.set(p.userId, (_d = p.team) !== null && _d !== void 0 ? _d : null);
            }
            // Fetch pearls (permanentScore) for all room players
            const roomUserIds = room.players.map((p) => p.userId);
            const scores = await this.prisma.user.findMany({
                where: { id: { in: roomUserIds } },
                select: { id: true, permanentScore: true },
            });
            const scoreMap = new Map(scores.map((u) => [u.id, u.permanentScore]));
            // Sum/count per team
            const teamSum = { A: 0, B: 0 };
            const teamCount = { A: 0, B: 0 };
            for (const p of room.players) {
                const t = (_e = p.team) !== null && _e !== void 0 ? _e : null;
                if (!t)
                    continue;
                teamSum[t] += (_f = scoreMap.get(p.userId)) !== null && _f !== void 0 ? _f : 0;
                teamCount[t] += 1;
            }
            const quorumMet = {
                A: teamCount.A > 0 && teamSum.A >= teamCount.A,
                B: teamCount.B > 0 && teamSum.B >= teamCount.B,
            };
            // Eligible winners: no team → allowed, else only if team quorum met
            for (const uid of winners) {
                const t = teamByUser.get(uid);
                if (!t)
                    winnersEligible.push(uid);
                else if (quorumMet[t])
                    winnersEligible.push(uid);
            }
        }
        else {
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
                    roomCode: roomCode !== null && roomCode !== void 0 ? roomCode : null,
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
};
exports.MatchesService = MatchesService;
exports.MatchesService = MatchesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MatchesService);
//# sourceMappingURL=matches.service.js.map