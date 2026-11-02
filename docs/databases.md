# Database services

## Scope

Kiban runs database services on the user's own server. The current scope is
local-first storage and connections between services in the same environment.
Managed external database access is not implemented.

## Projects and environments

Each installed service belongs to an environment. Kiban currently allows one
installation of each catalog service per environment, not multiple named
instances of the same service.

```text
Project
├── Development → PostgreSQL
├── Staging     → PostgreSQL
└── Production  → PostgreSQL
```

A database server instance can contain multiple logical databases where the
engine supports them. Kiban does not currently manage those databases or their
users through a dedicated UI.

## Internal connections

Services in the same environment share the runtime network
`kiban-env-{environmentId}`. Different environments have separate networks.

Internal connections use the Compose service name and internal port:

| Engine | Internal address |
| --- | --- |
| PostgreSQL | `postgresql:5432` |
| MySQL | `mysql:3306` |
| MariaDB | `mariadb:3306` |
| MongoDB | `mongodb:27017` |
| Redis | `redis:6379` |
| Dragonfly | `dragonfly:6379` |
| Valkey | `valkey:6379` |
| TimescaleDB | `timescaledb:5432` |
| ClickHouse (native protocol) | `clickhouse:9000` |
| Neo4j | `neo4j:7687` |
| Cassandra | `cassandra:9042` |
| Memcached | `memcached:11211` |
| QuestDB (PostgreSQL wire protocol) | `questdb:8812` |

For example, a service in the same environment can connect with:

```text
postgres://USERNAME:PASSWORD@postgresql:5432/DATABASE
mysql://USERNAME:PASSWORD@mysql:3306/DATABASE
```

The consuming service must support configuring its database connection. Installing
two services in the same environment does not automatically connect them or replace
a database bundled with an application. For example, pgweb can connect to the
standalone PostgreSQL service when configured with its internal connection details.

`localhost` inside a service refers to that service's own container, not another
database service or the VPS. Internal database hostnames are not resolvable from
the user's computer, another environment, or an application hosted elsewhere.

### Connection metadata

`metadata.json` declares access point protocols, services, ports, and references
to configuration fields containing credentials. The backend generates connection
details from this metadata.

Internal connection mapping applies only to non-web access points in category
`databases`. Web access points and services in other categories retain their
existing localhost/domain routing behavior.

Connection strings are currently built generically. They do not implement every
driver's requirements: clients may need additional options such as MongoDB's
authentication database, or engine-specific authentication such as InfluxDB API
tokens. Password-only authentication must also be checked against the client's
expected URI format; copying a generic string is not a universal driver guarantee.

## Ports and web access

Database catalog templates use `expose` instead of publishing host ports with
`ports`. This avoids direct host-port exposure and collisions.

`expose` declares an internal port; it does not publish it on the server and is
not a firewall rule. Services on the same network can communicate even without
an `expose` declaration. The catalog validator and normalizer support these ports.

**Web access is separate:** HTTP interfaces and APIs declared as web access points
can still be routed through Kiban's reverse proxy. Removing host port mappings
does not make those HTTP endpoints private or add authentication. In particular,
Elasticsearch currently disables engine authentication and RavenDB allows
unsecured access. Do not assume a routed database web interface is protected.


## Configuration and credentials

Database catalog variables no longer use the `KIBAN_` prefix. Schema keys,
Compose interpolation variables, connection metadata, and healthchecks must stay
consistent so user-entered values reach the service.

Users can supply their own credentials during installation. Automatic credential
generation is deferred; catalog defaults are not unique secrets and should be
replaced before installing. The installation dialog shows a credential warning
when credential fields are present.

**Editing configuration and redeploying is not credential rotation.** Many engines
apply initialization variables only when their data directory is empty. Existing
credentials can remain unchanged even after Kiban rewrites the generated `.env`.
Kiban's displayed configuration can therefore differ from the engine's actual
credentials if those values are edited after initialization.


## Storage and health

Persistent engines declare named data volumes. Normal redeployment retains these
volumes; deleting a service is destructive and removes its volumes through the
runtime uninstall flow. Memcached is an in-memory cache without a data volume.
Volume persistence is not a database-aware backup or a durability guarantee for
every engine configuration.

All current database catalog entries declare healthchecks. Their probes are
engine-specific and indicate availability, not successful application integration,
backup recoverability, or permission correctness for every client.


## Database-related tools

These services are not database engines and live outside `catalog/databases`:

| Tool | Category and path |
| --- | --- |
| Databasus | `catalog/backup/databasus` |
| NocoDB | `catalog/productivity/nocodb` |
| pgweb | `catalog/development/pgweb` |
| Redis Commander | `catalog/development/redis-commander` |

Installing a backup tool does not implement platform-managed database backups.

## Deferred work

- External access controls and external connection strings.
- Public host/port configuration and database-protocol TLS/certificate management.
- Automatic generation of credentials respecting each field's requirements.
- Credential rotation and reconciliation with existing database users.
- Platform-managed backups, scheduling, and restore.
- Complete engine-specific connection string support and remaining patch-version pins.

An application hosted on Cloudflare or another server cannot use Kiban's internal
hostnames directly. That use case requires separately configured connectivity; it
is not currently provided by a managed external-access feature in Kiban.
