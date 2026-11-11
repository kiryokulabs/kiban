import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ForbiddenUserActionError, RuntimeImageConflictError, RuntimeImageInUseError, RuntimeImageNotFoundError, RuntimeImageValidationError, RuntimeImagesUnavailableError, RuntimeImagesManager, type PublicUser } from '@kiban/core';

export const RUNTIME_IMAGES_MANAGER = Symbol('RUNTIME_IMAGES_MANAGER');

@Injectable()
export class ServerImagesService {
  public constructor(@Inject(RUNTIME_IMAGES_MANAGER) private readonly images: RuntimeImagesManager) {}

  public async list() {
    return this.execute(async () => (await this.images.list()).map(image => ({ ...image, createdAt: image.createdAt.toISOString() })));
  }

  public async remove(actor: PublicUser, id: string, tag?: unknown): Promise<void> {
    await this.execute(() => this.images.remove(actor, id, tag));
  }

  private async execute<T>(action: () => Promise<T>): Promise<T> {
    try { return await action(); }
    catch (error: unknown) {
      if (error instanceof ForbiddenUserActionError) throw new ForbiddenException('Only administrators can delete images.');
      if (error instanceof RuntimeImageValidationError) throw new BadRequestException(error.message);
      if (error instanceof RuntimeImageNotFoundError) throw new NotFoundException(error.message);
      if (error instanceof RuntimeImageInUseError || error instanceof RuntimeImageConflictError) throw new ConflictException(error.message);
      if (error instanceof RuntimeImagesUnavailableError) throw new ServiceUnavailableException(error.message);
      throw error;
    }
  }
}
