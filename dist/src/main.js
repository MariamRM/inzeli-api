"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const helmet_1 = __importDefault(require("helmet"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // ✅ أمان: يضيف هيدرات HTTP مهمة
    app.use((0, helmet_1.default)());
    // ✅ CORS: يسمح فقط لدومين واجهتك (نتلايفاي)
    app.enableCors({
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    // ✅ كل مسارات الـ API تبدأ بـ /api
    app.setGlobalPrefix('api');
    // ✅ فالفيداشن للـ DTOs (يحذف قيم غريبة + يحوّل الأنواع)
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
    }));
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`🚀 API running on http://localhost:${port}`);
}
bootstrap();
//main.ts
//src/main.ts
//# sourceMappingURL=main.js.map