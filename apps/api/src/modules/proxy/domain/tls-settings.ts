/** Persisted configuration used by the shared public proxy. */
export interface TlsSettings {
  readonly acmeEmail: string | null;
  readonly useStaging: boolean;
}
