import type { PublicUser, User } from '@kiban/core';
import type { AuthUserDto } from '../dto/auth.dto';

/** Maps core users to safe API user DTOs. */
export const mapUserToAuthUserDto = (user: User | PublicUser): AuthUserDto => ({ id: user.id, email: user.email, role: user.role });
