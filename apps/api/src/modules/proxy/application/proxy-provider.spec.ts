import { describe, expect, it } from 'vitest';
import type { PublicEndpoint } from '../domain/public-endpoint';
import { TraefikProxyProvider } from '../infrastructure/traefik/traefik-proxy.provider';

const endpoint: PublicEndpoint = {
  resourceId: 'app-1',
  resourceType: 'application',
  name: 'Web',
  targetService: 'web',
  port: 3000,
  host: 'app.example.com',
  path: '/',
  protocol: 'https',
  forceHttps: true
};

describe('TraefikProxyProvider', () => {
  it('translates a public endpoint into Traefik labels', () => {
    const provider = new TraefikProxyProvider();

    const labels = provider.labelsFor(endpoint, { networkName: 'kiban', certificateResolver: 'letsencrypt' });

    expect(labels['traefik.enable']).toBe('true');
    expect(labels['traefik.http.routers.https-0-app-1.tls.certresolver']).toBe('letsencrypt');
    expect(labels['traefik.http.services.https-0-app-1.loadbalancer.server.port']).toBe('3000');
  });

  it('creates the shared proxy compose with supplied TLS settings', () => {
    const provider = new TraefikProxyProvider();

    const compose = provider.composeYaml({ acmeEmail: 'ops@example.com', useStaging: true });

    expect(compose).toContain('--certificatesresolvers.letsencrypt.acme.email=ops@example.com');
    expect(compose).toContain('acme-staging-v02.api.letsencrypt.org/directory');
  });
});
