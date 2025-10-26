import { Module } from '@nestjs/common';
import { SponsorsController } from './sponsors.controller';
import { SponsorsService } from './sponsors.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SponsorsController],
  providers: [SponsorsService, PrismaService],
  exports: [SponsorsService],
})
export class SponsorsModule {}
// src/sponsors/sponsors.module.ts