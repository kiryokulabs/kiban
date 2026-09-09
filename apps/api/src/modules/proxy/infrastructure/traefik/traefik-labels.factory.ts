import type { PublicEndpoint } from '../../domain/public-endpoint';
import type { TlsPolicy } from '../../domain/tls-policy';

const labelSafe = (value: string): string => {
  const normalized = value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'resource';
};

/** Converts public endpoints into Traefik Docker labels. */
export class TraefikLabelsFactory {
  public create(endpoint: PublicEndpoint, policy: TlsPolicy): Record<string, string> {
    const labels: Record<string, string> = {
      'traefik.enable': 'true',
      'traefik.docker.network': policy.networkName
    };

    const resourceId = labelSafe(endpoint.resourceId);
    const path = endpoint.path && endpoint.path.length > 0 ? endpoint.path : '/';
    const rule = `Host(\`${endpoint.host}\`) && PathPrefix(\`${path}\`)`;
    const httpRouter = `http-0-${resourceId}`;

    labels['traefik.http.routers.' + httpRouter + '.rule'] = rule;
    labels['traefik.http.routers.' + httpRouter + '.entrypoints'] = 'http';
    labels['traefik.http.routers.' + httpRouter + '.service'] = httpRouter;
    labels['traefik.http.services.' + httpRouter + '.loadbalancer.server.port'] = String(endpoint.port);

    if (endpoint.protocol === 'https') {
      const httpsRouter = `https-0-${resourceId}`;
      labels['traefik.http.middlewares.redirect-to-https.redirectscheme.scheme'] = 'https';
      if (endpoint.forceHttps) labels['traefik.http.routers.' + httpRouter + '.middlewares'] = 'redirect-to-https';
      labels['traefik.http.routers.' + httpsRouter + '.rule'] = rule;
      labels['traefik.http.routers.' + httpsRouter + '.entrypoints'] = 'https';
      labels['traefik.http.routers.' + httpsRouter + '.service'] = httpsRouter;
      labels['traefik.http.routers.' + httpsRouter + '.tls'] = 'true';
      labels['traefik.http.routers.' + httpsRouter + '.tls.certresolver'] = policy.certificateResolver;
      labels['traefik.http.services.' + httpsRouter + '.loadbalancer.server.port'] = String(endpoint.port);
    }

    return labels;
  }
}
