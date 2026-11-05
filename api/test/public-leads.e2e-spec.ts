import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';

describe('Public Lead Inquiry E2E', () => {
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

  it('should accept valid public inquiry and return 201 Created with score', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/leads/public/apex-dental')
      .send({
        name: 'E2E Tester',
        phone: '+91 99999 11111',
        email: 'e2e.tester@example.com',
        serviceNeeded: 'comprehensive_consultation',
        budget: 80000,
        message: 'E2E inquiry message text',
      })
      .expect(201);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('leadId');
    expect(res.body).toHaveProperty('score');
  });

  it('should reject invalid email format with 400 Bad Request', async () => {
    await request(app.getHttpServer())
      .post('/api/leads/public/apex-dental')
      .send({
        name: 'Bad Email',
        phone: '+91 99999 11111',
        email: 'not-an-email',
        serviceNeeded: 'comprehensive_consultation',
        budget: 50000,
        message: 'Hello world',
      })
      .expect(400);
  });

  it('should silently handle honeypot spam trap (201 Created without persisting leadId)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/leads/public/apex-dental')
      .send({
        name: 'Spam Bot',
        phone: '+91 99999 00000',
        email: 'bot@spamdomain.com',
        serviceNeeded: 'general_inquiry',
        budget: 5000,
        message: 'Spam promotional offer',
        website: 'http://spam-site.ru', // Honeypot filled by bot
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.leadId).toBeUndefined();
  });

  it('should return 404 if client slug does not exist', async () => {
    await request(app.getHttpServer())
      .post('/api/leads/public/non-existent-slug')
      .send({
        name: 'Valid Name',
        phone: '+91 99999 11111',
        email: 'test@example.com',
        serviceNeeded: 'general_inquiry',
        budget: 10000,
        message: 'Hello test inquiry',
      })
      .expect(404);
  });
});

