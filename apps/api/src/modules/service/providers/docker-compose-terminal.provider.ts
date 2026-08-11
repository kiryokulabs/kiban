import http from 'node:http';
import net from 'node:net';
import type { InstalledService } from '@kiban/core';
import type { TerminalProcess, TerminalProvider } from '../terminal/terminal.types';

export interface TerminalCommandRunner {
  createExec(containerId: string, cmd: readonly string[]): Promise<string>;
  startExec(execId: string, options: { readonly detach: boolean; readonly tty: boolean }): Promise<net.Socket>;
  resizeExec?(execId: string, cols: number, rows: number): Promise<void>;
}

const INITIAL_COLS = 120;
const INITIAL_ROWS = 40;

class DockerSocketCommandRunner implements TerminalCommandRunner {
  private readonly socketPath: string;

  public constructor(socketPath?: string) {
    this.socketPath = socketPath ?? process.env['DOCKER_SOCKET'] ?? '/var/run/docker.sock';
  }

  public async createExec(containerId: string, cmd: readonly string[]): Promise<string> {
    const body = JSON.stringify({ AttachStdin: true, AttachStdout: true, AttachStderr: true, Detach: false, Tty: true, Cmd: [...cmd] });
    const response = await this.httpRequest('POST', `/containers/${containerId}/exec`, body);
    const parsed = JSON.parse(response) as { readonly Id: string };
    return parsed.Id;
  }

  public async startExec(execId: string, options: { readonly detach: boolean; readonly tty: boolean }): Promise<net.Socket> {
    const body = JSON.stringify({ Detach: options.detach, Tty: options.tty });
    return this.rawRequest('POST', `/exec/${execId}/start`, body);
  }

  public async resizeExec(execId: string, cols: number, rows: number): Promise<void> {
    const path = `/exec/${execId}/resize?h=${rows}&w=${cols}`;
    await this.httpRequest('POST', path);
  }

  private httpRequest(method: string, path: string, body?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const headers: Record<string, string | number> = {};
      if (body) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(body);
      }
      const req = http.request({ socketPath: this.socketPath, path, method, headers }, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }

  private rawRequest(method: string, path: string, body?: string): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(this.socketPath);
      socket.setNoDelay(true);
      const headers: string[] = [
        `Host: localhost`,
        `Connection: Upgrade`,
        `Upgrade: tcp`
      ];
      if (body) {
        headers.push(`Content-Type: application/json`);
        headers.push(`Content-Length: ${Buffer.byteLength(body)}`);
      }
      const requestLine = `${method} ${path} HTTP/1.1`;
      const rawRequest = `${requestLine}\r\n${headers.join('\r\n')}\r\n\r\n${body ?? ''}`;
      socket.write(rawRequest);
      let headerBuffer = '';
      const onFirstData = (chunk: Buffer): void => {
        headerBuffer += chunk.toString();
        const headerEnd = headerBuffer.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          socket.removeListener('data', onFirstData);
          const remaining = headerBuffer.slice(headerEnd + 4);
          if (remaining.length > 0) socket.unshift(Buffer.from(remaining));
          resolve(socket);
        }
      };
      socket.on('data', onFirstData);
      socket.on('error', reject);
    });
  }
}

/** Opens shell sessions inside Docker Compose-managed runtime containers using the Docker Engine API. */
export class DockerComposeTerminalProvider implements TerminalProvider {
  public constructor(private readonly runner: TerminalCommandRunner = new DockerSocketCommandRunner()) {}

  /** Opens a shell only when the container belongs to the installed service runtime metadata. */
  public async open(service: InstalledService, containerId: string): Promise<TerminalProcess> {
    const runtime = service.runtime;
    if (!runtime || runtime['provider'] !== 'docker-compose') throw new Error('Terminal runtime is not available.');

    const container = this.findContainer(runtime, containerId);
    if (!container) throw new Error('Container does not belong to this service.');
    if (container['status'] !== 'running') throw new Error('Container is not running.');

    const execId = await this.runner.createExec(containerId, ['sh', '-l']);
    const stream = await this.runner.startExec(execId, { detach: false, tty: true });

    // Send initial terminal dimensions to the container PTY
    if (typeof this.runner.resizeExec === 'function') {
      await this.runner.resizeExec(execId, INITIAL_COLS, INITIAL_ROWS);
    }

    return this.wrapStream(stream, execId);
  }

  private wrapStream(stream: net.Socket, execId: string): TerminalProcess {
    let outputHandler: ((data: string) => void) | null = null;
    let exitHandler: ((code: number | null) => void) | null = null;

    stream.on('data', (chunk: Buffer) => { outputHandler?.(chunk.toString()); });
    stream.on('close', () => { exitHandler?.(0); });
    stream.on('error', () => { exitHandler?.(1); });

    return {
      write: (data: string): void => { stream.write(data); },
      resize: (cols: number, rows: number): void => {
        if (typeof this.runner.resizeExec === 'function') {
          void this.runner.resizeExec(execId, cols, rows);
        }
      },
      close: (): void => { stream.destroy(); },
      onData: (handler: (data: string) => void): void => { outputHandler = handler; },
      onExit: (handler: (code: number | null) => void): void => { exitHandler = handler; }
    };
  }

  private findContainer(runtime: Readonly<Record<string, unknown>>, containerId: string): Readonly<Record<string, unknown>> | null {
    const containers = runtime['containers'];
    if (!Array.isArray(containers)) return null;
    for (const container of containers) {
      if (!container || typeof container !== 'object' || Array.isArray(container)) continue;
      const record = container as Readonly<Record<string, unknown>>;
      if (record['id'] === containerId) return record;
    }
    return null;
  }
}
