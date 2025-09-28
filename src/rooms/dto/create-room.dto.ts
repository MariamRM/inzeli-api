import { IsString, IsNotEmpty } from 'class-validator';
export class CreateRoomDto {
  @IsString() @IsNotEmpty() gameId!: string;
  @IsString() @IsNotEmpty() hostId!: string; // if using JWT guard, you can ignore body hostId
}
//create-room.dto.ts