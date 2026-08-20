import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import fastifyCookie from '@fastify/cookie';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

export const API_PREFIX = 'api';
const DEFAULT_API_PORT = 3000;

export type HttpApplication = Pick<NestFastifyApplication, 'register' | 'enableCors' | 'setGlobalPrefix'>;

export async function configureHttpApplication(app: HttpApplication): Promise<void> {
  await app.register(fastifyCookie);
  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({ origin: true, credentials: true });
}

export function apiPort(env: Readonly<Record<string, string | undefined>> = process.env): number {
  const rawPort = env['KIBAN_API_PORT'] ?? env['PORT'];
  if (!rawPort) return DEFAULT_API_PORT;

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return DEFAULT_API_PORT;

  return port;
}

export async function bootstrap(): Promise<void> {
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
  await configureHttpApplication(app);
  await app.listen(apiPort(), '0.0.0.0');
}

if (typeof require !== 'undefined' && require.main === module) {
  void bootstrap();
}
