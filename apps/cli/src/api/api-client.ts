export interface ApiClientOptions { readonly baseUrl: string; }

/** Thin HTTP client boundary; the CLI must only communicate with Kiban API. */
export class ApiClient {
  public constructor(private readonly options: ApiClientOptions) {}

  /** Returns the configured API base URL. */
  public baseUrl(): string { return this.options.baseUrl; }
}
