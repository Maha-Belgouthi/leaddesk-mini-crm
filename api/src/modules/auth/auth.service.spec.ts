import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import type { User } from '../users/entities/user.entity.js';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUsersService: any;
  let mockJwtService: any;
  let mockConfigService: any;

  const mockUser: Partial<User> = {
    id: 'user-uuid-1234',
    email: 'admin@leaddesk.local',
    fullName: 'System Administrator',
    role: UserRole.ADMIN,
    clientId: null,
    isActive: true,
    passwordHash: '',
    refreshTokenHash: null,
  };

  beforeEach(async () => {
    // Generate valid bcrypt hash for test password 'Admin@123'
    const passwordHash = await new AuthService(
      {} as any,
      {} as any,
      { getOrThrow: () => ({ accessSecret: 'a', refreshSecret: 'b', accessExpiration: '15m', refreshExpiration: '7d' }) } as any,
    ).hashPassword('Admin@123');

    mockUser.passwordHash = passwordHash;

    mockUsersService = {
      findByEmailWithPassword: vi.fn(),
      findByIdWithRefreshToken: vi.fn(),
      updateRefreshTokenHash: vi.fn().mockResolvedValue(undefined),
    };

    mockJwtService = {
      signAsync: vi.fn().mockImplementation((payload) => {
        return Promise.resolve(`signed_token_for_${payload.sub}`);
      }),
      verifyAsync: vi.fn(),
    };

    mockConfigService = {
      getOrThrow: vi.fn().mockReturnValue({
        accessSecret: 'test_access_secret_min_32_characters_123',
        refreshSecret: 'test_refresh_secret_min_32_characters_123',
        accessExpiration: '15m',
        refreshExpiration: '7d',
      }),
    };

    authService = new AuthService(
      mockUsersService,
      mockJwtService,
      mockConfigService,
    );
  });

  describe('Password Hashing & Comparison', () => {
    it('should hash password and verify matching plain password', async () => {
      const plain = 'SecretPassword99!';
      const hash = await authService.hashPassword(plain);

      expect(hash).not.toBe(plain);
      const isMatch = await authService.comparePassword(plain, hash);
      expect(isMatch).toBe(true);

      const isWrong = await authService.comparePassword('WrongPassword', hash);
      expect(isWrong).toBe(false);
    });
  });

  describe('SHA-256 Refresh Token Hashing', () => {
    it('should generate deterministic 64-char hex SHA-256 digest', () => {
      const token = 'jwt.refresh.token.string.here';
      const hash1 = authService.hashRefreshToken(token);
      const hash2 = authService.hashRefreshToken(token);

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);

      const differentHash = authService.hashRefreshToken(token + '_modified');
      expect(hash1).not.toBe(differentHash);
    });
  });

  describe('login()', () => {
    it('should throw UnauthorizedException when email is not found', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'unknown@leaddesk.local', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when account is inactive', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        authService.login({ email: 'admin@leaddesk.local', password: 'Admin@123' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);

      await expect(
        authService.login({ email: 'admin@leaddesk.local', password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should authenticate, return tokens, and store SHA-256 hash of refresh token', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);

      const result = await authService.login({
        email: 'ADMIN@leaddesk.local ',
        password: 'Admin@123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('admin@leaddesk.local');
      expect(result.user.role).toBe(UserRole.ADMIN);
      expect(mockUsersService.updateRefreshTokenHash).toHaveBeenCalledWith(
        mockUser.id,
        authService.hashRefreshToken(result.refreshToken),
      );
    });
  });

  describe('refresh()', () => {
    it('should throw UnauthorizedException when refresh token verification fails', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(
        authService.refresh({ refreshToken: 'expired_or_invalid_token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should detect token reuse and clear stored hash on mismatch', async () => {
      const incomingToken = 'stolen_or_reused_token';
      mockJwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id });
      mockUsersService.findByIdWithRefreshToken.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: 'previously_saved_different_hash',
      });

      await expect(
        authService.refresh({ refreshToken: incomingToken }),
      ).rejects.toThrow(UnauthorizedException);

      // Verify the session was revoked due to reuse detection
      expect(mockUsersService.updateRefreshTokenHash).toHaveBeenCalledWith(
        mockUser.id,
        null,
      );
    });

    it('should rotate tokens and update stored hash when refresh token is valid', async () => {
      const validToken = 'valid_active_token';
      const validHash = authService.hashRefreshToken(validToken);

      mockJwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id });
      mockUsersService.findByIdWithRefreshToken.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: validHash,
      });

      const result = await authService.refresh({ refreshToken: validToken });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockUsersService.updateRefreshTokenHash).toHaveBeenCalledWith(
        mockUser.id,
        authService.hashRefreshToken(result.refreshToken),
      );
    });
  });

  describe('logout()', () => {
    it('should clear refresh token hash in database', async () => {
      await authService.logout('user-uuid-1234');
      expect(mockUsersService.updateRefreshTokenHash).toHaveBeenCalledWith(
        'user-uuid-1234',
        null,
      );
    });
  });
});

