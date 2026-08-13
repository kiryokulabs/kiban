/**
 * Catalog Invariant Suite — Phase 8
 *
 * Loads the entire service catalog once via CatalogLoader and asserts
 * generic structural invariants that EVERY service must satisfy.
 *
 * Design rules:
 *  - No per-service hard-coded expectations. Tests describe what a VALID
 *    catalog service looks like, not what a specific service contains.
 *  - One `it()` per invariant — fine-grained failures, clear diagnostics.
 *  - The catalog is loaded once in `beforeAll`. A CatalogValidationError
 *    surfaced there means the catalog itself is broken, not the tests.
 */

import { basename, dirname, join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { CatalogValidationError } from '@kiban/core';
import type { ServiceDefinition } from '@kiban/core';
import { CatalogLoader } from './loader/catalog.loader';

const CATALOG_ROOT = join(__dirname, '..', '..', '..', '..', '..', 'catalog');

const allEnvironmentKeys = (def: ServiceDefinition): ReadonlySet<string> =>
  new Set(def.runtime.services.flatMap((svc) => svc.environment.flatMap((e) => [
    e.key,
    e.sourceVariableName,
    ...(e.sourceVariableNames ?? [])
  ].filter((key): key is string => key !== undefined))));

describe('Catalog invariants', () => {
  let catalog: readonly ServiceDefinition[] = [];

  beforeAll(async () => {
    try {
      catalog = await CatalogLoader.fromRoot(CATALOG_ROOT).load();
    } catch (error) {
      if (error instanceof CatalogValidationError) {
        const report = error.issues
          .map((issue) => `  • [${issue.service}] ${issue.file}: ${issue.reason}`)
          .join('\n');
        throw new Error(`Catalog failed to load — fix these issues first:\n${report}`);
      }
      throw error;
    }
  });

  // ── Identity ────────────────────────────────────────────────────────────────

  it('every service has a non-empty id', () => {
    for (const def of catalog) {
      expect(def.id.length, `definition id must be non-empty (${def.sourcePath})`).toBeGreaterThan(0);
      expect(def.metadata.id.length, `metadata.id must be non-empty (${def.id})`).toBeGreaterThan(0);
    }
  });

  it('every service id matches its folder name', () => {
    for (const def of catalog) {
      expect(def.id, `id must match folder for ${def.sourcePath}`).toBe(basename(def.sourcePath));
      expect(def.metadata.id, `metadata.id must match folder for ${def.sourcePath}`).toBe(basename(def.sourcePath));
    }
  });

  it('every service id is unique across the catalog', () => {
    const seen = new Map<string, string>();
    for (const def of catalog) {
      const prev = seen.get(def.id);
      expect(prev, `duplicate id "${def.id}" (also at "${prev ?? ''}")`).toBeUndefined();
      seen.set(def.id, def.sourcePath);
    }
  });

  it('every service has a non-empty name and description', () => {
    for (const def of catalog) {
      expect(def.metadata.name.length, `${def.id}: name must be non-empty`).toBeGreaterThan(0);
      expect(def.metadata.description.length, `${def.id}: description must be non-empty`).toBeGreaterThan(0);
    }
  });

  it('every service has a non-empty author and minimumVersion', () => {
    for (const def of catalog) {
      expect(def.metadata.author.length, `${def.id}: author must be non-empty`).toBeGreaterThan(0);
      expect(def.metadata.minimumVersion.length, `${def.id}: minimumVersion must be non-empty`).toBeGreaterThan(0);
    }
  });

  // ── Category ────────────────────────────────────────────────────────────────

  it('every service has a non-empty category', () => {
    for (const def of catalog) {
      expect(def.metadata.category.length, `${def.id}: category must be non-empty`).toBeGreaterThan(0);
    }
  });

  it('every service category matches the parent folder name', () => {
    for (const def of catalog) {
      expect(def.metadata.category, `${def.id}: category does not match parent folder`).toBe(basename(dirname(def.sourcePath)));
    }
  });

  // ── AccessPoints ────────────────────────────────────────────────────────────

  it('every accessPoint has non-empty name, kind, service and a positive integer port', () => {
    for (const def of catalog) {
      for (const ap of def.metadata.accessPoints) {
        const ctx = `${def.id} → "${ap.name}"`;
        expect(ap.name.length, `${ctx}: name must be non-empty`).toBeGreaterThan(0);
        expect(ap.kind.length, `${ctx}: kind must be non-empty`).toBeGreaterThan(0);
        expect(ap.service.length, `${ctx}: service must be non-empty`).toBeGreaterThan(0);
        expect(ap.port, `${ctx}: port must be a positive integer`).toBeGreaterThan(0);
        expect(Number.isInteger(ap.port), `${ctx}: port must be an integer`).toBe(true);
      }
    }
  });

  it('every accessPoint.service references a real compose service', () => {
    for (const def of catalog) {
      const names = new Set(def.runtime.services.map((s) => s.name));
      for (const ap of def.metadata.accessPoints) {
        expect(names.has(ap.service), `${def.id} → "${ap.name}": unknown compose service "${ap.service}"`).toBe(true);
      }
    }
  });

  it('every accessPoint.port is exposed by its compose service', () => {
    for (const def of catalog) {
      for (const ap of def.metadata.accessPoints) {
        const svc = def.runtime.services.find((s) => s.name === ap.service);
        if (svc === undefined) continue;
        const ports = new Set(svc.ports.map((p) => p.port));
        expect(ports.has(ap.port), `${def.id} → "${ap.name}": port ${ap.port} not exposed by "${ap.service}"`).toBe(true);
      }
    }
  });

  it('every accessPoint.connection (if present) has only non-empty string values', () => {
    for (const def of catalog) {
      for (const ap of def.metadata.accessPoints) {
        if (ap.connection === undefined) continue;
        const ctx = `${def.id} → "${ap.name}" → connection`;
        const { username, password, database } = ap.connection;
        if (username !== undefined) { expect(typeof username, `${ctx}.username`).toBe('string'); expect(username.length, `${ctx}.username non-empty`).toBeGreaterThan(0); }
        if (password !== undefined) { expect(typeof password, `${ctx}.password`).toBe('string'); expect(password.length, `${ctx}.password non-empty`).toBeGreaterThan(0); }
        if (database !== undefined) { expect(typeof database, `${ctx}.database`).toBe('string'); expect(database.length, `${ctx}.database non-empty`).toBeGreaterThan(0); }
      }
    }
  });

  it('no two accessPoints share the same name within a service', () => {
    for (const def of catalog) {
      const seen = new Set<string>();
      for (const ap of def.metadata.accessPoints) {
        expect(seen.has(ap.name), `${def.id}: duplicate accessPoint name "${ap.name}"`).toBe(false);
        seen.add(ap.name);
      }
    }
  });

  // ── Runtime ─────────────────────────────────────────────────────────────────

  it('every service has at least one compose service', () => {
    for (const def of catalog) {
      expect(def.runtime.services.length, `${def.id}: runtime must have at least one compose service`).toBeGreaterThan(0);
    }
  });

  it('every compose service has a non-empty image', () => {
    for (const def of catalog) {
      for (const svc of def.runtime.services) {
        expect(svc.image.length, `${def.id} → "${svc.name}": image must be non-empty`).toBeGreaterThan(0);
      }
    }
  });

  it('every compose service port has a positive integer and valid protocol', () => {
    for (const def of catalog) {
      for (const svc of def.runtime.services) {
        for (const rp of svc.ports) {
          const ctx = `${def.id} → "${svc.name}" → port ${rp.port}`;
          expect(rp.port, `${ctx}: must be positive`).toBeGreaterThan(0);
          expect(Number.isInteger(rp.port), `${ctx}: must be integer`).toBe(true);
          expect(['tcp', 'udp'] as ReadonlyArray<string>, `${ctx}: protocol must be tcp or udp`).toContain(rp.protocol);
        }
      }
    }
  });

  // ── Schema ──────────────────────────────────────────────────────────────────

  it('every schema property key exists in the compose environment', () => {
    for (const def of catalog) {
      const rawProps: unknown = def.schema['properties'];
      if (rawProps === undefined || rawProps === null || typeof rawProps !== 'object' || Array.isArray(rawProps)) continue;
      const keys = Object.keys(rawProps as Record<string, unknown>);
      if (keys.length === 0) continue;
      const envKeys = allEnvironmentKeys(def);
      for (const key of keys) {
        expect(envKeys.has(key), `${def.id}: schema field "${key}" not in compose environment`).toBe(true);
      }
    }
  });

  // ── Freeze ───────────────────────────────────────────────────────────────────

  it('every definition is deeply frozen', () => {
    for (const def of catalog) {
      expect(Object.isFrozen(def), `${def.id}: definition must be frozen`).toBe(true);
      expect(Object.isFrozen(def.metadata), `${def.id}: metadata must be frozen`).toBe(true);
      expect(Object.isFrozen(def.metadata.accessPoints), `${def.id}: accessPoints must be frozen`).toBe(true);
      expect(Object.isFrozen(def.runtime), `${def.id}: runtime must be frozen`).toBe(true);
      expect(Object.isFrozen(def.runtime.services), `${def.id}: runtime.services must be frozen`).toBe(true);
      for (const ap of def.metadata.accessPoints) {
        expect(Object.isFrozen(ap), `${def.id} → "${ap.name}": accessPoint must be frozen`).toBe(true);
      }
      for (const svc of def.runtime.services) {
        expect(Object.isFrozen(svc), `${def.id} → "${svc.name}": service must be frozen`).toBe(true);
      }
    }
  });

  // ── Catalog totals ───────────────────────────────────────────────────────────

  it('catalog has at least 40 services', () => {
    expect(catalog.length).toBeGreaterThanOrEqual(40);
  });

  it('catalog spans multiple categories', () => {
    const categories = new Set(catalog.map((def) => def.metadata.category));
    expect(categories.size).toBeGreaterThan(1);
  });
});
