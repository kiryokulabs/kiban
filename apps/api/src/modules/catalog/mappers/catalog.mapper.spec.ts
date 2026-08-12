import { describe, expect, it } from 'vitest';
import type { ServiceDefinition } from '@kiban/core';
import { mapCatalogItemToDto } from './catalog.mapper';

const definition: ServiceDefinition = {
  id: 'postgresql',
  metadata: { id: 'postgresql', name: 'PostgreSQL', description: 'Database', category: 'databases', author: 'Kiban', minimumVersion: '0.1.0', accessPoints: [] },
  composeYaml: '',
  runtime: { services: [{ name: 'postgresql', image: 'postgres', tag: '17', ports: [], environment: [], volumes: [], restart: 'unless-stopped', dependsOn: [], labels: {} }] },
  schema: {},
  icon: '<svg />',
  sourcePath: '/catalog/databases/postgresql'
};

describe('mapCatalogItemToDto', () => {
  it('exposes the primary runtime image path for catalog cards', () => {
    expect(mapCatalogItemToDto(definition, { id: 'databases', name: 'Databases' }).runtimeImage).toBe('postgres:17');
  });
});
