import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap() {
  if ((process.env.DATABASE_TYPE || 'postgres') === 'sqljs') {
    mkdirSync(dirname(process.env.DATABASE_FILE || './data/standalone.sqlite'), { recursive: true });
  }
  mkdirSync(process.env.UPLOAD_DIR || './uploads', { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  app.useStaticAssets(resolve(config.get<string>('UPLOAD_DIR', './uploads')), { prefix: '/uploads/' });

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN') || true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = config.get<number>('PORT') || 3000;
  await app.listen(port);
}

bootstrap();
