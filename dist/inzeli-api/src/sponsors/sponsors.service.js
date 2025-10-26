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
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let SponsorsService = class SponsorsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    // Active sponsors list
    async listSponsors() {
        return this.prisma.sponsor.findMany({
            where: { active: true },
            orderBy: { name: 'asc' },
        });
    }
    // Sponsor detail + games/prizes
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
    // Attach user to sponsor (creates UserSponsor + seed wallets if missing)
    async joinSponsor(userId, code) {
        const s = await this.prisma.sponsor.findUnique({ where: { code } });
        if (!s || !s.active)
            throw new common_1.BadRequestException('SPONSOR_INACTIVE_OR_NOT_FOUND');
        // Upsert UserSponsor
        await this.prisma.userSponsor.upsert({
            where: { userId_sponsorCode: { userId, sponsorCode: code } },
            update: {},
            create: { userId, sponsorCode: code },
        });
        // Ensure a wallet (pearls) for every sponsor game (seed 5 if new)
        const sGames = await this.prisma.sponsorGame.findMany({ where: { sponsorCode: code } });
        for (const g of sGames) {
            await this.prisma.sponsorGameWallet.upsert({
                where: {
                    userId_sponsorCode_gameId: { userId, sponsorCode: code, gameId: g.gameId },
                },
                update: {},
                create: {
                    userId,
                    sponsorCode: code,
                    gameId: g.gameId,
                    pearls: 5, // starting balance per board
                },
            });
        }
        return { ok: true };
    }
    // User wallets under a sponsor
    async userWallets(userId, sponsorCode) {
        const wallets = await this.prisma.sponsorGameWallet.findMany({
            where: { userId, sponsorCode },
            include: { game: true },
            orderBy: [{ gameId: 'asc' }],
        });
        return wallets;
    }
    // All user wallets (all sponsors)
    async userAllWallets(userId) {
        return this.prisma.sponsorGameWallet.findMany({
            where: { userId },
            include: { game: true, sponsor: true },
            orderBy: [{ sponsorCode: 'asc' }, { gameId: 'asc' }],
        });
    }
};
exports.SponsorsService = SponsorsService;
exports.SponsorsService = SponsorsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SponsorsService);
//# sourceMappingURL=sponsors.service.js.map