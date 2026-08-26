# Kiban CLI

Command-line interface for managing a local Kiban installation.

## Overview

The Kiban CLI is a POSIX shell script installed at `~/.kiban/bin/kiban`. It requires no runtime dependencies beyond Docker and Docker Compose. The CLI manages the Kiban core runtime and provides visibility into installation status.

The CLI is installed automatically by the Kiban installer.

## Installation

```sh
curl -fsSL https://get.kibanos.com | sh
```

This installs the CLI at `~/.kiban/bin/kiban` and adds it to `PATH`.

By default, the installer uses the `latest` release channel from `https://get.kibanos.com/latest`. The actual installed version is resolved from the release `VERSION` asset and written to `~/.kiban/runtime/kiban/.env`.

## Commands

### kiban version

Prints the installed Kiban version.

```sh
$ kiban version
kiban <version>
```

### kiban doctor

Checks that the host meets all prerequisites for running Kiban.

Verifies:

- Docker is installed and running
- Docker Compose v2 is available
- `~/.kiban` directory exists
- Kiban core runtime is present at `~/.kiban/runtime/kiban/`

```sh
$ kiban doctor
✓ Docker installed
✓ Docker Compose v2 available
✓ Kiban directory exists
✓ Kiban runtime found
```

If any check fails, the command exits with a non-zero status and prints the failing check.

### kiban status

Shows the status of the Kiban core runtime and all installed services.

```sh
$ kiban status
Kiban core: running
  kiban-api:   running
  kiban-web:   running

Installed services: 3
  postgresql (my-project / production): running
  redis (my-project / production): running
  minio (my-project / development): stopped
```

### kiban start

Starts the Kiban core runtime (API + web UI).

```sh
$ kiban start
Starting Kiban core runtime...
kiban-api  Started
kiban-web  Started
Kiban is running at http://localhost:8080
```

If Kiban is already running, this is a no-op.

### kiban stop

Stops the Kiban core runtime. Installed services continue running independently.

```sh
$ kiban stop
Stopping Kiban core runtime...
kiban-api  Stopped
kiban-web  Stopped
```

### kiban restart

Restarts the Kiban core runtime.

```sh
$ kiban restart
Restarting Kiban core runtime...
kiban-api  Started
kiban-web  Started
```

### kiban logs

Shows recent logs from the Kiban core runtime.

```sh
$ kiban logs
# streams kiban-api and kiban-web logs
```

Supports `--tail` to control the number of lines (default: 300).

```sh
$ kiban logs --tail 50
```

### kiban update

Updates Kiban itself without removing installed services.

```sh
$ kiban update
```

For non-interactive usage:

```sh
$ kiban update --yes
```

The command checks the latest published version, downloads the new Kiban core runtime assets and CLI, updates `KIBAN_VERSION`, pulls the new Kiban runtime images and starts Kiban again.

It preserves Kiban data, configuration, plugins and installed service runtime workspaces.

The selected release channel must publish these assets before `kiban update` can work:

- `VERSION`
- `compose.yaml`
- `kiban`

For the default channel, those files are expected under `https://get.kibanos.com/latest/`.

See [`docs/release.md`](./release.md) for the full release checklist.

### kiban uninstall

Uninstalls Kiban itself without removing installed services.

```sh
$ kiban uninstall
```

For non-interactive usage:

```sh
$ kiban uninstall --yes
```

This command stops and removes the Kiban core runtime and Kiban routing layer, then removes the installed CLI script. It does **not** remove installed services or service runtime workspaces under `~/.kiban/runtime/services/`.

After uninstalling, remove the Kiban `PATH` entry from your shell profile if it is still present:

```sh
export PATH="$HOME/.kiban/bin:$PATH"
```

## File Layout

```
~/.kiban/
├── bin/
│   └── kiban              # CLI script
├── runtime/
│   ├── kiban/             # Core runtime
│   │   ├── compose.yaml
│   │   └── .env
│   ├── traefik/           # Reverse proxy
│   └── services/          # Installed services
│       └── <envId>-<serviceId>/
│           ├── compose.yaml
│           └── .env
├── config/
├── database/
├── plugins/
├── logs/
└── cache/
```

## Design Principles

- **Zero dependencies**: Only requires Docker and Docker Compose. No Node.js, no Python, no compiled binaries.
- **POSIX shell**: Portable across Linux and macOS. No bashisms.
- **Docker invisible**: The user never thinks about containers. Commands operate on "Kiban" and "services", not "containers" and "images".
- **Fail loudly**: Every failure produces a clear error message and non-zero exit code.
- **Idempotent**: Starting an already-running Kiban is safe. Stopping a stopped Kiban is safe.

## Implementation

The CLI is a single POSIX shell script. It reads configuration from `~/.kiban/runtime/kiban/.env` and delegates to `docker compose` internally.

The CLI never exposes Docker concepts to the user. All output uses Kiban terminology.

## Limitations

- Service management (install, remove, configure) is only available through the web UI.
- The CLI only manages the core runtime and provides read-only service status.
- No remote management. The CLI operates on the local machine only.
