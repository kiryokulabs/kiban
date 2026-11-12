import type { PublicUser } from '../../domain/users/user.js';
import { ForbiddenUserActionError } from '../../domain/users/user-errors.js';
import { RuntimeImageValidationError, type RuntimeImage, type RuntimeImagesProvider } from '../../domain/runtime/runtime-image.js';

/** Separates runtime-maintenance permissions from the infrastructure implementation. */
export class RuntimeImagesManager {
  public constructor(private readonly provider: RuntimeImagesProvider) {}

  public list(): Promise<readonly RuntimeImage[]> { return this.provider.list(); }

  public async remove(actor: PublicUser, id: string, tag?: unknown): Promise<void> {
    if (actor.role !== 'admin') throw new ForbiddenUserActionError();
    if (typeof id !== 'string' || !id.trim() || id.length > 256) throw new RuntimeImageValidationError('Invalid image identifier.');
    if (tag !== undefined && (typeof tag !== 'string' || !tag || tag.length > 512 || /[\r\n\0]/.test(tag))) throw new RuntimeImageValidationError('Invalid image tag.');
    if (tag === undefined) await this.provider.remove(id);
    else await this.provider.remove(id, tag);
  }
}
