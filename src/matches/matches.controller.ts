import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { ok, err } from '../common/api';
import { AuthGuard } from '@nestjs/passport';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  /**
   * POST /api/matches
   * body:
   * {
   *   roomCode?: string,
   *   gameId: string,
   *   winners: string[],
   *   losers: string[],
   *   stakeUnits?: number // 1..3
   * }
   */
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Req() _req: any,
    @Body()
    body: {
      roomCode?: string;
      gameId: string;
      winners: string[];
      losers: string[];
      stakeUnits?: number;
    },
  ) {
    try {
      const data = await this.matches.createMatch(body);
      return ok('Match recorded', data);
    } catch (e: any) {
      return err(e?.response?.message || e?.message || 'Match failed', e?.message);
    }
  }
}
// src/matches/matches.controller.ts