export interface SessionTokenService {
  /** Creates a high-entropy opaque session token. */
  createToken(): Promise<string>;
  /** Hashes an opaque token before persistence. */
  hashToken(token: string): Promise<string>;
}
