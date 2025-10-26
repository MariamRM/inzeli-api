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
exports.SponsorsController = void 0;
const common_1 = require("@nestjs/common");
const sponsors_service_1 = require("./sponsors.service");
const api_1 = require("../common/api");
const passport_1 = require("@nestjs/passport");
let SponsorsController = class SponsorsController {
    constructor(sponsors) {
        this.sponsors = sponsors;
    }
    async list() {
        try {
            return (0, api_1.ok)('Sponsors', await this.sponsors.listSponsors());
        }
        catch (e) {
            return (0, api_1.err)((e === null || e === void 0 ? void 0 : e.message) || 'Failed');
        }
    }
    async detail(code) {
        try {
            return (0, api_1.ok)('Sponsor', await this.sponsors.getSponsorWithGames(code));
        }
        catch (e) {
            return (0, api_1.err)((e === null || e === void 0 ? void 0 : e.message) || 'Failed', e === null || e === void 0 ? void 0 : e.message);
        }
    }
    // Join/activate a sponsor for the current user (seeds wallets with 5 pearls)
    async join(req, code) {
        try {
            const userId = req.user.userId;
            await this.sponsors.joinSponsor(userId, code);
            return (0, api_1.ok)('Joined sponsor', { sponsorCode: code });
        }
        catch (e) {
            return (0, api_1.err)((e === null || e === void 0 ? void 0 : e.message) || 'Failed', e === null || e === void 0 ? void 0 : e.message);
        }
    }
    // Current user's wallets in one sponsor
    async myWallets(req, code) {
        try {
            const userId = req.user.userId;
            return (0, api_1.ok)('Wallets', await this.sponsors.userWallets(userId, code));
        }
        catch (e) {
            return (0, api_1.err)((e === null || e === void 0 ? void 0 : e.message) || 'Failed', e === null || e === void 0 ? void 0 : e.message);
        }
    }
    // Current user's wallets across all sponsors (optional)
    async allMyWallets(req) {
        try {
            const userId = req.user.userId;
            return (0, api_1.ok)('Wallets', await this.sponsors.userAllWallets(userId));
        }
        catch (e) {
            return (0, api_1.err)((e === null || e === void 0 ? void 0 : e.message) || 'Failed', e === null || e === void 0 ? void 0 : e.message);
        }
    }
};
exports.SponsorsController = SponsorsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SponsorsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':code'),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SponsorsController.prototype, "detail", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(':code/join'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SponsorsController.prototype, "join", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)(':code/wallets/me'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SponsorsController.prototype, "myWallets", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('wallets/me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SponsorsController.prototype, "allMyWallets", null);
exports.SponsorsController = SponsorsController = __decorate([
    (0, common_1.Controller)('sponsors'),
    __metadata("design:paramtypes", [sponsors_service_1.SponsorsService])
], SponsorsController);
//# sourceMappingURL=sponsors.controller.js.map