export type PublicResourceType = 'kiban-instance' | 'service' | 'application' | 'preview';

/** Describes a public HTTP endpoint without coupling resources to a proxy implementation. */
export interface PublicEndpoint {
  readonly resourceId: string;
  readonly resourceType: PublicResourceType;
  readonly name: string;
  readonly targetService: string;
  readonly port: number;
  readonly host: string;
  readonly path?: string;
  readonly protocol: 'http' | 'https';
  readonly forceHttps: boolean;
}
