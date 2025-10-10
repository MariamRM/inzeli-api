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
    async createMatch(input) {
        var _a, _b, _c;
        const { roomCode, sponsorCode, gameId } = input;
        const winners = (_a = input.winners) !== null && _a !== void 0 ? _a : [];
        const losers = (_b = input.losers) !== null && _b !== void 0 ? _b : [];
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
        // Validate sponsor if used
        if (sponsorCode) {
            const s = await this.prisma.sponsor.findUnique({ where: { code: sponsorCode } });
            if (!s || !s.active)
                throw new common_1.NotFoundException('SPONSOR_NOT_FOUND_OR_INACTIVE');
            // تأكد أن اللعبة ضمن ألعاب الراعي (اختياري لكن منطقي)
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
        const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true } });
        if (users.length !== ids.length)
            throw new common_1.BadRequestException('USER_NOT_FOUND');
        // Clamp stakeUnits
        const N = Math.max(1, Math.min(3, Number((_c = input.stakeUnits) !== null && _c !== void 0 ? _c : 1)));
        // Always create Match row (مع ربط الراعي لو موجود) — هذا لا يغيّر الترتيب العام
        const match = await this.prisma.match.create({
            data: {
                roomCode,
                gameId,
                sponsorCode: sponsorCode !== null && sponsorCode !== void 0 ? sponsorCode : null, // keep for reporting
                parts: {
                    create: [
                        ...winners.map((uid) => ({ userId: uid, outcome: 'WIN' })),
                        ...losers.map((uid) => ({ userId: uid, outcome: 'LOSS' })),
                    ],
                },
            },
            include: { parts: true },
        });
        if (!sponsorCode) {
            // === مباراة عادية: إن كنت سابقاً تعدّل permanentScore، اتركها كما هي أو ألغها إن ما تحتاجها ===
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
                await tx.timelineEvent.create({
                    data: {
                        kind: 'MATCH_FINISHED',
                        roomCode: roomCode !== null && roomCode !== void 0 ? roomCode : null,
                        gameId,
                        meta: { winners, losers, stakeUnits: N, mode: 'global' },
                    },
                });
            });
            return match;
        }
        // === مباراة راعي: عدّل SponsorGameWallet فقط (لا تمسّ أي نقاط عامة)
        await this.prisma.$transaction(async (tx) => {
            // تأكد وجود محافظ الفائزين/الخاسرين (كل لعبة داخل الراعي تبدأ 5)
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
};
exports.MatchesService = MatchesService;
exports.MatchesService = MatchesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MatchesService);
//# sourceMappingURL=matches.service.js.map