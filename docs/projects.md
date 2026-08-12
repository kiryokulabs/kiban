# Projects & Environments

Projects are the primary entity in Kiban. A project represents an application or software system.

Examples:

- CrossMetrics
- Personal Website
- CRM
- Monitoring Stack
- AI Playground

A project does not contain services directly. A project contains environments.

## Environments

An environment represents isolated infrastructure for a project.

Each environment is designed to own its own future resources:

- Services
- Secrets
- Variables
- Networks
- Volumes
- Logs
- Backups

These resources are intentionally not implemented yet.

## Default environments

Every new project automatically receives exactly three system environments:

1. Development
2. Staging
3. Production

They are created atomically with the project. If environment creation fails, the project creation is rolled back.

## Environment types

| Type | Description |
| --- | --- |
| `system` | Created automatically by Kiban. |
| `custom` | Reserved for future user-created environments. |

Users can create custom environments. Only custom environments can be deleted. System environments — Development, Staging and Production — cannot be deleted.

## API endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/projects` | List all projects. |
| `GET` | `/projects/:id` | Get one project including environments. |
| `POST` | `/projects` | Create a project with default environments. |
| `PATCH` | `/projects/:id` | Update project name and description. |
| `DELETE` | `/projects/:id` | Delete project and environments. |
| `GET` | `/projects/:id/environments` | List environments for a project. |
| `POST` | `/projects/:id/environments` | Create a custom environment. |
| `DELETE` | `/projects/:id/environments/:environmentId` | Delete a custom environment. |

## Validation

Project names:

- Cannot be empty.
- Cannot be longer than 100 characters.
- Do not need to be unique.

Request payloads reject unknown fields.

## UI

The Projects section includes:

- Project list.
- Empty state.
- Create project modal.
- Edit project modal.
- Delete action.
- Project details page.
- Environment cards for Development, Staging and Production.

Each environment card currently shows status `Empty` and placeholders for future sections:

- Services
- Secrets
- Variables
- Backups
- Logs

### Installed Service Details

The Installed Service Details page includes:

- Overview (status, health, location, installed date)
- Runtime errors (if any)
- Access points (web URLs, database connections)
- Configuration (schema-driven form)
- Actions (start, stop, restart, recreate, delete)
- **Terminal** (interactive shell in service containers)
- Logs (with auto-refresh)
- Runtime units (containers with status/health badges)
- Persistent data (volumes)

## Destructive actions

Project deletion asks for browser confirmation before calling the API because deleting a project also deletes all environments.
