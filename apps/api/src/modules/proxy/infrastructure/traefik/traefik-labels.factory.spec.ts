import { describe, expect, it } from 'vitest';
import { TraefikLabelsFactory } from './traefik-labels.factory';
import type { PublicEndpoint } from '../../domain/public-endpoint';

const endpoint: PublicEndpoint = {
  resourceId: 'installed-1',
  resourceType: 'service',
  name: 'Web UI',
  targetService: 'mongo-express',
  port: 8081,
  host: 'mongo-demo.services.example.com',
  path: '/',
  protocol: 'https',
  forceHttps: true
};

describe('TraefikLabelsFactory', () => {
  it('generates Coolify-style HTTP and HTTPS labels for an HTTPS public endpoint', () => {
    const labels = new TraefikLabelsFactory().create(endpoint, { networkName: 'kiban', certificateResolver: 'letsencrypt' });

    expect(labels['traefik.enable']).toBe('true');
    expect(labels['traefik.docker.network']).toBe('kiban');
    expect(labels['traefik.http.middlewares.redirect-to-https.redirectscheme.scheme']).toBe('https');
    expect(labels['traefik.http.routers.http-0-installed-1.rule']).toBe('Host(`mongo-demo.services.example.com`) && PathPrefix(`/`)');
    expect(labels['traefik.http.routers.http-0-installed-1.entrypoints']).toBe('http');
    expect(labels['traefik.http.routers.http-0-installed-1.middlewares']).toBe('redirect-to-https');
    expect(labels['traefik.http.routers.http-0-installed-1.service']).toBe('http-0-installed-1');
    expect(labels['traefik.http.services.http-0-installed-1.loadbalancer.server.port']).toBe('8081');
    expect(labels['traefik.http.routers.https-0-installed-1.rule']).toBe('Host(`mongo-demo.services.example.com`) && PathPrefix(`/`)');
    expect(labels['traefik.http.routers.https-0-installed-1.entrypoints']).toBe('https');
    expect(labels['traefik.http.routers.https-0-installed-1.tls']).toBe('true');
    expect(labels['traefik.http.routers.https-0-installed-1.tls.certresolver']).toBe('letsencrypt');
    expect(labels['traefik.http.routers.https-0-installed-1.service']).toBe('https-0-installed-1');
    expect(labels['traefik.http.services.https-0-installed-1.loadbalancer.server.port']).toBe('8081');
  });

  it('keeps HTTP-only endpoints on the HTTP entrypoint without TLS labels', () => {
    const labels = new TraefikLabelsFactory().create({ ...endpoint, protocol: 'http', forceHttps: false }, { networkName: 'kiban', certificateResolver: 'letsencrypt' });

    expect(labels['traefik.http.routers.http-0-installed-1.entrypoints']).toBe('http');
    expect(labels['traefik.http.routers.http-0-installed-1.middlewares']).toBeUndefined();
    expect(labels['traefik.http.routers.https-0-installed-1.tls']).toBeUndefined();
    expect(labels['traefik.http.routers.https-0-installed-1.tls.certresolver']).toBeUndefined();
  });
});
