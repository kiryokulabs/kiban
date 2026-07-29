import type { PublicUser } from '@kiban/core';
import type { UserDto } from '../dto/users.dto';

/** Maps a public core user into an API DTO. */
export const mapPublicUserToDto = (user: PublicUser): UserDto => ({ id: user.id, email: user.email, role: user.role });
