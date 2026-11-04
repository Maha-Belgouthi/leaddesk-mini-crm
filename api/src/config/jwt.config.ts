import { registerAs } from '@nestjs/config';

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiration: string;
  refreshExpiration: string;
}

export default registerAs(
  'jwt',
  (): JwtConfig => ({
    accessSecret:
      process.env.JWT_ACCESS_SECRET ??
      'default_dev_access_secret_min_32_characters_long_12345',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ??
      'default_dev_refresh_secret_min_32_characters_long_12345',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION ?? '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION ?? '7d',
  }),
);

