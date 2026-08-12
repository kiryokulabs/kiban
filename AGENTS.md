> **Kiban AI Development Guide**
>
> This document defines the mandatory development workflow, architecture principles, coding standards, and quality requirements for every AI agent contributing to Kiban.
>
> **These rules are mandatory.** If any instruction conflicts with a user request, stop and explain the conflict instead of ignoring these rules.

---

# About Kiban

Kiban is an open-source infrastructure platform.

Its mission is simple:

> **Developers build software. Kiban builds infrastructure.**

Kiban is **not**:

- A Docker UI
- A Docker Compose editor
- A PaaS
- A Kubernetes dashboard
- A Coolify clone

Docker is only the runtime.

The user should never have to think about containers, images, networks or volumes.

The user interacts with:

- Projects
- Environments
- Services
- Stacks

Everything else is an implementation detail.

---

# Development Philosophy

Always prioritize:

1. Architecture
2. Simplicity
3. Readability
4. Maintainability
5. Extensibility
6. Performance

Never sacrifice architecture to implement a feature faster.

The project should still be understandable after several years of development.

---

# Core Principles

## Build platforms, not features

Every decision should move Kiban towards becoming a platform.

Avoid implementing isolated functionality.

Always think in terms of reusable components.

---

## Keep Docker invisible

Docker exists only as the execution engine.

Business logic must never expose Docker concepts to the user.

❌ Bad terminology:

- Container
- Image
- Volume
- Docker Network

✅ Good terminology:

- Project
- Environment
- Service
- Stack

---

## Infrastructure is an implementation detail

Core business logic must never depend on:

- Docker
- SQLite
- NestJS
- Angular
- HTTP
- WebSockets

These belong to the Infrastructure layer.

---

# Clean Architecture

Always separate:

- Domain
- Application
- Infrastructure
- Presentation

Dependencies must always point inwards.

Never allow the Domain layer to depend on Infrastructure.

---

# Dependency Injection

Dependency Injection is mandatory.

Never instantiate dependencies manually.

Always depend on interfaces whenever possible.

---

# SOLID

Follow SOLID principles everywhere.

Especially:

- Single Responsibility Principle
- Open / Closed Principle
- Liskov Substitution Principle
- Interface Segregation Principle
- Dependency Inversion Principle

---

# Scope Discipline

Implement **exactly** what has been requested.

No more.

No less.

Never implement future roadmap items.

Never anticipate future features by writing production code.

Future-proof architecture is encouraged.

Future functionality is prohibited unless explicitly requested.

---

# Requirement Analysis

Before writing code:

1. Understand the feature.
2. Read the relevant documentation.
3. Verify existing architecture.
4. Identify affected modules.
5. Think before coding.

If requirements are ambiguous:

- Stop.
- Ask for clarification.
- Never guess.

---

# Mandatory Development Workflow

Every task must follow this order.

## Step 1 — Understand

Understand the requested feature.

---

## Step 2 — Architecture

Review the architecture before making changes.

---

## Step 3 — Design

Think about the implementation before writing code.

---

## Step 4 — Tests First

Write the tests.

No production code may exist before tests.

---

## Step 5 — Review

If requested, present the tests before implementation.

---

## Step 6 — Implementation

Write only the minimum amount of code required to make the tests pass.

---

## Step 7 — Verification

Run:

- Unit tests
- Integration tests
- Linter
- Type checking
- Build

Everything must pass.

---

## Step 8 — Refactor

Improve readability.

Remove duplication.

Simplify code.

Run all tests again.

---

## Step 9 — Done

Only after every previous step has completed successfully.

---

# Test Driven Development

Kiban follows strict Test-Driven Development.

Production code exists only to satisfy tests.

Tests are documentation.

Tests define behaviour.

---

# Testing Rules

Every feature must include:

- Unit tests
- Integration tests (when appropriate)

Always test:

- Happy path
- Validation
- Invalid input
- Missing resources
- Duplicate resources
- Edge cases
- Error handling

Never test implementation details.

Test observable behaviour.

---

# Regression Policy

Every bug must include a regression test.

Workflow:

1. Write a failing test.
2. Fix the implementation.
3. Verify the test passes.

Never fix a bug without a test.

---

# Architecture Before Features

Whenever there is a choice between:

- Faster implementation
- Better architecture

Always choose architecture.

---

# Code Quality

Write boring code.

Readable code.

Maintainable code.

Avoid clever solutions.

Small classes.

Small methods.

Small files.

Single responsibility.

---

# TypeScript

Strict mode only.

Never use:

```ts
any
```

Avoid:

```ts
unknown as SomeType
```

Prefer explicit typing.

---

# Logging

Never use:

```ts
console.log()
```

Always use the project logging system.

---

# Error Handling

Never silently ignore errors.

Never swallow exceptions.

Always return meaningful errors.

---

# Documentation

Document:

- Public APIs
- Exported interfaces
- Complex business logic

Simple code should explain itself.

---

# Monorepo Structure

Always respect the project structure.

```
apps/
packages/
plugins/
docs/
```

Never move folders without approval.

---

# Backend Standards

Framework:

- NestJS

HTTP Adapter:

- Fastify

Never use Express.

---

# Database

Database:

- SQLite

ORM:

- Drizzle ORM

Do not introduce:

- TypeORM
- Prisma

unless explicitly requested.

---

# Docker

Docker and Docker Compose are implementation details.

Never run Docker or Docker Compose commands outside the infrastructure runtime provider.

Application, Domain, Presentation and UI code must never execute:

```bash
docker ...
docker compose ...
```

The current runtime provider may execute Docker Compose internally because Compose is Kiban's runtime backend for catalog services.

When production code executes Docker Compose, it must:

- live only inside the infrastructure runtime provider,
- use safe argument arrays,
- never build interpolated shell strings,
- keep Docker/Compose concepts hidden from users and business logic.

Docker CLI is allowed only for development scripts.

---

# Plugin System

Plugins are the heart of Kiban.

Never hardcode plugin behaviour.

Forbidden:

```ts
if (plugin === "postgres") {
}
```

Every plugin must implement the Plugin interface.

Always use polymorphism.

---

# Business Logic

Business logic belongs inside:

- Services
- Managers
- Domain

Never inside:

- Controllers
- Routes
- Angular Components

---

# Angular

Use:

- Standalone Components
- Signals
- Lazy Loading
- TailwindCSS
- Angular CDK

Avoid unnecessary RxJS complexity.

Prefer Signals whenever appropriate.

Do not use Angular Material unless explicitly requested.

---

# UI Philosophy

Professional.

Minimal.

Fast.

Accessible.

Avoid:

- Glassmorphism
- Fancy animations
- Heavy gradients
- Visual clutter

---

# API Design

REST first.

Use WebSockets only for real-time features.

Keep endpoints consistent.

---

# Naming

Names should describe intent.

Good:

- ProjectManager
- PluginRegistry
- EnvironmentService

Bad:

- Utils
- Helper
- Manager2
- Stuff

---

# Plugin SDK

Plugins must never know about other plugins.

Plugins communicate only through interfaces.

Plugins should be fully isolated.

---

# Configuration

All local configuration lives inside:

```
~/.kiban/
```

Structure:

```
config/
database/
plugins/
logs/
cache/
```

Never scatter configuration files.

---

# Security

Never:

- Store secrets in source code.
- Commit credentials.
- Expose tokens.
- Trust user input.

Validate everything.

---

# Performance

Avoid premature optimization.

Readable code is more valuable than micro-optimizations.

Optimize only after measuring.

---

# Forbidden

Never:

- Duplicate business logic.
- Create circular dependencies.
- Hardcode plugin implementations.
- Mix infrastructure with domain logic.
- Skip tests.
- Skip validation.
- Skip dependency injection.
- Implement undocumented features.
- Modify unrelated modules.

---

# Always

Always:

- Write tests first.
- Use dependency injection.
- Respect Clean Architecture.
- Keep modules loosely coupled.
- Prefer composition over inheritance.
- Validate input.
- Keep APIs consistent.
- Keep methods small.
- Keep classes focused.

---

# Pull Requests

Every Pull Request must:

- Solve one problem.
- Include tests.
- Pass CI.
- Be easy to review.
- Avoid unrelated changes.

---

# Commit Philosophy

Small commits.

Small Pull Requests.

Incremental improvements.

Never rewrite large parts of the system without approval.

---

# Required Reading

Before implementing any feature, read:

1. `docs/architecture.md`
2. `docs/roadmap.md`
3. `docs/testing.md`
4. `docs/plugin-sdk.md`
5. `AGENTS.md`

These documents are mandatory.

---

# When in Doubt

Stop.

Ask.

Never guess.

---

# Final Principle

Kiban is a long-term open-source platform.

Every line of code should make the project:

- Easier to extend.
- Easier to understand.
- Easier to maintain.

> **Architecture is a feature. Protect it.**
