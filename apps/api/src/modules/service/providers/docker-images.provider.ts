import { request as httpRequest } from 'node:http';
import { RuntimeImageConflictError, RuntimeImageInUseError, RuntimeImageNotFoundError, RuntimeImageValidationError, RuntimeImagesUnavailableError, type InstalledServiceRepository, type RuntimeImage, type RuntimeImagesProvider } from '@kiban/core';

export interface DockerImageResponse { readonly statusCode: number; readonly body: unknown; }
export type DockerImageRequest = (method: 'GET' | 'DELETE', path: string) => Promise<DockerImageResponse>;
interface ImageReferences { count: number; isKibanCore: boolean; readonly projects: Set<string>; }
const FULL_IMAGE_ID = /^sha256:[a-f0-9]{64}$/;

/** Runtime infrastructure only. Lists the entire daemon, not just Kiban workloads. */
export class DockerImagesProvider implements RuntimeImagesProvider {
  public constructor(private readonly request: DockerImageRequest, private readonly installed: Pick<InstalledServiceRepository, 'listAll'>) {}

  public async list(): Promise<readonly RuntimeImage[]> {
    const images = await this.send('GET', '/images/json?all=true');
    if (images.statusCode !== 200 || !Array.isArray(images.body)) throw this.unavailable();
    const references = await this.readReferences();
    const servicesByProject = new Map<string, { readonly id: string; readonly name: string }[]>();
    for (const service of await this.installed.listAll()) {
      const project = service.runtime?.['projectName'];
      if (service.runtime?.['provider'] !== 'docker-compose' || typeof project !== 'string' || !project) continue;
      const services = servicesByProject.get(project) ?? [];
      services.push({ id: service.id, name: service.name });
      servicesByProject.set(project, services);
    }
    return images.body.map((value: unknown) => {
      const image = this.record(value);
      const id = image['Id'];
      const tags = image['RepoTags'];
      const size = image['Size'];
      const created = image['Created'];
      if (typeof id !== 'string' || !FULL_IMAGE_ID.test(id) || typeof size !== 'number' || !Number.isSafeInteger(size) || size < 0 || typeof created !== 'number' || !Number.isFinite(created) || !Number.isFinite(new Date(created * 1000).getTime())) throw this.unavailable();
      if (tags !== null && tags !== undefined && (!Array.isArray(tags) || tags.some((tag: unknown) => typeof tag !== 'string'))) throw this.unavailable();
      const reference = references.get(id);
      const services = new Map<string, { readonly id: string; readonly name: string }>();
      for (const project of reference?.projects ?? []) {
        for (const service of servicesByProject.get(project) ?? []) services.set(service.id, service);
      }
      return { id, isKibanCore: reference?.isKibanCore ?? false, services: [...services.values()], tags: Array.isArray(tags) ? tags.filter((tag: string) => tag !== '<none>:<none>') : [], sizeBytes: size, createdAt: new Date(created * 1000), references: reference?.count ?? 0 };
    });
  }

  public async remove(id: string, tag?: string): Promise<void> {
    if (!FULL_IMAGE_ID.test(id)) throw new RuntimeImageValidationError('A full image ID is required.');
    const image = (await this.list()).find(item => item.id === id);
    if (!image) throw new RuntimeImageNotFoundError('Image not found. Refresh the list.');
    if (image.isKibanCore) throw new RuntimeImageInUseError('Required by KibanOS. Removing this image may prevent KibanOS from starting.');
    if (image.references > 0) throw new RuntimeImageInUseError('This image is referenced by an existing container, including stopped containers.');
    let target = id;
    if (tag !== undefined) {
      if (!image.tags.includes(tag)) throw new RuntimeImageConflictError('This tag no longer belongs to the selected image. Refresh the list.');
      const resolved = await this.send('GET', `/images/${encodeURIComponent(tag)}/json`);
      if (resolved.statusCode === 404) throw new RuntimeImageConflictError('The image tag no longer exists. Refresh the list.');
      if (resolved.statusCode !== 200) throw this.unavailable();
      if (this.record(resolved.body)['Id'] !== id) throw new RuntimeImageConflictError('This tag now points to a different image. Refresh the list.');
      if ((await this.readReferences()).get(id)) throw new RuntimeImageInUseError('This image is referenced by an existing container, including stopped containers.');
      target = encodeURIComponent(tag);
    }
    // Removing a tag preserves other tags; Docker still protects referenced image data.
    const response = await this.send('DELETE', `/images/${target}?force=false&noprune=true`);
    if (response.statusCode === 404) throw new RuntimeImageNotFoundError('Image no longer exists. Refresh the list.');
    if (response.statusCode === 409) throw new RuntimeImageConflictError('Docker refused deletion. The image may now be in use, have dependent images or multiple tags. No forced deletion was attempted.');
    if (response.statusCode !== 200 && response.statusCode !== 204) throw this.unavailable();
  }

  private async readReferences(): Promise<ReadonlyMap<string, ImageReferences>> {
    const response = await this.send('GET', '/containers/json?all=true');
    if (response.statusCode !== 200 || !Array.isArray(response.body)) throw this.unavailable();
    const references = new Map<string, ImageReferences>();
    for (const value of response.body) {
      const container = this.record(value);
      const id = container['ImageID'];
      if (typeof id !== 'string' || !FULL_IMAGE_ID.test(id)) throw this.unavailable();
      const reference = references.get(id) ?? { count: 0, isKibanCore: false, projects: new Set<string>() };
      reference.count += 1;
      const labels = container['Labels'];
      if (labels && typeof labels === 'object' && !Array.isArray(labels)) {
        const project = this.record(labels)['com.docker.compose.project'];
        const service = this.record(labels)['com.docker.compose.service'];
        // Internal Compose identities, not repository names, tags or versions.
        if ((project === 'kiban' && (service === 'kiban-api' || service === 'kiban-web')) || (project === 'kiban-traefik' && service === 'traefik')) reference.isKibanCore = true;
        if (typeof project === 'string' && project) reference.projects.add(project);
      }
      references.set(id, reference);
    }
    return references;
  }

  private async send(method: 'GET' | 'DELETE', path: string): Promise<DockerImageResponse> {
    try { return await this.request(method, path); }
    catch { throw this.unavailable(); }
  }

  private record(value: unknown): Readonly<Record<string, unknown>> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw this.unavailable();
    return value as Readonly<Record<string, unknown>>;
  }

  private unavailable(): RuntimeImagesUnavailableError {
    return new RuntimeImagesUnavailableError('Could not safely read or update Docker images. Check Docker availability and socket permissions.');
  }
}

/** Unix-socket transport; no shell, remote endpoint, force/prune command or caller-selected path. */
export function dockerImageRequest(method: 'GET' | 'DELETE', path: string, socketPath = process.env['DOCKER_SOCKET'] ?? '/var/run/docker.sock'): Promise<DockerImageResponse> {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ socketPath, method, path }, response => {
      const chunks: Buffer[] = [];
      let length = 0;
      response.on('data', (chunk: Buffer) => {
        length += chunk.length;
        if (length > 16 * 1024 * 1024) { req.destroy(new Error('Docker response too large.')); return; }
        chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('aborted', () => reject(new Error('Docker response interrupted.')));
      response.on('end', () => {
        try {
          const text = Buffer.concat(chunks).toString('utf8');
          const body: unknown = text ? JSON.parse(text) : null;
          resolve({ statusCode: response.statusCode ?? 0, body });
        } catch (error: unknown) { reject(error); }
      });
    });
    req.setTimeout(10_000, () => req.destroy(new Error('Docker request timed out.')));
    req.on('error', reject);
    req.end();
  });
}
