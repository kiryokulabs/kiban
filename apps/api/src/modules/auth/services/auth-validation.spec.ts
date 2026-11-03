import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { parseCredentials, parsePasswordChange } from './auth-validation';

describe('Runtime authentication validation', () => {
  it.each([null, [], {}, { email: 123, password: 'password123' }, { email: 'a@b', password: 123 }, { email: 'a@b', password: ['password123'] }, { email: 'a@b', password: 'password123', role: 'admin' }, { email: 'a b@c', password: 'password123' }, { email: 'a@b', password: 'a'.repeat(1025) }, { email: 'a@b', password: '🔑'.repeat(300) }])('rejects malformed credentials with a controlled 400', (payload) => {
    expect(() => parseCredentials(payload)).toThrow(BadRequestException);
  });
  it('accepts local email domains and normalizes email without altering the password', () => {
    expect(parseCredentials({ email: ' Admin@localhost ', password: ' password ' })).toEqual({ email: 'admin@localhost', password: ' password ' });
  });
  it.each([null, {}, { currentPassword: 123, newPassword: 'password123' }, { currentPassword: 'password123', newPassword: null }, { currentPassword: 'password123', newPassword: 'short' }, { currentPassword: 'a'.repeat(1025), newPassword: 'password123' }, { currentPassword: 'password123', newPassword: 'password123', userId: 'other' }])('rejects malformed password changes', (payload) => {
    expect(() => parsePasswordChange(payload)).toThrow(BadRequestException);
  });
});
