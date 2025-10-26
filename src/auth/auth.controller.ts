import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { ok, err } from '../common/api';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    try { return ok('Account created 🎉', await this.auth.register(dto)); }
    catch (e: any) { return err(e?.response?.message || 'Registration failed', e?.response?.message); }
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    try { return ok('Signed in ✅', await this.auth.login(dto)); }
    catch { return err('Invalid email or password', 'INVALID_CREDENTIALS'); }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Req() req: any) {
    return ok('Profile', await this.auth.getProfile(req.user.userId));
  }
}
//auth.controller.ts 
//src/auth/auth.controller.ts