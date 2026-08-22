## Description

<!-- What does this PR do? Why is it needed? -->

## Type of change

- [ ] Feature (new functionality)
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] Refactor (no functional change)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation
- [ ] Catalog (new or updated service)
- [ ] Other: <!-- describe -->

---

## Checklist

### Tests (TDD)

- [ ] Tests were written before production code
- [ ] New code has unit tests
- [ ] Existing tests still pass (`pnpm test`)
- [ ] Edge cases and error handling are tested

### Catalog (if adding or modifying a service)

- [ ] Service follows catalog structure (`metadata.json`, `compose.yaml`, `schema.json`, `icon.svg`)
- [ ] `pnpm dev` starts without catalog validation errors
- [ ] No hardcoded values that should come from `schema.json`
- [ ] Service name follows conventions (lowercase, hyphens, no underscores)

### Architecture

- [ ] Business logic is in the domain or application layer
- [ ] No infrastructure dependencies in domain code
- [ ] Dependencies point inward (Clean Architecture)
- [ ] No `console.log` usage (use the project logging system)

### TypeScript

- [ ] Strict mode compliance (no `any`, no unsafe casts)
- [ ] `pnpm lint` passes (type checking)

### Code quality

- [ ] Single responsibility (small methods, small classes)
- [ ] No duplication
- [ ] Public APIs are documented
- [ ] Naming describes intent

### Security (if applicable)

- [ ] No secrets in source code
- [ ] User input is validated
- [ ] No SQL injection, command injection, or XSS vectors

### Documentation

- [ ] README updated (if user-facing change)
- [ ] `docs/` updated (if architecture or API change)

---

## Screenshots / recordings

<!-- If UI changes, paste screenshots or recordings here -->

## Additional notes

<!-- Anything reviewers should know? -->
