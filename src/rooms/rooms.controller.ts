import { Body, Controller, Get, Param, Post, UseGuards, Req } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { ok, err } from '../common/api';
import { AuthGuard } from '@nestjs/passport';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Req() req: any, @Body() dto: CreateRoomDto) {
    try {
      const hostId = req.user.userId;
      return ok('Room created 🎮', await this.rooms.createRoom(dto.gameId, hostId));
    } catch (e: any) { return err(e?.message || 'Create failed', e?.message); }
  }

  @Get(':code')
  async get(@Param('code') code: string) {
    try {
      const room = await this.rooms.getByCode(code);
      return ok('Room fetched', room);
    } catch (e: any) { return err(e?.message || 'Room not found', e?.message || 'ROOM_NOT_FOUND'); }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('join')
  async join(@Req() req: any, @Body() dto: JoinRoomDto) {
    try {
      const userId = req.user.userId;
      return ok('Joined room 👌', await this.rooms.join(dto.code, userId));
    } catch (e: any) { return err(e?.message || 'Join failed', e?.message); }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':code/start')
  async start(@Req() req: any, @Param('code') code: string, @Body() body: { targetWinPoints?: number; allowZeroCredit?: boolean; timerSec?: number }) {
    try {
      const hostId = req.user.userId;
      return ok('Room started 🚀', await this.rooms.start(code, hostId, body || {}));
    } catch (e: any) { return err(e?.message || 'Start failed', e?.message); }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':code/stake')
  async setStake(@Req() req: any, @Param('code') code: string, @Body() body: { amount: number }) {
    try {
      const userId = req.user.userId;
      return ok('Points set 💰', await this.rooms.setStake(code, userId, Number(body.amount ?? 0)));
    } catch (e: any) { return err(e?.message || 'Set points failed', e?.message); }
  }

  // NEW — set team for a player
  @UseGuards(AuthGuard('jwt'))
  @Post(':code/team')
  async setTeam(@Req() req: any, @Param('code') code: string, @Body() b: { playerUserId: string; team: 'A'|'B' }) {
    try {
      return ok('Team set', await this.rooms.setPlayerTeam(code, req.user.userId, b.playerUserId, b.team));
    } catch (e: any) { return err(e?.message || 'Team set failed', e?.message); }
  }

  // NEW — set leader for a team
  @UseGuards(AuthGuard('jwt'))
  @Post(':code/team-leader')
  async setLeader(@Req() req: any, @Param('code') code: string, @Body() b: { team: 'A'|'B'; leaderUserId: string }) {
    try {
      return ok('Leader set', await this.rooms.setTeamLeader(code, req.user.userId, b.team, b.leaderUserId));
    } catch (e: any) { return err(e?.message || 'Leader set failed', e?.message); }
  }
}
//rooms.controller.ts