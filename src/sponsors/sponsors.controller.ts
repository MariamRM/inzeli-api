// src/sponsors/sponsors.controller.ts
import { Controller, Get, Param, Post, UseGuards, Req } from '@nestjs/common';
import { SponsorsService } from './sponsors.service';
import { ok, err } from '../common/api';
import { AuthGuard } from '@nestjs/passport';

@Controller('sponsors')
export class SponsorsController {
  constructor(private readonly sponsors: SponsorsService) {}

  @Get()
  async list() {
    try {
      return ok('Sponsors', await this.sponsors.listSponsors());
    } catch (e: any) {
      return err(e?.message || 'Failed');
    }
  }

  @Get(':code')
  async detail(@Param('code') code: string) {
    try {
      return ok('Sponsor', await this.sponsors.getSponsorWithGames(code));
    } catch (e: any) {
      return err(e?.message || 'Failed', e?.message);
    }
  }

  // Join/activate a sponsor for the current user (seeds wallets with 5 pearls)
  @UseGuards(AuthGuard('jwt'))
  @Post(':code/join')
  async join(@Req() req: any, @Param('code') code: string) {
    try {
      const userId = req.user.userId;
      await this.sponsors.joinSponsor(userId, code);
      return ok('Joined sponsor', { sponsorCode: code });
    } catch (e: any) {
      return err(e?.message || 'Failed', e?.message);
    }
  }

  // Current user's wallets in one sponsor
  @UseGuards(AuthGuard('jwt'))
  @Get(':code/wallets/me')
  async myWallets(@Req() req: any, @Param('code') code: string) {
    try {
      const userId = req.user.userId;
      return ok('Wallets', await this.sponsors.userWallets(userId, code));
    } catch (e: any) {
      return err(e?.message || 'Failed', e?.message);
    }
  }

  // All user wallets (all sponsors)
  @UseGuards(AuthGuard('jwt'))
  @Get('wallets/me')
  async allMyWallets(@Req() req: any) {
    try {
      const userId = req.user.userId;
      return ok('Wallets', await this.sponsors.userAllWallets(userId));
    } catch (e: any) {
      return err(e?.message || 'Failed', e?.message);
    }
  }
}
//sponsors.controller.ts
//src/sponsors/sponsors.controller.ts