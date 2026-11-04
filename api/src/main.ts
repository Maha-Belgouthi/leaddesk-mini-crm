import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust exactly 1 proxy hop (Nginx / Docker internal network)
  app.set('trust proxy', 1);

  // Enable Cross-Origin Resource Sharing
  app.enableCors();

  // Enforce global /api prefix
  app.setGlobalPrefix('api');

  // Enforce global validation with whitelist and forbidNonWhitelisted
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configure Swagger documentation at /api/docs
  const config = new DocumentBuilder()
    .setTitle('LeadDesk Mini-CRM API')
    .setDescription('Lead & Inquiry Management API for Social Bano Technologies clients')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
}

await bootstrap();
