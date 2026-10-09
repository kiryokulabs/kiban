import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import type { ProjectImageData, ProjectImageStorage } from '../interfaces/project-image-storage';

const PROJECT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const IMAGE_TYPES = [
  { contentType: 'image/png', fileName: 'image.png' },
  { contentType: 'image/jpeg', fileName: 'image.jpg' },
  { contentType: 'image/webp', fileName: 'image.webp' },
  { contentType: 'image/svg+xml', fileName: 'image.svg' }
] as const;

export class FilesystemProjectImageStorage implements ProjectImageStorage {
  public constructor(private readonly rootPath = resolve(homedir(), '.kiban', 'projects')) {}

  public async save(projectId: string, image: ProjectImageData): Promise<void> {
    const target = IMAGE_TYPES.find((type) => type.contentType === image.contentType);
    if (!target) throw new Error(`Unsupported project image type: ${image.contentType}`);

    await this.delete(projectId);
    const directory = this.projectAssetsDirectory(projectId);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(resolve(directory, target.fileName), image.data);
  }

  public async find(projectId: string): Promise<ProjectImageData | null> {
    for (const type of IMAGE_TYPES) {
      const path = resolve(this.projectAssetsDirectory(projectId), type.fileName);
      try {
        return { contentType: type.contentType, data: await fs.readFile(path) };
      } catch (error: unknown) {
        if (!this.isMissingFile(error)) throw error;
      }
    }
    return null;
  }

  public async delete(projectId: string): Promise<void> {
    try {
      await fs.rm(this.projectDirectory(projectId), { recursive: true, force: true });
    } catch (error: unknown) {
      if (!this.isMissingFile(error)) throw error;
    }
  }

  private projectAssetsDirectory(projectId: string): string {
    return resolve(this.projectDirectory(projectId), 'assets');
  }

  private projectDirectory(projectId: string): string {
    if (!PROJECT_ID_PATTERN.test(projectId)) throw new Error('Invalid project id');

    const directory = resolve(this.rootPath, projectId);
    const rootPrefix = `${this.rootPath}/`;
    if (!directory.startsWith(rootPrefix)) throw new Error('Invalid project image path');

    return directory;
  }

  private isMissingFile(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
  }
}
