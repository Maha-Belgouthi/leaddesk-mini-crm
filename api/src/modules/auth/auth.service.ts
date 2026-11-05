import { createHash, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import { User } from '../users/entities/user.entity.js';
import { LoginDto, RefreshTokenDto, AuthResponseDto } from './dto/index.js';
import type { JwtConfig } from '../../config/jwt.config.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  clientId: string | null;
}

export interface RefreshJwtPayload {
  sub: string;
  jti?: string;
}

@Injectable()
export class AuthService {
  private readonly jwtConfig: JwtConfig;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtConfig = this.configService.getOrThrow<JwtConfig>('jwt');
  }

  /**
   * Hashes plain-text password with bcrypt (10 rounds)
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compares plain-text password with stored bcrypt hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generates SHA-256 digest of refresh token string.
   * Cryptographically immune to bcrypt's 72-byte truncation limit on long JWT tokens.
   */
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Authenticates user with email and password, rotating their refresh token
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmailWithPassword(
      loginDto.email.toLowerCase().trim(),
    );

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is inactive. Contact your administrator.');
    }

    const isPasswordValid = await this.comparePassword(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user);

    // Store SHA-256 hash of refresh token for rotation and revocation tracking
    const hashedRefreshToken = this.hashRefreshToken(tokens.refreshToken);
    await this.usersService.updateRefreshTokenHash(user.id, hashedRefreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        clientId: user.clientId,
      },
    };
  }

  /**
   * Rotates JWT tokens using single-use refresh token.
   * Detects reuse and validates token freshness.
   */
  async refresh(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: RefreshJwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshJwtPayload>(
        refreshTokenDto.refreshToken,
        {
          secret: this.jwtConfig.refreshSecret,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findByIdWithRefreshToken(payload.sub);

    if (!user || !user.refreshTokenHash || !user.isActive) {
      throw new UnauthorizedException('Session invalid or revoked');
    }

    const hashedIncomingToken = this.hashRefreshToken(
      refreshTokenDto.refreshToken,
    );

    if (hashedIncomingToken !== user.refreshTokenHash) {
      // Possible reuse attack: revoke existing session
      await this.usersService.updateRefreshTokenHash(user.id, null);
      throw new UnauthorizedException(
        'Refresh token has been reused or invalidated. Please login again.',
      );
    }

    // Issue brand new token pair (refresh rotation)
    const tokens = await this.generateTokens(user);
    const newHash = this.hashRefreshToken(tokens.refreshToken);
    await this.usersService.updateRefreshTokenHash(user.id, newHash);

    return tokens;
  }

  /**
   * Revokes refresh token on user logout
   */
  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshTokenHash(userId, null);
  }

  /**
   * Generates both Access and Refresh JWT tokens
   */
  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      clientId: user.clientId,
    };

    const refreshPayload: RefreshJwtPayload = {
      sub: user.id,
      jti: randomUUID(),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.jwtConfig.accessSecret,
        expiresIn: this.jwtConfig.accessExpiration as any,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.jwtConfig.refreshSecret,
        expiresIn: this.jwtConfig.refreshExpiration as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
