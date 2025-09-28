import { Module } from '@nestjs/common';
import { RoomsModule } from './rooms/rooms.module';
import { AuthModule } from './auth/auth.module';
import { MatchesModule } from './matches/matches.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [RoomsModule, AuthModule, MatchesModule, UsersModule],
})
export class AppModule {}
// src/app.module.ts