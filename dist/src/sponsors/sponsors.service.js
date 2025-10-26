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
exports.SponsorsService = void 0;
// src/sponsors/sponsors.service.ts
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let SponsorsService = class SponsorsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    // ---------- موجودة عندك: لا تغيير ----------
    async listSponsors() {
        return this.prisma.sponsor.findMany({
            where: { active: true },
            orderBy: { name: 'asc' },
        });
    }
    // ---------- موجودة عندك: لا تغيير ----------
    async getSponsorWithGames(code) {
        const sponsor = await this.prisma.sponsor.findUnique({
            where: { code },
            include: {
                users: { select: { userId: true } },
            },
        });
        if (!sponsor)
            throw new common_1.NotFoundException('SPONSOR_NOT_FOUND');
        const games = await this.prisma.sponsorGame.findMany({
            where: { sponsorCode: code },
            include: { game: true },
            orderBy: [{ gameId: 'asc' }],
        });
        return { sponsor, games };
    }
    // ---------- موجودة عندك: لا تغيير ----------
    async joinSponsor(userId, code) {
        const s = await this.prisma.sponsor.findUnique({ where: { code } });
        if (!s || !s.active)
            throw new common_1.BadRequestException('SPONSOR_INACTIVE_OR_NOT_FOUND');
        await this.prisma.userSponsor.upsert({
            where: { userId_sponsorCode: { userId, sponsorCode: code } },
            update: {},
            create: { userId, sponsorCode: code },
        });
        const sGames = await this.prisma.sponsorGame.findMany({ where: { sponsorCode: code } });
        for (const g of sGames) {
            await this.prisma.sponsorGameWallet.upsert({
                where: { userId_sponsorCode_gameId: { userId, sponsorCode: code, gameId: g.gameId } },
                update: {},
                create: { userId, sponsorCode: code, gameId: g.gameId, pearls: 5 },
            });
        }
        return { ok: true };
    }
    // ---------- موجودة عندك: لا تغيير ----------
    async userWallets(userId, sponsorCode) {
        return this.prisma.sponsorGameWallet.findMany({
            where: { userId, sponsorCode },
            include: { game: true },
            orderBy: [{ gameId: 'asc' }],
        });
    }
    // ---------- موجودة عندك: لا تغيير ----------
    async userAllWallets(userId) {
        return this.prisma.sponsorGameWallet.findMany({
            where: { userId },
            include: { game: true, sponsor: true },
            orderBy: [{ sponsorCode: 'asc' }, { gameId: 'asc' }],
        });
    }
    // ---------- جديدة: leaderboard لكل راعٍ + لعبة ----------
    async leaderboard(sponsorCode, gameId) {
        // يرجّع [{ userId, pearls, user: { displayName, email } }, ...] مرتّبة تنازلياً
        return this.prisma.sponsorGameWallet.findMany({
            where: { sponsorCode, gameId },
            include: {
                user: { select: { id: true, displayName: true, email: true } },
            },
            orderBy: [{ pearls: 'desc' }],
            take: 100, // حدّ معقول، غيّري إذا تحتاجين
        });
    }
    // ---------- جديدة: تأكيد/إنشاء محفظة لؤلؤ للّاعب ----------
    async ensureWallet(userId, sponsorCode, gameId) {
        // تأكّد الراعي موجود وActive
        const s = await this.prisma.sponsor.findUnique({ where: { code: sponsorCode } });
        if (!s || !s.active)
            throw new common_1.NotFoundException('SPONSOR_NOT_FOUND');
        // تأكّد اللعبة مدعومة من هذا الراعي
        const sg = await this.prisma.sponsorGame.findUnique({
            where: { sponsorCode_gameId: { sponsorCode, gameId } },
        });
        if (!sg)
            throw new common_1.BadRequestException('GAME_NOT_SPONSORED');
        // تأكّد المستخدم منضم للراعي
        await this.prisma.userSponsor.upsert({
            where: { userId_sponsorCode: { userId, sponsorCode } },
            update: {},
            create: { userId, sponsorCode },
        });
        // أنشئ/أكّد المحفظة (تبدأ بـ5 إذا جديدة)
        const wallet = await this.prisma.sponsorGameWallet.upsert({
            where: { userId_sponsorCode_gameId: { userId, sponsorCode, gameId } },
            update: {}, // نترك الرصيد كما هو إذا موجودة
            create: { userId, sponsorCode, gameId, pearls: 5 },
        });
        return wallet;
    }
};
exports.SponsorsService = SponsorsService;
exports.SponsorsService = SponsorsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SponsorsService);
//sponsors.service.ts
//src/sponsors/sponsors.service.ts
//# sourceMappingURL=sponsors.service.js.map