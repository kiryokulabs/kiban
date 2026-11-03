import { createServer, type Socket } from 'node:net';
import { createServer as createTlsServer, createSecureContext, TLSSocket } from 'node:tls';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import nodemailer from 'nodemailer';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NodemailerSmtpSender } from './nodemailer-smtp-sender';

const message = { to: 'admin@example.com', subject: 'Kiban SMTP test', text: 'SMTP delivery test.' };

let directory: string;
let key: Buffer;
let cert: Buffer;
beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), 'kiban-smtp-tls-'));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(directory, 'key.pem'), '-out', join(directory, 'cert.pem'), '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost'], { stdio: 'ignore' });
  key = readFileSync(join(directory, 'key.pem'));
  cert = readFileSync(join(directory, 'cert.pem'));
}, 10_000);
afterAll(() => { if (directory) rmSync(directory, { recursive: true, force: true }); });

async function smtpServer(mode: 'none' | 'tls' | 'starttls', rejectAuth = false) {
  const messages: string[] = [];
  const commands: { readonly verb: string; readonly encrypted: boolean }[] = [];
  const sockets = new Set<Socket>();
  const errors: Error[] = [];
  const attach = (socket: Socket, encrypted: boolean, greet = true): void => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', (error) => errors.push(error));
    if (greet) socket.write('220 localhost SMTP test\r\n');
    let buffer = '';
    let data: string[] | null = null;
    const receive = (chunk: Buffer): void => {
      buffer += chunk.toString('utf8');
      let newline: number;
      while ((newline = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 2);
        if (data !== null) {
          if (line === '.') { messages.push(data.join('\r\n')); data = null; socket.write('250 Message accepted\r\n'); }
          else data.push(line);
          continue;
        }
        const verb = line.split(' ')[0] ?? '';
        commands.push({ verb, encrypted });
        if (verb === 'EHLO' || verb === 'HELO') {
          socket.write(`250-localhost\r\n${mode === 'starttls' && !encrypted ? '250-STARTTLS\r\n' : ''}250 AUTH PLAIN\r\n`);
        } else if (verb === 'STARTTLS' && mode === 'starttls' && !encrypted) {
          socket.write('220 Ready for TLS\r\n');
          socket.removeListener('data', receive);
          const secure = new TLSSocket(socket, { isServer: true, secureContext: createSecureContext({ key, cert }) });
          attach(secure, true, false);
          return;
        } else if (verb === 'AUTH') socket.write(rejectAuth ? '535 Authentication rejected\r\n' : '235 Authenticated\r\n');
        else if (verb === 'MAIL' || verb === 'RCPT') socket.write('250 OK\r\n');
        else if (verb === 'DATA') { data = []; socket.write('354 End with a dot\r\n'); }
        else if (verb === 'QUIT') socket.end('221 Bye\r\n');
        else socket.write('454 Operation unavailable\r\n');
      }
    };
    socket.on('data', receive);
  };
  const server = mode === 'tls' ? createTlsServer({ key, cert }, (socket) => attach(socket, true)) : createServer((socket) => attach(socket, false));
  server.on('tlsClientError', (error: Error) => errors.push(error));
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing SMTP fixture address.');
  return { port: address.port, messages, commands, async close(): Promise<void> { for (const socket of sockets) socket.destroy(); await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); } };
}

describe('Real SMTP delivery against an isolated local server', () => {
  it('sends to an unauthenticated local relay without requiring a Kiban domain', async () => {
    const server = await smtpServer('none');
    try {
      await new NodemailerSmtpSender((options) => nodemailer.createTransport(options)).send({ host: '127.0.0.1', port: server.port, security: 'none', username: '', password: null, fromName: 'Kiban', fromEmail: 'kiban@example.com' }, message);
      expect(server.messages).toHaveLength(1);
      expect(server.messages[0]).toContain('To: admin@example.com');
      expect(server.messages[0]).toContain('Subject: Kiban SMTP test');
      expect(server.commands.some((command) => command.verb === 'AUTH')).toBe(false);
    } finally { await server.close(); }
  });

  it.each(['tls', 'starttls'] as const)('sends using %s with certificate validation and encrypted authentication', async (security) => {
    const server = await smtpServer(security);
    try {
      // Trust only the ephemeral fixture certificate, without disabling validation.
      const sender = new NodemailerSmtpSender((options) => nodemailer.createTransport({ ...options, tls: { ...options.tls, ca: cert } }));
      await sender.send({ host: '127.0.0.1', port: server.port, security, username: 'smtp-user', password: 'test-password', fromName: 'Kiban', fromEmail: 'kiban@example.com' }, message);
      expect(server.messages).toHaveLength(1);
      expect(server.commands.filter((command) => command.verb === 'AUTH')).toEqual([{ verb: 'AUTH', encrypted: true }]);
      expect(server.messages[0]).not.toContain('test-password');
    } finally { await server.close(); }
  });

  it('fails instead of downgrading when STARTTLS is unavailable', async () => {
    const server = await smtpServer('none');
    try {
      await expect(new NodemailerSmtpSender((options) => nodemailer.createTransport(options)).send({ host: '127.0.0.1', port: server.port, security: 'starttls', username: 'smtp-user', password: 'test-password', fromName: 'Kiban', fromEmail: 'kiban@example.com' }, message)).rejects.toThrow('SMTP');
      expect(server.messages).toHaveLength(0);
      expect(server.commands.some((command) => command.verb === 'AUTH')).toBe(false);
    } finally { await server.close(); }
  });

  it('rejects an untrusted SMTP certificate without sending credentials or mail', async () => {
    const server = await smtpServer('tls');
    try {
      await expect(new NodemailerSmtpSender((options) => nodemailer.createTransport(options)).send({ host: '127.0.0.1', port: server.port, security: 'tls', username: 'smtp-user', password: 'test-password', fromName: 'Kiban', fromEmail: 'kiban@example.com' }, message)).rejects.toThrow('SMTP');
      expect(server.messages).toHaveLength(0);
      expect(server.commands).toHaveLength(0);
    } finally { await server.close(); }
  });
});
