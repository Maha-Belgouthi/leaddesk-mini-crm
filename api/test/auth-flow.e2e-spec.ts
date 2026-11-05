import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';

describe('Auth Flow & Scoping E2E', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  let accessToken: string;
  let refreshToken: string;

  it('should reject invalid credentials with 401 Unauthorized', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@leaddesk.local',
        password: 'WrongPassword999!',
      })
      .expect(401);
  });

  it('should authenticate seeded admin user and return token pair (200 OK)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@leaddesk.local',
        password: 'Admin@123456',
      })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).toHaveProperty('email', 'admin@leaddesk.local');
    expect(res.body.user).toHaveProperty('role', 'ADMIN');

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('should access protected profile /api/auth/me with Bearer token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('email', 'admin@leaddesk.local');
    expect(res.body).toHaveProperty('role', 'ADMIN');
  });

  it('should reject unauthenticated request to /api/auth/me with 401', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .expect(401);
  });

  it('should successfully rotate tokens via /api/auth/refresh', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.refreshToken).not.toBe(refreshToken); // Rotated!

    // Update tokens for subsequent checks
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('should logout and revoke session via /api/auth/logout', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    // Old refresh token should now fail
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});

