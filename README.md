# Kiban

Kiban is an open-source infrastructure platform. Developers build software; Kiban builds infrastructure.

This repository contains the v0.1 foundation: a strict clean-architecture monorepo prepared for API, web, CLI, core domain packages, Docker abstraction, and future plugins.

## Principles

- Users work with projects, services and stacks; runtime details are hidden.
- Domain and application layers depend only on interfaces.
- Docker, SQLite, NestJS and Angular are implementation details at the edges.
- No plugins are implemented in v0.1.

## License

Apache-2.0

## Local configuration

Runtime data is expected under `~/.kiban/` with `config/`, `database/`, `plugins/`, `logs/` and `cache/`. The repository includes `.kiban-template/` to document that layout without writing outside the project during development.
