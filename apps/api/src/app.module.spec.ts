import { APP_GUARD } from '@nestjs/core';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { SessionAuthGuard } from './modules/auth/guards/session-auth.guard';

describe('AppModule security', () => {
  it('registers the session auth guard globally for API routes', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AppModule) as ReadonlyArray<Readonly<{ provide?: unknown; useClass?: unknown }>>;

    expect(providers).toContainEqual({ provide: APP_GUARD, useClass: SessionAuthGuard });
  });
});
