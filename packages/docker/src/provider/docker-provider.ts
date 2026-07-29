export interface DockerContainerSpec { readonly name: string; readonly image: string; readonly environment?: Readonly<Record<string, string>>; readonly ports?: Readonly<Record<string, number>>; readonly volumes?: Readonly<Record<string, string>>; readonly networks?: readonly string[]; }
export interface DockerResourceReference { readonly id: string; readonly name?: string; }
export interface DockerLogOptions { readonly tail?: number; readonly since?: Date; }
export interface DockerInspection { readonly id: string; readonly name?: string; readonly status?: string; readonly raw: unknown; }

/** Boundary to Docker Engine API. Implementations must never shell out to docker CLI. */
export interface DockerProvider {
  /** Pulls an image through Docker Engine API. */
  pullImage(image: string): Promise<DockerResourceReference>;
  /** Creates a container through Docker Engine API. */
  createContainer(spec: DockerContainerSpec): Promise<DockerResourceReference>;
  /** Removes a container through Docker Engine API. */
  removeContainer(containerId: string): Promise<void>;
  /** Starts a container through Docker Engine API. */
  startContainer(containerId: string): Promise<void>;
  /** Stops a container through Docker Engine API. */
  stopContainer(containerId: string): Promise<void>;
  /** Restarts a container through Docker Engine API. */
  restartContainer(containerId: string): Promise<void>;
  /** Reads logs through Docker Engine API. */
  logs(containerId: string, options?: DockerLogOptions): AsyncIterable<string>;
  /** Inspects a Docker resource through Docker Engine API. */
  inspect(resourceId: string): Promise<DockerInspection>;
  /** Creates a Docker volume through Docker Engine API. */
  createVolume(name: string): Promise<DockerResourceReference>;
  /** Creates a Docker network through Docker Engine API. */
  createNetwork(name: string): Promise<DockerResourceReference>;
  /** Deletes a Docker network through Docker Engine API. */
  deleteNetwork(networkId: string): Promise<void>;
  /** Deletes a Docker volume through Docker Engine API. */
  deleteVolume(volumeId: string): Promise<void>;
}
