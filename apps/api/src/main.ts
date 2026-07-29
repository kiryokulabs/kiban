import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import fastifyCookie from '@fastify/cookie';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: true }));
  await app.register(fastifyCookie);
  app.enableCors({ origin: true, credentials: true });
  await app.listen(3000, '0.0.0.0');
}

void bootstrap();
