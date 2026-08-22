# Contributing to Kiban

Thank you for your interest in contributing to Kiban.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a branch (`git checkout -b feat/my-feature`)
4. Make your changes
5. Push to your fork
6. Open a Pull Request

## Development Setup

### Requirements

- Node.js 22+
- pnpm 9.15+
- Docker and Docker Compose

### Install

```bash
git clone https://github.com/YOUR_USERNAME/kiban.git
cd kiban
pnpm install
```

### Run

```bash
pnpm dev
```

## Rules

### Commits

Follow conventional commits:

```
feat(ui): add header
fix(catalog): resolve port collision
chore: update dependencies
docs: update README
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`

Scope is optional but encouraged: `ui`, `api`, `catalog`, `core`, `cli`, etc.

### Pull Requests

- One problem per PR
- Tests must pass
- No unrelated changes
- Follow the PR template checklist

### Code Quality

- Test-driven development (tests first, then implementation)
- Clean Architecture (dependencies point inward)
- TypeScript strict mode (no `any`)
- Single responsibility (small methods, small classes)
- No `console.log` (use the project logging system)

### Catalog

If adding a new service:

- Follow the catalog structure: `metadata.json`, `compose.yaml`, `schema.json`, `icon.svg`
- Service name: lowercase, hyphens, no underscores
- No hardcoded values (use `schema.json`)
- Test that `pnpm dev` starts without catalog validation errors

## Architecture

Read [docs/architecture.md](./docs/architecture.md) before contributing.

Key principles:

- Dependencies always point inward
- Business logic never depends on infrastructure
- Docker, SQLite, NestJS and Angular are implementation details
- No plugins are implemented yet

## Code of Conduct

Follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Questions?

Open a discussion or contact https://kiryokulabs.com/contact/
