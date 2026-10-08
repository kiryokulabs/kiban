export interface ProjectImageData {
  readonly contentType: string;
  readonly data: Buffer;
}

export interface ProjectImageStorage {
  save(projectId: string, image: ProjectImageData): Promise<void>;
  find(projectId: string): Promise<ProjectImageData | null>;
  delete(projectId: string): Promise<void>;
}

export const PROJECT_IMAGE_STORAGE = Symbol('PROJECT_IMAGE_STORAGE');
