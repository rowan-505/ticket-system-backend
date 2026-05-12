/**
 * @openapi
 * components:
 *   schemas:
 *     ApiError:
 *       type: object
 *       required: [error, message, ref]
 *       properties:
 *         error:
 *           type: string
 *           description: Machine-readable code.
 *         message:
 *           type: string
 *         ref:
 *           type: string
 *           description: Request correlation id.
 *     HealthStatus:
 *       type: object
 *       required: [status]
 *       properties:
 *         status:
 *           type: string
 *           example: ok
 *     ConcertSummary:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 1 }
 *         name: { type: string }
 *         availableStock: { type: integer }
 *     ReserveRequest:
 *       type: object
 *       required: [concertId, userId, quantity]
 *       additionalProperties: false
 *       properties:
 *         concertId: { type: integer, minimum: 1 }
 *         userId: { type: string, minLength: 1 }
 *         quantity: { type: integer, minimum: 1, maximum: 5 }
 *     PurchaseRequest:
 *       type: object
 *       required: [reservationId]
 *       additionalProperties: false
 *       properties:
 *         reservationId: { type: integer, minimum: 1 }
 *     CreateTicketRequest:
 *       type: object
 *       required: [concertId]
 *       additionalProperties: false
 *       properties:
 *         concertId: { type: integer, minimum: 1 }
 *         category: { type: string, nullable: true }
 *         internalNote: { type: string, nullable: true }
 *     TicketListItem:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         concertId: { type: integer }
 *         category: { type: string, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *     TicketCreated:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         concertId: { type: integer }
 *         category: { type: string, nullable: true }
 *         internalNote: { type: string, nullable: true, description: "Returned on create only; omitted from GET /tickets list DTO." }
 *         version: { type: integer }
 *     ReservationCreated:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         concertId: { type: integer }
 *         userId: { type: string }
 *         quantity: { type: integer }
 *         status: { type: string, example: PENDING }
 *         expiresAt: { type: string, format: date-time }
 *     PurchaseSuccess:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         status: { type: string, example: COMPLETED }
 *     CleanupResult:
 *       type: object
 *       required: [count]
 *       properties:
 *         count:
 *           type: integer
 *           description: Number of expired reservations processed.
 *   responses:
 *     ValidationError:
 *       description: Invalid JSON body or Zod validation failure (strict objects reject unknown keys).
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiError'
 *           example:
 *             error: VALIDATION_ERROR
 *             message: "concertId: Required"
 *             ref: "550e8400-e29b-41d4-a716-446655440000"
 *     NotFoundError:
 *       description: Resource not found (NOT_FOUND).
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiError'
 *           example:
 *             error: NOT_FOUND
 *             message: "Concert not found."
 *             ref: "550e8400-e29b-41d4-a716-446655440000"
 *     ConflictError:
 *       description: |
 *         Business conflict (HTTP 409). Common `error` values include CONFLICT, OUT_OF_STOCK,
 *         CONCURRENCY_CONFLICT for reservations; other reservation lifecycle conflicts use CONFLICT.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiError'
 *           examples:
 *             outOfStock:
 *               summary: No stock left
 *               value:
 *                 error: OUT_OF_STOCK
 *                 message: "Not enough tickets available for this concert (stock unchanged)."
 *                 ref: "550e8400-e29b-41d4-a716-446655440000"
 *             concurrency:
 *               summary: SQLite contention
 *               value:
 *                 error: CONCURRENCY_CONFLICT
 *                 message: "Reservation could not complete due to database contention. Try again."
 *                 ref: "550e8400-e29b-41d4-a716-446655440000"
 *     RateLimitReserve:
 *       description: Too many POST /reserve attempts from this IP (per-minute window).
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [error, message, ref]
 *             properties:
 *               error: { type: string, example: RATE_LIMIT_EXCEEDED }
 *               message: { type: string }
 *               ref: { type: string }
 *           example:
 *             error: RATE_LIMIT_EXCEEDED
 *             message: "Too many reservation attempts from this IP. You can make up to 5 POST /reserve requests per minute."
 *             ref: "550e8400-e29b-41d4-a716-446655440000"
 *     InternalServerError:
 *       description: Unexpected server error (INTERNAL_ERROR) or unhandled exception (e.g. Sentry test route).
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiError'
 *           example:
 *             error: INTERNAL_ERROR
 *             message: "Something went wrong. Please try again later."
 *             ref: "550e8400-e29b-41d4-a716-446655440000"
 * tags:
 *   - name: System
 *     description: Liveness and intentional error routes.
 *   - name: Concerts
 *   - name: Reservations
 *   - name: Tickets
 *   - name: Maintenance
 *     description: Operational cleanup tasks.
 * paths:
 *   /health:
 *     get:
 *       tags: [System]
 *       summary: Health check
 *       description: Returns a simple JSON payload when the process is up.
 *       responses:
 *         "200":
 *           description: Service is healthy.
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/HealthStatus'
 *         "500":
 *           $ref: '#/components/responses/InternalServerError'
 *   /test-error:
 *     get:
 *       tags: [System]
 *       summary: Intentional 500 (Sentry demo)
 *       description: Throws an unhandled error for verifying error middleware and optional Sentry integration.
 *       responses:
 *         "500":
 *           $ref: '#/components/responses/InternalServerError'
 *   /concerts:
 *     get:
 *       tags: [Concerts]
 *       summary: List concerts
 *       description: Returns id, name, and availableStock for each concert (read-only).
 *       responses:
 *         "200":
 *           description: Success
 *           content:
 *             application/json:
 *               schema:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ConcertSummary'
 *         "500":
 *           $ref: '#/components/responses/InternalServerError'
 *   /reserve:
 *     post:
 *       tags: [Reservations]
 *       summary: Create reservation (production)
 *       description: |
 *         Validates body with Zod, applies per-IP rate limiting (Redis or in-memory fallback),
 *         then atomically decrements `availableStock` and creates a PENDING reservation when stock allows.
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReserveRequest'
 *       responses:
 *         "201":
 *           description: Reservation created.
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ReservationCreated'
 *         "400":
 *           $ref: '#/components/responses/ValidationError'
 *         "409":
 *           $ref: '#/components/responses/ConflictError'
 *         "429":
 *           $ref: '#/components/responses/RateLimitReserve'
 *         "500":
 *           $ref: '#/components/responses/InternalServerError'
 *   /reserve/stress-test:
 *     post:
 *       tags: [Reservations]
 *       summary: Create reservation (stress / assignment)
 *       description: |
 *         Same business logic and validation as POST /reserve but **without** express-rate-limit.
 *         Intended only for concurrency or bootcamp demos; do not expose publicly without controls.
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReserveRequest'
 *       responses:
 *         "201":
 *           description: Reservation created.
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ReservationCreated'
 *         "400":
 *           $ref: '#/components/responses/ValidationError'
 *         "409":
 *           $ref: '#/components/responses/ConflictError'
 *         "500":
 *           $ref: '#/components/responses/InternalServerError'
 *   /reserve/optimistic:
 *     post:
 *       tags: [Reservations]
 *       summary: Create reservation (optimistic locking demo)
 *       description: Uses Concert.version optimistic locking; conflicts surface as 409.
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReserveRequest'
 *       responses:
 *         "201":
 *           description: Reservation created.
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ReservationCreated'
 *         "400":
 *           $ref: '#/components/responses/ValidationError'
 *         "409":
 *           $ref: '#/components/responses/ConflictError'
 *         "500":
 *           $ref: '#/components/responses/InternalServerError'
 *   /reserve/pessimistic:
 *     post:
 *       tags: [Reservations]
 *       summary: Create reservation (pessimistic lock demo)
 *       description: Locks the concert row for the transaction (SQLite / TypeORM educational path).
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReserveRequest'
 *       responses:
 *         "201":
 *           description: Reservation created.
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ReservationCreated'
 *         "400":
 *           $ref: '#/components/responses/ValidationError'
 *         "409":
 *           $ref: '#/components/responses/ConflictError'
 *         "500":
 *           $ref: '#/components/responses/InternalServerError'
 *   /purchase:
 *     post:
 *       tags: [Reservations]
 *       summary: Complete purchase for a pending reservation
 *       description: Marks a non-expired PENDING reservation as COMPLETED.
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseRequest'
 *       responses:
 *         "200":
 *           description: Reservation marked completed.
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/PurchaseSuccess'
 *         "400":
 *           $ref: '#/components/responses/ValidationError'
 *         "404":
 *           $ref: '#/components/responses/NotFoundError'
 *         "409":
 *           $ref: '#/components/responses/ConflictError'
 *         "500":
 *           $ref: '#/components/responses/InternalServerError'
 *   /cleanup/expired-reservations:
 *     post:
 *       tags: [Maintenance]
 *       summary: Expire stale PENDING reservations
 *       description: Runs cleanup logic (no request body). Returns how many rows were affected.
 *       responses:
 *         "200":
 *           description: Cleanup finished.
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/CleanupResult'
 *         "500":
 *           $ref: '#/components/responses/InternalServerError'
 *   /tickets:
 *     get:
 *       tags: [Tickets]
 *       summary: List tickets (public DTO)
 *       description: Returns tickets without internal-only fields (see TicketListItem).
 *       responses:
 *         "200":
 *           description: Success
 *           content:
 *             application/json:
 *               schema:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/TicketListItem'
 *         "500":
 *           $ref: '#/components/responses/InternalServerError'
 *     post:
 *       tags: [Tickets]
 *       summary: Create ticket
 *       description: Creates a ticket for an existing concert. Body is validated with Zod (strict).
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateTicketRequest'
 *       responses:
 *         "201":
 *           description: Ticket created (includes internalNote in this response).
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/TicketCreated'
 *         "400":
 *           $ref: '#/components/responses/ValidationError'
 *         "404":
 *           $ref: '#/components/responses/NotFoundError'
 *         "500":
 *           $ref: '#/components/responses/InternalServerError'
 */

export {};
