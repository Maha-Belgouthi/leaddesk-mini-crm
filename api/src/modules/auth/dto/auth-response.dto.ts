import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/user-role.enum.js';

export class AuthUserDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ example: 'admin@leaddesk.local' })
  email: string;

  @ApiProperty({ example: 'Platform Admin' })
  fullName: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN })
  role: UserRole;

  @ApiProperty({ example: null, nullable: true })
  clientId: string | null;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'Short-lived JWT access token (15m)' })
  accessToken: string;

  @ApiProperty({ description: 'Long-lived JWT refresh token (7d)' })
  refreshToken: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}

