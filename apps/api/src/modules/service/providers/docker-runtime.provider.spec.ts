import { describe, expect, it } from 'vitest';
import type { CatalogItem, Environment, InstallationPlan } from '@kiban/core';
import { DockerRuntimeProvider, type DockerEngineClient } from './docker-runtime.provider';

const serviceDefinition: CatalogItem = {
  id: 'test-service', name: 'Test Service', description: 'Test', version: '1.0.0', author: 'Kiban', category: { id: 'test', name: 'Test' },
  metadata: { id: 'test-service', name: 'Test Service', description: 'Test', version: '1.0.0', author: 'Kiban', category: 'test', minimumVersion: '0.1.0', docker: { image: 'test/image', tag: '1' }, ports: [{ name: 'http', port: 8080, protocol: 'tcp', public: true }], volumes: [{ name: 'data', mountPath: '/data', persistent: true }] },
  compose: 'services:\n  test:\n    image: test/image:1\n', schema: { type: 'object', properties: {} }, icon: '<svg></svg>', sourcePath: '/catalog/test/test-service'
};
const environment: Environment = { id: 'env-1', projectId: 'project-1', name: 'Development', slug: 'development', type: 'system', description: null, createdAt: new Date('2026-07-30T10:00:00.000Z'), updatedAt: new Date('2026-07-30T10:00:00.000Z') };
const plan: InstallationPlan = { serviceDefinition, environment, variables: { PASSWORD: 'secret' }, ports: serviceDefinition.metadata.ports ?? [], volumes: serviceDefinition.metadata.volumes ?? [], networks: [] };

class FakeDockerClient implements DockerEngineClient {
  public readonly calls: string[] = [];
  public available = true;
  public async ping(): Promise<boolean> { this.calls.push('ping'); return this.available; }
  public async version(): Promise<{ readonly Version?: string; readonly ApiVersion?: string; readonly MinAPIVersion?: string }> { this.calls.push('version'); return { Version: '29.0.0', ApiVersion: '1.55', MinAPIVersion: '1.40' }; }
  public async inspectImage(): Promise<boolean> { this.calls.push('inspectImage'); return false; }
  public async pullImage(): Promise<void> { this.calls.push('pullImage'); }
  public async ensureNetwork(): Promise<string> { this.calls.push('ensureNetwork'); return 'network-1'; }
  public async ensureVolume(): Promise<string> { this.calls.push('ensureVolume'); return 'volume-1'; }
  public async createContainer(): Promise<string> { this.calls.push('createContainer'); return 'container-1'; }
  public async startContainer(): Promise<void> { this.calls.push('startContainer'); }
  public async inspectContainer(): Promise<Readonly<Record<string, unknown>>> { this.calls.push('inspectContainer'); return { Id: 'container-1', State: { Running: true, Health: { Status: 'healthy' } }, NetworkSettings: { Ports: { '8080/tcp': [{ HostIp: '0.0.0.0', HostPort: '49153' }] } }, Created: '2026-07-30T10:00:00.000Z' }; }
  public async stopContainer(): Promise<void> { this.calls.push('stopContainer'); }
  public async restartContainer(): Promise<void> { this.calls.push('restartContainer'); }
  public async removeContainer(id: string): Promise<void> { this.calls.push(`removeContainer:${id}`); }
  public async logs(): Promise<string> { this.calls.push('logs'); return 'logs'; }
}

describe('DockerRuntimeProvider', () => {
  it('reports diagnostics from the Docker Engine API', async () => {
    const client = new FakeDockerClient();
    const provider = DockerRuntimeProvider.withClient(client);

    await expect(provider.diagnostics()).resolves.toMatchObject({ dockerInstalled: true, dockerRunning: true, socketReachable: true, availableRuntimes: ['docker'] });
  });

  it('blocks installation when Docker is unavailable', async () => {
    const client = new FakeDockerClient();
    client.available = false;
    const provider = DockerRuntimeProvider.withClient(client);

    await expect(provider.install(plan)).rejects.toThrow('Docker runtime is not available.');
  });

  it('pulls image, creates network, volume, container, starts it and returns runtime metadata', async () => {
    const client = new FakeDockerClient();
    const provider = DockerRuntimeProvider.withClient(client);

    const result = await provider.install(plan);

    expect(client.calls).toEqual(['ping', 'inspectImage', 'pullImage', 'ensureNetwork', 'ensureVolume', 'createContainer', 'startContainer', 'inspectContainer']);
    expect(result).toMatchObject({ status: 'running', runtime: { provider: 'docker', containerId: 'container-1', image: 'test/image', imageTag: '1' } });
  });



  it('reuses an existing network when Docker reports a create race', async () => {
    class ExistingNetworkClient extends FakeDockerClient {
      private inspected = false;
      public override async ensureNetwork(): Promise<string> {
        this.calls.push('ensureNetwork');
        if (!this.inspected) {
          this.inspected = true;
          return 'network-existing';
        }
        return 'network-existing';
      }
    }
    const client = new ExistingNetworkClient();
    const provider = DockerRuntimeProvider.withClient(client);

    await expect(provider.install(plan)).resolves.toMatchObject({ status: 'running', runtime: { networkIds: ['network-existing'] } });
  });



  it('removes containers by deterministic name when runtime metadata is missing', async () => {
    const client = new FakeDockerClient();
    const provider = DockerRuntimeProvider.withClient(client);

    await provider.uninstall({ id: 'installed-1', environmentId: 'env-1', serviceId: 'test-service', name: 'Test Service', status: 'running', configuration: {}, runtime: null, createdAt: new Date(), updatedAt: new Date() });

    expect(client.calls).toContain('removeContainer:kiban-env-1-test-service');
  });

  it('marks installation as failed when health check fails', async () => {
    class UnhealthyDockerClient extends FakeDockerClient { public override async inspectContainer(): Promise<Readonly<Record<string, unknown>>> { return { Id: 'container-1', State: { Running: true, Health: { Status: 'unhealthy' } }, NetworkSettings: { Ports: {} } }; } }
    const provider = DockerRuntimeProvider.withClient(new UnhealthyDockerClient());

    await expect(provider.install(plan)).resolves.toMatchObject({ status: 'failed' });
  });
});
