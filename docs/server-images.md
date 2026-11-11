# Server: Docker Images

The sidebar **Server** entry opens `/server` with Events selected. Button-style navigation
also opens Logs (`/server/logs`) and Docker Images (`/server/images`). Previous `/events/logs` and `/logs` links redirect to their new locations. Events, Logs and image
reads remain available to authenticated users; only administrators can delete images.

## Scope

The image list covers the entire Docker daemon, including images not managed by Kiban,
untagged images and older versions of Kiban itself. Each tag gets its own visible row.
Several tags can refer to the same image ID; they share disk data and reference counts. It does not claim historical ownership
of service images. Size, creation time, full ID/tags and reference count come from the
backend, never from browser-supplied metadata. Images are not running workloads: "In use"
means that at least one existing container refers to that exact image, whether running,
paused, stopped, created or otherwise inactive. An unused image may still be needed for
future installations, builds or rollback and can require downloading again after deletion.

The Service column lists installed Kiban services associated with actual container image
IDs. Compose project labels are matched against each installed service's persisted runtime
project identity, not image repository/tag names. Multiple containers belonging to one
service produce one service entry; a shared image can list multiple services. Unknown,
external or orphaned associations leave the cell blank, while usage/reference protection
still applies. Only service ID/name are returned, never configuration or runtime secrets.

Internal API, Web and proxy images display **KibanOS · Core** in the Service column,
with the warning "Required by KibanOS. Removing this image may prevent KibanOS from starting."
The backend supplies `isKibanCore` by matching actual container image IDs and exact
Compose project/service labels: `kiban/kiban-api`, `kiban/kiban-web` and
`kiban-traefik/traefik`. Repository names, tags and installed versions are not used.
Stopped internal containers also protect their images. All tags of a core image are
protected from deletion, including direct administrator API requests. A user-installed
Traefik is not core by name; if it shares the internal proxy's image ID, both KibanOS Core
and the installed service are shown. Older images without core references remain eligible
for cleanup under the normal reference checks. This cannot prevent an administrator
from forcing deletion outside Kiban.

Sizes include shared layers and are not a promise of reclaimed disk space. Shared layers,
build cache and Docker Desktop's virtual disk can make host disk-space changes differ from
the displayed image size. This feature does not prune build cache or compact virtual disks.

## Safety

- `GET /api/server/images`: session required; lists metadata and references across **all**
  containers, including containers outside Kiban. Docker errors are shown as errors, not
  as an empty list or a false "unused" state.
- `DELETE /api/server/images/:id?tag=<selected-tag>`: administrator session and the existing
  `X-Kiban-Request: 1` CSRF protection required, plus a confirmation dialog in the UI.
- A full lowercase `sha256:` image ID is required. For a tagged row, the optional tag
  selector must belong to that ID and is resolved again before deletion. A missing or
  reassigned tag is rejected without falling back to deleting another tag or the image ID.
  Malformed selectors, truncated IDs and path/query injection are rejected.
- Tagged rows remove only the selected tag. Other tags remain intact. Removing the final
  tag may also remove the unreferenced image data. Untagged rows delete by full image ID.
- The backend rereads images and all container references immediately before deletion.
  It refuses a referenced image even if the browser still shows a stale "Unused" state.
- Docker receives only `DELETE /images/<encoded-tag-or-id>?force=false&noprune=true`.
  Tag resolution and container usage are checked again immediately before the request.
  These reads are not a transaction with external Docker clients; Docker's non-forced
  removal protects referenced image data if the daemon state changes concurrently.
  No force retry occurs. Dependent images or a concurrent build can still cause a conflict.
  Deleting an ID directly (without a selected tag) can also conflict when it has multiple tags.
- No container deletion, bulk prune, volume removal, network changes, routing or TLS changes
  are performed. There is no automatic cleanup or additional database table.

The isolated runtime provider talks to the Docker Engine API over the same Unix-socket
configuration used elsewhere (`DOCKER_SOCKET`, default `/var/run/docker.sock`). Local and
VPS installations use their own daemon. No dependency, installer, mount or socket permissions
are changed by this feature. Socket unavailability yields 503; invalid IDs 400, unknown
images 404, operator deletion 403 and usage/Docker conflicts 409.

Tests use injected responses and an isolated simulated Unix-socket daemon; they never
remove real images. Operational proof with a user's local/VPS Docker daemon remains a
manual check using a deliberately disposable image.
