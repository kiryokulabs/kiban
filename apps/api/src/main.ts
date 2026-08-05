import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import fastifyCookie from '@fastify/cookie';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // Phase 4: Catalog validation gate — refuse to start when any catalog file is invalid.
  const { CatalogLoader } = await import('./modules/catalog/loader/catalog.loader');
  const { CatalogValidationError } = await import('@kiban/core');
  const { formatCatalogReport } = await import('./modules/catalog/catalog-boot');

  const loader = CatalogLoader.fromWorkspace();
  try {
    await loader.load();
  } catch (error: unknown) {
    if (error instanceof CatalogValidationError) {
      process.stderr.write(formatCatalogReport(error.issues));
      process.exit(1);
    }
    throw error;
  }

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: true }));
  await app.register(fastifyCookie);
  app.enableCors({ origin: true, credentials: true });
  await app.listen(3000, '0.0.0.0');
}

void bootstrap();
