import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../../../database/database.service';

const WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_LIMIT = 10;
const IP_LIMIT = 100;

/** Persistent fixed-window limits shared by every API process using this database. */
@Injectable()
export class LoginRateLimiter {
  public constructor(private readonly database: DatabaseService) {}

  /** Counts attempts before hashing passwords; stores no raw IPs or email addresses. */
  public async consume(ip: string, email: string): Promise<void> {
    const now = Date.now();
    const ipKey = createHash('sha256').update(`ip:${ip}`).digest('hex');
    const accountKey = createHash('sha256').update(`account:${email.trim().toLowerCase()}`).digest('hex');
    const statements = [
      'BEGIN IMMEDIATE;',
      this.database.toStatement('DELETE FROM auth_login_attempts WHERE expires_at <= ?;', [now]),
      this.database.toStatement(`INSERT INTO auth_login_attempts (key, attempts, expires_at) VALUES (?, 1, ?)
        ON CONFLICT(key) DO UPDATE SET attempts = MIN(attempts + 1, 101);`, [ipKey, now + WINDOW_MS]),
      this.database.toStatement(`INSERT INTO auth_login_attempts (key, attempts, expires_at)
        SELECT ?, 1, ? WHERE (SELECT attempts FROM auth_login_attempts WHERE key = ?) <= ?
        ON CONFLICT(key) DO UPDATE SET attempts = MIN(attempts + 1, 101);`, [accountKey, now + WINDOW_MS, ipKey, IP_LIMIT]),
      this.database.toStatement('SELECT key, attempts FROM auth_login_attempts WHERE key IN (?, ?);', [ipKey, accountKey]),
      'COMMIT;'
    ];
    const counters = await this.database.all<{ readonly key: string; readonly attempts: number }>(statements.join('\n'));
    if (counters.some((counter) => counter.attempts > (counter.key === ipKey ? IP_LIMIT : ACCOUNT_LIMIT))) {
      throw new HttpException('Too many login attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
