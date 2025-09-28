"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: ['https://unique-flan-0cc730.netlify.app'], // يسمح لأي origin أثناء التطوير
        credentials: false,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        preflightContinue: false, // Nest يرد 204 تلقائيًا
        optionsSuccessStatus: 204,
    });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(process.env.PORT || 3000);
    console.log(`API on http://localhost:${process.env.PORT || 3000}`);
}
bootstrap();
//main.ts
//# sourceMappingURL=main.js.map