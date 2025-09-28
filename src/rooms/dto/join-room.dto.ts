import { IsString, IsNotEmpty } from 'class-validator';

export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;
}
// ممكن نضيف تحقق إن الcode والuserId موجودين في الداتا بيز
//join-room.dto.ts