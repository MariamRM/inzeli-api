import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ أمان: يضيف هيدرات HTTP مهمة
  app.use(helmet());

  // ✅ CORS: يسمح فقط لدومين واجهتك (نتلايفاي)
  app.enableCors({
    origin: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
  });

  // ✅ كل مسارات الـ API تبدأ بـ /api
  app.setGlobalPrefix('api');

  // ✅ فالفيداشن للـ DTOs (يحذف قيم غريبة + يحوّل الأنواع)
  app.useGlobalPipes(
    new ValidationPipe({ 
      whitelist: true, 
      forbidNonWhitelisted: true, 
      transform: true 
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}`);
}
bootstrap();
//main.ts
//src/main.ts