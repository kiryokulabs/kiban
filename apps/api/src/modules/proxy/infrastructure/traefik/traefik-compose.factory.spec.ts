import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { TraefikComposeFactory } from './traefik-compose.factory';

describe('TraefikComposeFactory', () => {
  it('generates a Coolify-style Traefik proxy with ACME HTTP-01 enabled by default', () => {
    const yaml = new TraefikComposeFactory().create({ networkName: 'kiban', acmeEmail: 'admin@example.com', acmeStoragePath: '/traefik/acme.json' });
    const document = parse(yaml) as { services: { traefik: { image: string; ports: string[]; volumes: string[]; command: string[] } }; networks: Record<string, unknown> };

    expect(document.services.traefik.image).toBe('traefik:v3.6');
    expect(document.services.traefik.ports).toContain('80:80');
    expect(document.services.traefik.ports).toContain('443:443');
    expect(document.services.traefik.ports).toContain('443:443/udp');
    expect(document.services.traefik.volumes).toContain('/var/run/docker.sock:/var/run/docker.sock:ro');
    expect(document.services.traefik.volumes).toContain('.:/traefik');
    expect(document.services.traefik.command).toContain('--providers.docker=true');
    expect(document.services.traefik.command).toContain('--providers.docker.exposedbydefault=false');
    expect(document.services.traefik.command).toContain('--providers.docker.network=kiban');
    expect(document.services.traefik.command).toContain('--providers.file.directory=/traefik/dynamic/');
    expect(document.services.traefik.command).toContain('--providers.file.watch=true');
    expect(document.services.traefik.command).toContain('--certificatesresolvers.letsencrypt.acme.email=admin@example.com');
    expect(document.services.traefik.command).toContain('--certificatesresolvers.letsencrypt.acme.httpchallenge=true');
    expect(document.services.traefik.command).toContain('--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=http');
    expect(document.services.traefik.command).toContain('--certificatesresolvers.letsencrypt.acme.storage=/traefik/acme.json');
    expect(document.networks.kiban).toEqual({ name: 'kiban', external: true });
  });

  it('can use Let’s Encrypt staging to avoid rate limits during VPS tests', () => {
    const yaml = new TraefikComposeFactory().create({ networkName: 'kiban', acmeEmail: 'admin@example.com', acmeStoragePath: '/traefik/acme.json', useStaging: true });
    const document = parse(yaml) as { services: { traefik: { command: string[] } } };

    expect(document.services.traefik.command).toContain('--certificatesresolvers.letsencrypt.acme.caserver=https://acme-staging-v02.api.letsencrypt.org/directory');
  });
});
