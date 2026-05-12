# Ticket Management Backend

Educational Node.js service using Express, TypeScript, TypeORM, and SQLite.

## Reservation table indexes

Two indexes are added in migration `AddReservationIndexes` (see `src/migrations/`).

### Why index `concertId`?

`concertId` is the foreign key from each reservation to its concert. Queries that load or filter reservations **by concert**—for example, “all reservations for this show,” admin views, or integrity checks—use that column in `WHERE` or `JOIN` predicates. A normal (B-tree) index on `concertId` lets SQLite find matching rows without scanning the whole `reservations` table as it grows.

### Why a partial index for `PENDING` instead of indexing every status?

A **partial index** only includes rows that satisfy a condition—in our case `status = 'PENDING'`. Most operational queries that care about status at scale are aimed at **active** holds: cleanup (`PENDING` and `expiresAt < now`), capacity checks, or dashboards for open reservations.

By contrast, a **full** index on `status` would also index `COMPLETED` and `EXPIRED` rows. Those rows are often numerous but rarely queried by status alone in hot paths; indexing them adds **storage**, **write overhead** on every status change, and **less selective** scans when the dominant values are mixed. The partial index stays **smaller** and **more selective** for the workloads that filter specifically on pending reservations, which is a better tradeoff for this schema.

## Sentry (optional error monitoring)

The app loads `@sentry/node` when `SENTRY_DSN` is set (see `.env.example`). Initialization happens in `src/instrument-sentry.ts`, imported from `server.ts` immediately after `dotenv/config`. Express registers Sentry’s error handler **after** routes and **before** the app’s own `errorHandler`; only unknown errors (not Zod validation failures or `AppError` subclasses) are sent to Sentry. Shutdown flushes pending events with `Sentry.flush`.

### Verify an error in the Sentry dashboard

1. In [Sentry](https://sentry.io), create (or open) a project for **Node.js** and copy the **DSN**.
2. Set `SENTRY_DSN` to that value in `.env` (or your process manager / Docker environment) and restart the API.
3. Trigger a test event:

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/test-error
   ```

   Expect HTTP **500** and a JSON error body from the normal error middleware.

4. In Sentry, open **Issues** for your project. Within a short time (often a few seconds), a new issue should appear with message **`Sentry test error (intentional)`** and a stack trace pointing at the `/test-error` handler.
5. Open the issue to inspect **event details**, **breadcrumbs** (if enabled), and **release / environment** (`environment` follows `NODE_ENV`, defaulting to `development` when unset).
