"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SponsorsModule = void 0;
const common_1 = require("@nestjs/common");
const sponsors_controller_1 = require("./sponsors.controller");
const sponsors_service_1 = require("./sponsors.service");
const prisma_service_1 = require("../prisma.service");
let SponsorsModule = class SponsorsModule {
};
exports.SponsorsModule = SponsorsModule;
exports.SponsorsModule = SponsorsModule = __decorate([
    (0, common_1.Module)({
        controllers: [sponsors_controller_1.SponsorsController],
        providers: [sponsors_service_1.SponsorsService, prisma_service_1.PrismaService],
        exports: [sponsors_service_1.SponsorsService],
    })
], SponsorsModule);
// src/sponsors/sponsors.module.ts
//# sourceMappingURL=sponsors.module.js.map