# Data and Database Design

## 1. MVP decision
Do not run PostgreSQL for the initial personal version unless you specifically want to practice backend deployment. IndexedDB is sufficient for local saves and avoids authentication and hosting work.

## 2. Client-side persistence
Use IndexedDB with a small wrapper such as `idb`.

### Object stores
#### `sessions`
Key: `artworkId`

Fields:
- `artworkId: string`
- `artworkContentVersion: number`
- `schemaVersion: number`
- `width: number`
- `height: number`
- `colors: ArrayBuffer` (the repository creates a `Uint8Array` view when reading)
- `selectedColor: number`
- `revision: number`
- `updatedAt: number`
- `completedAt?: number`

#### `preferences`
Key: preference name

Examples:
- `musicVolume`
- `ambienceVolume`
- `selectedTrackId`
- `reducedMotion`
- `theme`

Do not persist undo/redo history in MVP. Keep it in memory; after a reload, the saved colors remain but history starts empty.

## 3. Save safety
- Copy the color buffer when queuing a save; never hand an asynchronously written operation a mutable engine buffer.
- Use one write queue per artwork. Within a tab, write snapshots in order and show "saved" only when the latest edited revision has committed.
- Treat the stored `revision` as an optimistic-concurrency token across tabs: in one read/write transaction, compare the snapshot's expected revision with the stored revision and write `expectedRevision + 1`. On a mismatch, do not write stale colors; mark a conflict and offer reload or export instead.
- Debounce routine saves and flush the queue before in-app navigation where practical. Browser unload is not a reliable place to begin an IndexedDB write, so the app must not depend on a tab-close save succeeding.
- Treat storage errors as recoverable; keep current state in memory.
- Validate data loaded from IndexedDB before using it: artwork ID and content version must match, dimensions and byte length must match, palette indices must be valid, and fixed cells must equal the artwork's immutable initial colors.
- Use `schemaVersion` and migrations for future format changes.
- Do not assume local browser data is a backup or sync mechanism.

## 4. Export format
Export a versioned file:
```json
{
  "format": "cozy-coloring-save",
  "schemaVersion": 1,
  "artworkId": "cozy-cat",
  "artworkContentVersion": 1,
  "width": 16,
  "height": 16,
  "colorsBase64": "...",
  "selectedColor": 2,
  "exportedAt": "ISO-8601 timestamp"
}
```
This is a schema example. Base64 is suitable for portability but increases payload size; binary download is also possible. On import, validate format, artwork ID/content version, dimensions, byte length, palette indices, and fixed-cell values before changing current state. Reject incompatibilities without replacing the existing session.

## 5. Future PostgreSQL schema
Only add this when cloud saves or multi-device support is required.

### `artworks`
- `id` UUID primary key
- `slug` unique
- `title`
- `description`
- `content_version`
- `width`
- `height`
- `palette_json` JSONB or normalized palette table
- `mask_asset_url`
- `preview_asset_url`
- `is_published`
- `created_at`
- `updated_at`

### `users` (only if accounts are needed)
- `id` UUID primary key
- `created_at`
- Authentication should be handled with a suitable established identity solution rather than storing plaintext passwords.

### `coloring_sessions`
- `id` UUID primary key
- `user_id` foreign key
- `artwork_id` foreign key
- `artwork_content_version`
- `schema_version`
- `width`
- `height`
- `colors` BYTEA
- `revision` integer
- `completed_at` nullable
- `created_at`
- `updated_at`
- unique constraint on `(user_id, artwork_id)` if one session per artwork/user is intended.

### Optional `audio_tracks`
- `id`
- `title`
- `asset_url`
- `kind` (music/ambience)
- `license_reference`
- `is_published`

## 6. Storage for art and audio
Keep images, masks, and audio in static hosting/object storage/CDN rather than PostgreSQL rows. Store URLs and metadata in the database if the catalog becomes remotely managed.

## 7. Future concurrency
For cross-device sync, use `revision` or `updated_at` with a conflict policy. Do not silently overwrite a newer cloud save with an older offline copy. For a single-user MVP, avoid this complexity.
