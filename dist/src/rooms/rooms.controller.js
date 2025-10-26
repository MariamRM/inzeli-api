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
exports.RoomsController = void 0;
const common_1 = require("@nestjs/common");
const rooms_service_1 = require("./rooms.service");
const create_room_dto_1 = require("./dto/create-room.dto");
const join_room_dto_1 = require("./dto/join-room.dto");
const api_1 = require("../common/api");
const passport_1 = require("@nestjs/passport");
let RoomsController = class RoomsController {
    constructor(rooms) {
        this.rooms = rooms;
    }
    async create(req, dto) {
        try {
            const hostId = req.user.userId;
            return (0, api_1.ok)('Room created 🎮', await this.rooms.createRoom(dto.gameId, hostId));
        }
        catch (e) {
            return (0, api_1.err)((e === null || e === void 0 ? void 0 : e.message) || 'Create failed', e === null || e === void 0 ? void 0 : e.message);
        }
    }
    async get(code) {
        try {
            const room = await this.rooms.getByCode(code);
            return (0, api_1.ok)('Room fetched', room);
        }
        catch (e) {
            return (0, api_1.err)((e === null || e === void 0 ? void 0 : e.message) || 'Room not found', (e === null || e === void 0 ? void 0 : e.message) || 'ROOM_NOT_FOUND');
        }
    }
    async join(req, dto) {
        try {
            const userId = req.user.userId;
            return (0, api_1.ok)('Joined room 👌', await this.rooms.join(dto.code, userId));
        }
        catch (e) {
            return (0, api_1.err)((e === null || e === void 0 ? void 0 : e.message) || 'Join failed', e === null || e === void 0 ? void 0 : e.message);
        }
    }
    async start(req, code, body) {
        try {
            const hostId = req.user.userId;
            return (0, api_1.ok)('Room started 🚀', await this.rooms.start(code, hostId, body || {}));
        }
        catch (e) {
            return (0, api_1.err)((e === null || e === void 0 ? void 0 : e.message) || 'Start failed', e === null || e === void 0 ? void 0 : e.message);
        }
    }
    async setStake(req, code, body) {
        var _a;
        try {
            const userId = req.user.userId;
            return (0, api_1.ok)('Points set 💰', await this.rooms.setStake(code, userId, Number((_a = body.amount) !== null && _a !== void 0 ? _a : 0)));
        }
        catch (e) {
            return (0, api_1.err)((e === null || e === void 0 ? void 0 : e.message) || 'Set points failed', e === null || e === void 0 ? void 0 : e.message);
        }
    }
    // NEW — set team for a player
    async setTeam(req, code, b) {
        try {
            return (0, api_1.ok)('Team set', await this.rooms.setPlayerTeam(code, req.user.userId, b.playerUserId, b.team));
        }
        catch (e) {
            return (0, api_1.err)((e === null || e === void 0 ? void 0 : e.message) || 'Team set failed', e === null || e === void 0 ? void 0 : e.message);
        }
    }
    // NEW — set leader for a team
    async setLeader(req, code, b) {
        try {
            return (0, api_1.ok)('Leader set', await this.rooms.setTeamLeader(code, req.user.userId, b.team, b.leaderUserId));
        }
        catch (e) {
            return (0, api_1.err)((e === null || e === void 0 ? void 0 : e.message) || 'Leader set failed', e === null || e === void 0 ? void 0 : e.message);
        }
    }
};
exports.RoomsController = RoomsController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_room_dto_1.CreateRoomDto]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':code'),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "get", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('join'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, join_room_dto_1.JoinRoomDto]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "join", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(':code/start'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('code')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "start", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(':code/stake'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('code')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "setStake", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(':code/team'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('code')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "setTeam", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(':code/team-leader'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('code')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "setLeader", null);
exports.RoomsController = RoomsController = __decorate([
    (0, common_1.Controller)('rooms'),
    __metadata("design:paramtypes", [rooms_service_1.RoomsService])
], RoomsController);
//rooms.controller.ts
//src/rooms/rooms.controller.ts
//# sourceMappingURL=rooms.controller.js.map