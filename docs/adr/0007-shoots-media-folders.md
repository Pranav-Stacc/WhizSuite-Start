# ADR 0007 — Shoots, calendar linkage, and media folder trees

## Status
Accepted

## Context
Agencies plan client shoots on a date, attach that day to a project, create related tasks, and need videographers (and others) to upload into nested folders (Raw, Selects, Finals, …). Client-visible folders appear in portal/client assets; agency-only folders stay internal. Media used in content/review must remain in the library with searchable metadata.

## Decision
1. **Shoot = calendar item** with `sourceType: SHOOT`, optional `projectId`, created via `POST …/calendar/shoots`.
2. **Tasks** may set `calendarItemId` so shoot checklists hang off the event (still owned by a project).
3. **MediaFolder** gains `projectId`, `calendarItemId`, parent tree, and `visibility` (`INTERNAL` | `CLIENT_VISIBLE`). Client roots (Brand Assets, Shoots, Deliverables, Agency) and per-shoot subfolders are created by the API.
4. **MediaAsset** gains `projectId`, `calendarItemId`, `searchText`, tags (`media_tags` / `media_asset_tags`), and **usage refs** when an asset is attached to content/review/etc.
5. List assets supports `q`, `folderId`, `clientId`, `projectId`, `calendarItemId`, `tag`, `clientVisibleOnly`.

## Consequences
- Upload into a shoot folder inherits folder client/project/calendar scope when provided on presign.
- Portal should filter `clientVisibleOnly` / `CLIENT_VISIBLE` folders.
- Full DAM search (FTS over 100k assets) can replace `searchText contains` later without changing the public contract.
