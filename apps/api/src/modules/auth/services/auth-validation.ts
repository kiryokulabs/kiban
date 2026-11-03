import { BadRequestException } from '@nestjs/common';
import type { ChangePasswordDto, LoginDto } from '../dto/auth.dto';

function parseFields(payload: unknown, fields: readonly string[]): Readonly<Record<string, unknown>> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new BadRequestException('Invalid authentication payload.');
  const record = payload as Readonly<Record<string, unknown>>;
  if (Object.keys(record).some((key) => !fields.includes(key)) || fields.some((key) => typeof record[key] !== 'string')) {
    throw new BadRequestException('Invalid authentication payload.');
  }
  return record;
}

function password(value: unknown, minimum: number): string {
  if (typeof value !== 'string' || value.length < minimum || Buffer.byteLength(value, 'utf8') > 1024) {
    throw new BadRequestException(`Password must have at least ${minimum} characters and at most 1024 UTF-8 bytes.`);
  }
  return value;
}

/** Validates credentials at runtime, including local installation email domains. */
export function parseCredentials(payload: unknown): LoginDto {
  const fields = parseFields(payload, ['email', 'password']);
  const email = typeof fields['email'] === 'string' ? fields['email'].trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(email)) throw new BadRequestException('A valid email is required.');
  return { email, password: password(fields['password'], 8) };
}

/** Validates password changes without trusting TypeScript DTO declarations. */
export function parsePasswordChange(payload: unknown): ChangePasswordDto {
  const fields = parseFields(payload, ['currentPassword', 'newPassword']);
  return { currentPassword: password(fields['currentPassword'], 1), newPassword: password(fields['newPassword'], 8) };
}
