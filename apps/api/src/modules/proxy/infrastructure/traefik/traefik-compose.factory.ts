import { stringify } from 'yaml';

const LETS_ENCRYPT_STAGING_CA = 'https://acme-staging-v02.api.letsencrypt.org/directory';

export interface TraefikComposeInput {
  readonly networkName: string;
  readonly acmeEmail: string;
  readonly acmeStoragePath: string;
  readonly useStaging?: boolean;
}

/** Builds Kiban's shared Traefik proxy compose using Coolify-style ACME defaults. */
export class TraefikComposeFactory {
  public create(input: TraefikComposeInput): string {
    const command = [
      '--ping=true',
      '--ping.entrypoint=http',
      '--api.dashboard=false',
      '--entrypoints.http.address=:80',
      '--entrypoints.https.address=:443',
      '--entrypoints.https.http3',
      '--providers.docker=true',
      '--providers.docker.exposedbydefault=false',
      `--providers.docker.network=${input.networkName}`,
      '--providers.file.directory=/traefik/dynamic/',
      '--providers.file.watch=true',
      `--certificatesresolvers.letsencrypt.acme.email=${input.acmeEmail}`,
      '--certificatesresolvers.letsencrypt.acme.httpchallenge=true',
      '--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=http',
      `--certificatesresolvers.letsencrypt.acme.storage=${input.acmeStoragePath}`
    ];

    if (input.useStaging === true) {
      command.push(`--certificatesresolvers.letsencrypt.acme.caserver=${LETS_ENCRYPT_STAGING_CA}`);
    }

    return stringify({
      services: {
        traefik: {
          image: 'traefik:v3.6',
          restart: 'unless-stopped',
          command,
          ports: ['80:80', '443:443', '443:443/udp'],
          volumes: ['/var/run/docker.sock:/var/run/docker.sock:ro', '.:/traefik'],
          networks: [input.networkName]
        }
      },
      networks: {
        [input.networkName]: { name: input.networkName, external: true }
      }
    });
  }
}
