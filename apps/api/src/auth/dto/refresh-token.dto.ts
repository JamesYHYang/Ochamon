import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'Refresh token is required' })
  refreshToken: string;
}
