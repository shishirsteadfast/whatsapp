import { IsString, IsNotEmpty } from 'class-validator';

export class TestSendDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
