import type { PublicUser } from '@kiban/core';
import type { FastifyRequest } from 'fastify';

/** Identity set by the session guard after backend authentication, never taken from request data. */
export interface AuthenticatedRequest extends FastifyRequest {
  user: PublicUser;
}
