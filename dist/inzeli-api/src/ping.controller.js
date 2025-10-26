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
exports.PingController = void 0;
// src/ping.controller.ts
const common_1 = require("@nestjs/common");
let PingController = class PingController {
    // GET /  -> will redirect to /api/ping if you setGlobalPrefix('api')
    root() { }
    // GET /ping  (becomes /api/ping when you use setGlobalPrefix('api'))
    ping() {
        return { ok: true, time: new Date().toISOString() };
    }
};
exports.PingController = PingController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.Redirect)('ping', 302) // 👈 relative redirect, lets Nest add the global prefix
    ,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PingController.prototype, "root", null);
__decorate([
    (0, common_1.Get)('ping'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PingController.prototype, "ping", null);
exports.PingController = PingController = __decorate([
    (0, common_1.Controller)()
], PingController);
// Note: You can test this controller by sending a GET request to the root path ("/")
// and it will redirect to "/ping", which responds with a JSON object containing the current time.
//# sourceMappingURL=ping.controller.js.map