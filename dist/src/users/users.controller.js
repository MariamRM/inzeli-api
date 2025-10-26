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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const api_1 = require("../common/api");
let UsersController = class UsersController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    // GET /api/users/:id/stats?gameId=TREX
    async stats(id, gameId) {
        var _a, _b, _c, _d;
        // لا نستخدم Generics على $queryRawUnsafe؛ نعمل cast بعد الرجوع
        let rowsAny;
        if (gameId) {
            rowsAny = await this.prisma.$queryRawUnsafe(`
        SELECT mp."outcome", COUNT(*)::int AS cnt
        FROM "MatchParticipant" mp
        JOIN "Match" m ON m."id" = mp."matchId"
        WHERE mp."userId" = $1 AND m."gameId" = $2
        GROUP BY mp."outcome"
        `, id, gameId);
        }
        else {
            rowsAny = await this.prisma.$queryRawUnsafe(`
        SELECT mp."outcome", COUNT(*)::int AS cnt
        FROM "MatchParticipant" mp
        JOIN "Match" m ON m."id" = mp."matchId"
        WHERE mp."userId" = $1
        GROUP BY mp."outcome"
        `, id);
        }
        const rows = rowsAny;
        const wins = (_b = (_a = rows.find(r => r.outcome === 'WIN')) === null || _a === void 0 ? void 0 : _a.cnt) !== null && _b !== void 0 ? _b : 0;
        const losses = (_d = (_c = rows.find(r => r.outcome === 'LOSS')) === null || _c === void 0 ? void 0 : _c.cnt) !== null && _d !== void 0 ? _d : 0;
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            return (0, api_1.err)('USER_NOT_FOUND', 'USER_NOT_FOUND');
        return (0, api_1.ok)('User stats', {
            userId: id,
            gameId: gameId !== null && gameId !== void 0 ? gameId : null,
            wins,
            losses,
            permanentScore: user.permanentScore,
            creditPoints: user.creditPoints,
        });
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(':id/stats'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('gameId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "stats", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersController);
//users.controller.ts
//src/users/users.controller.ts
//# sourceMappingURL=users.controller.js.map