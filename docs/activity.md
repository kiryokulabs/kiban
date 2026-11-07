# Recent activity

The Dashboard's right column shows the five newest successful operations through
`GET /api/activity`. Both authenticated administrators and operators can read it.
It is operational history, not a security audit log or an online presence indicator.

The sidebar **Events** entry opens `/events` by default. Button-style navigation switches
between that retained history and **Logs** at `/events/logs`; the old `/logs` URL redirects
to the latter. Both views remain available to all authenticated users. The technical logs
keep their existing data source and controls; they are not mixed into operational events.

`GET /api/activity/history?page=1` returns `{ items, page, hasMore, total }`, with 10 items per
page. The page number must be an integer from 1 to 100, matching the 1,000-event retention
cap. A missing page defaults to 1. Invalid pages return 400, anonymous requests return 401.
The newest-five dashboard endpoint is unchanged. Pagination changes only the API request,
not the browser URL: the Events page remains `/events` without page query parameters.
The history footer shows the current retained-event total across all pages, not a lifetime
count. The dashboard activity footer links to `/events`.

## Events

- Projects: created, updated (name/description), deleted.
- Environments: created, updated, deleted.
- Services: installed, started, stopped, restarted, redeployed, deleted.
- Saving service configuration and the existing Recreate action both count as redeployed.

Only explicit user actions through Kiban are recorded. Default environments created with
a project and environments removed with a project do not produce extra events. Reads,
background health refreshes, domain settings and external changes are not recorded.
Failed operations, including runtime results with failed status, do not produce success
entries. Completion of an operation is not a guarantee of subsequent service health.

## Storage and safety

One auxiliary SQLite table, `activity_events`, stores event IDs/types/timestamps,
backend-authenticated user ID/email and resource/project/environment ID/name snapshots.
No request body, service configuration, credentials, session tokens or runtime logs are
stored. The table has no cascading resource foreign keys: snapshots remain readable after
renaming or deleting accounts/resources. The existing session guard provides the actor;
request parameters cannot choose an event author.

Insertion and trimming retain the newest 1,000 events in a single transaction. Reads
always return at most five, ordered by completion timestamp with insertion order as a tie
breaker. There is no client-controlled page size, filtering or live subscription. History uses
simple offset pagination; new activity arriving between requests may shift page boundaries.
The page loads activity on opening; timestamps use the browser's local timezone. Old
operations are not backfilled.

History recording happens after the successful operation, not in its primary transaction.
It is best effort: a recording/context lookup failure is logged without failing the
already-completed action. A process crash between completion and recording can leave a
missing event; this first version does not introduce a queue, outbox or audit guarantees.
Read failures are displayed as errors, not silently reported as an empty feed.

No runtime routing, domain, TLS, cookie or installation configuration is changed.
