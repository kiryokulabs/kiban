# Terminal

Interactive terminal for installed service containers. A debugging escape hatch — not a primary interface.

## Overview

The terminal allows developers to open a shell inside any running container of an installed service. It is accessible from the **Installed Service Details** page.

## Architecture

### Backend (API)

```
WebSocket (Socket.IO /terminal namespace)
         │
         ▼
TerminalGateway
         │
         ▼
TerminalSessionService
         │
         ▼
TerminalProvider (interface)
         │
         ▼
DockerComposeTerminalProvider
         │
         ▼
Docker Engine API (Unix socket)
```

#### Components

| File | Role |
|------|------|
| `apps/api/src/modules/service/terminal/terminal.gateway.ts` | NestJS WebSocket Gateway, handles `terminal:connect`, `terminal:input`, `terminal:resize`, `terminal:disconnect` |
| `apps/api/src/modules/service/terminal/terminal-session.service.ts` | Session lifecycle, idle timeout (5 min), max lifetime (30 min), container validation |
| `apps/api/src/modules/service/terminal/terminal.types.ts` | Interfaces: `TerminalProvider`, `TerminalProcess`, `TerminalSessionOptions`, `OpenTerminalRequest` |
| `apps/api/src/modules/service/providers/docker-compose-terminal.provider.ts` | Docker Engine API implementation over Unix socket |

#### Docker Engine API Flow

1. **Create exec session**
   ```
   POST /containers/{containerId}/exec
   Body: { AttachStdin: true, AttachStdout: true, AttachStderr: true, Detach: false, Tty: true, Cmd: ["sh", "-l"] }
   Response: { "Id": "exec-xxx" }
   ```

2. **Start exec (hijacked stream)**
   ```
   POST /exec/{execId}/start
   Body: { Detach: false, Tty: true }
   Headers: Connection: Upgrade, Upgrade: tcp
   Response: Raw bidirectional TCP stream (no multiplexing headers)
   ```

3. **Stream handling**
   - `stdin` → write to socket
   - `stdout`/`stderr` → read from socket
   - `close` → destroy socket

4. **Resize (implemented)**
   ```
   POST /exec/{execId}/resize?h={rows}&w={cols}
   ```
   - Called automatically after exec start with initial dimensions (120×40)
   - Called on every `terminal:resize` event from the frontend
   - Gracefully skipped if runner doesn't implement `resizeExec`

#### Session Management

- One session per WebSocket client (`socket.id`)
- Idle timeout: 5 minutes (resets on any I/O)
- Max lifetime: 30 minutes
- Container validation: container ID must exist in `service.runtime.containers` and status = `running`
- Auto-cleanup on WebSocket disconnect

#### TerminalProcess Interface

```typescript
interface TerminalProcess {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  close(): void;
  onData(handler: (data: string) => void): void;
  onExit(handler: (code: number | null) => void): void;
}
```

### Frontend (Web)

```
TerminalComponent (xterm.js)
         │
         ▼
TerminalService (injectable)
         │
         ▼
TerminalSocketSession (Socket.IO client)
         │
         ▼
WebSocket → /terminal namespace
```

#### Components

| File | Role |
|------|------|
| `apps/web/src/app/terminal/terminal.component.ts` | xterm.js canvas, FitAddon, container selector, connection status, input/output wiring |
| `apps/web/src/app/terminal/terminal.service.ts` | Angular injectable wrapper around `TerminalSocketSession` |
| `apps/web/src/app/terminal/terminal.socket-session.ts` | Socket.IO connection, state machine, reconnection logic |
| `apps/web/src/app/terminal/terminal.presenter.ts` | Friendly container names, connection state labels, container options |

#### xterm.js Integration

```typescript
const terminal = new Terminal({
  cursorBlink: true,
  convertEol: true,
  fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  fontSize: 12,
  theme: { background: '#1a1a2e', foreground: '#e5e7eb', cursor: '#e5e7eb' }
});
const fitAddon = new FitAddon();
terminal.loadAddon(fitAddon);
terminal.open(containerElement);
fitAddon.fit();

terminal.onData((data) => socket.emit('terminal:input', { data }));
terminal.onResize(({ cols, rows }) => socket.emit('terminal:resize', { cols, rows }));
```

#### Connection State Machine

```
disconnected
    │
    ▼ (user selects container)
connecting ──────► error (timeout, invalid container, Docker API error)
    │
    ▼ (terminal:connected)
connected ───────► timeout (idle 5min or max 30min)
    │
    ▼ (disconnect / terminal:exit)
disconnected
```

#### Events

| Direction | Event | Payload |
|-----------|-------|---------|
| Client → Server | `terminal:connect` | `{ serviceId, containerId }` |
| Server → Client | `terminal:connected` | `{ sessionId, serviceId, containerId }` |
| Client → Server | `terminal:input` | `{ data: string }` |
| Server → Client | `terminal:output` | `{ data: string }` |
| Client → Server | `terminal:resize` | `{ cols: number, rows: number }` |
| Server → Client | `terminal:error` | `{ message: string }` |
| Server → Client | `terminal:exit` | `{ code: number }` |
| Client → Server | `terminal:disconnect` | — |

## Usage

1. Navigate to **Installed Service Details** page
2. In the **Terminal** section, select a container from the dropdown
3. Terminal connects automatically
4. Type commands; output streams in real-time

## Supported Commands

| Category | Examples | Works? |
|----------|----------|--------|
| Line-oriented | `ls`, `cd`, `cat`, `grep`, `tail -f`, `ps`, `curl`, `wget` | ✅ Yes |
| Interactive (TUI) | `nano`, `vi`, `vim`, `htop`, `less`, `mc` | ⚠️ Depends on terminfo |
| Shell builtins | `export`, `alias`, `history` | ✅ Yes |

**TUI support depends on:**
- Container image must have `xterm` terminfo (Debian/Ubuntu: `ncurses-base`)
- Alpine/busybox images may lack terminfo — use `TERM=vt100` or install `ncurses-terminfo-base`

## Limitations

1. ~~**No resize**~~ ✅ Implemented via Docker API `POST /exec/{id}/resize`
2. **No SIGWINCH** — Terminal resize events forwarded via Docker API, not POSIX signals
3. **No terminfo guarantee** — Container may lack `xterm` terminfo entry; use Debian-based images or install `ncurses-base`
4. **Login shell only** — Uses `sh -l`; no `bash`/`zsh` unless present in image

## Future Improvements

- [x] Implement `resize` via Docker API
- [x] Send initial dimensions on exec start
- [ ] Forward `SIGWINCH` on resize (for apps that need it)
- [ ] Support `bash`/`zsh` when available
- [ ] Add copy/paste shortcuts
- [ ] Session persistence across page navigation
- [ ] Multiple concurrent sessions per container

## Security

- Container access validated against `service.runtime.containers`
- Only `running` containers accessible
- No shell interpolation — commands as argument arrays
- Unix socket access limited to Docker Engine API
- Sessions auto-expire (idle 5 min, max 30 min)
- Input/output never logged

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCKER_SOCKET` | `/var/run/docker.sock` | Docker Engine API Unix socket path |

## Testing

```bash
# API unit tests
pnpm --filter @kiban/api test

# Web unit tests
pnpm --filter @kiban/web test
```

Key test files:
- `apps/api/src/modules/service/providers/docker-compose-terminal.provider.spec.ts`
- `apps/web/src/app/terminal/terminal.presenter.spec.ts`
- `apps/web/src/app/terminal/terminal.service.spec.ts`