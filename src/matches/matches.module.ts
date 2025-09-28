import { Module } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [MatchesService, PrismaService],
  controllers: [MatchesController],
})
export class MatchesModule {}
// src/matches/matches.module.ts