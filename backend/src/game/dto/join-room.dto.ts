import { IsString, IsNotEmpty } from 'class-validator';

export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;
}
