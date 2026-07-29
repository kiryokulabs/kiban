export interface PasswordHasher {
  /** Hashes a plaintext password for storage. */
  hash(password: string): Promise<string>;
  /** Verifies a plaintext password against a stored hash. */
  verify(password: string, passwordHash: string): Promise<boolean>;
}
