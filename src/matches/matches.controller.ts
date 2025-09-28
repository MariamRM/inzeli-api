import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { ok, err } from '../common/api';
import { AuthGuard } from '@nestjs/passport';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Req() req: any, @Body() body: { roomCode?: string; gameId: string; winners: string[]; losers: string[] }) {
    try {
      return ok('Match recorded', await this.matches.createMatch(body));
    } catch (e: any) {
      return err(e?.response?.message || e?.message || 'Match failed', e?.message);
    }
  }
}
// src/matches/matches.controller.ts