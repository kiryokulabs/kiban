import { Injectable } from '@nestjs/common';
import type { SessionTokenService } from '@kiban/core';
import { createHash, randomBytes } from 'node:crypto';

@Injectable()
export class NodeSessionTokenService implements SessionTokenService {
  /** Creates an opaque session token for an httpOnly cookie. */
  public async createToken(): Promise<string> {
    return randomBytes(48).toString('base64url');
  }

  /** Hashes tokens before they are persisted. */
  public async hashToken(token: string): Promise<string> {
    return createHash('sha256').update(token).digest('hex');
  }
}
