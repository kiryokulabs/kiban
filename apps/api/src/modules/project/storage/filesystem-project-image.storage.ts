import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { ProjectImageData, ProjectImageStorage } from '../interfaces/project-image-storage';

const IMAGE_TYPES = [
  { contentType: 'image/png', fileName: 'image.png' },
  { contentType: 'image/jpeg', fileName: 'image.jpg' },
  { contentType: 'image/webp', fileName: 'image.webp' },
  { contentType: 'image/svg+xml', fileName: 'image.svg' }
] as const;

export class FilesystemProjectImageStorage implements ProjectImageStorage {
  public constructor(private readonly rootPath = join(homedir(), '.kiban', 'projects')) {}

  public async save(projectId: string, image: ProjectImageData): Promise<void> {
    const target = IMAGE_TYPES.find((type) => type.contentType === image.contentType);
    if (!target) throw new Error(`Unsupported project image type: ${image.contentType}`);

    const directory = this.projectDirectory(projectId);
    await fs.mkdir(directory, { recursive: true });
    await this.delete(projectId);
    await fs.writeFile(join(directory, target.fileName), image.data);
  }

  public async find(projectId: string): Promise<ProjectImageData | null> {
    for (const type of IMAGE_TYPES) {
      const path = join(this.projectDirectory(projectId), type.fileName);
      try {
        return { contentType: type.contentType, data: await fs.readFile(path) };
      } catch (error: unknown) {
        if (!this.isMissingFile(error)) throw error;
      }
    }
    return null;
  }

  public async delete(projectId: string): Promise<void> {
    await Promise.all(IMAGE_TYPES.map(async (type) => {
      try {
        await fs.rm(join(this.projectDirectory(projectId), type.fileName), { force: true });
      } catch (error: unknown) {
        if (!this.isMissingFile(error)) throw error;
      }
    }));
  }

  private projectDirectory(projectId: string): string {
    return join(this.rootPath, projectId, 'assets');
  }

  private isMissingFile(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
  }
}
