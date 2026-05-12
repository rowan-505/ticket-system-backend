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
 *           description: Machine-readable code (e.g. VALIDATION_ERROR, CONFLICT).
 *           example: VALIDATION_ERROR
 *         message:
 *           type: string
 *           description: Human-readable explanation.
 *         ref:
 *           type: string
 *           description: Request correlation id.
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
 *     TicketListItem:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         concertId: { type: integer }
 *         category: { type: string, nullable: true }
 *         createdAt: { type: string, format: date-time }
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
 *   responses:
 *     ValidationError:
 *       description: Invalid body or Zod validation failure.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiError'
 *           example:
 *             error: VALIDATION_ERROR
 *             message: "concertId: Required"
 *             ref: "550e8400-e29b-41d4-a716-446655440000"
 *     ConflictError:
 *       description: Business conflict (stock, reservation state, optimistic lock, etc.).
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiError'
 *           example:
 *             error: CONFLICT
 *             message: "Not enough tickets available for this concert (stock unchanged)."
 *             ref: "550e8400-e29b-41d4-a716-446655440000"
 * tags:
 *   - name: Concerts
 *   - name: Reservations
 *   - name: Tickets
 * paths:
 *   /concerts:
 *     get:
 *       tags: [Concerts]
 *       summary: List concerts
 *       description: Returns id, name, and availableStock for each concert.
 *       responses:
 *         "200":
 *           description: Success
 *           content:
 *             application/json:
 *               schema:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ConcertSummary'
 *         "400":
 *           $ref: '#/components/responses/ValidationError'
 *         "409":
 *           $ref: '#/components/responses/ConflictError'
 *   /reserve:
 *     post:
 *       tags: [Reservations]
 *       summary: Create reservation (production path)
 *       description: Rate-limited (Redis). Atomically decrements stock when possible.
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReserveRequest'
 *       responses:
 *         "201":
 *           description: Reservation created
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ReservationCreated'
 *         "400":
 *           $ref: '#/components/responses/ValidationError'
 *         "409":
 *           $ref: '#/components/responses/ConflictError'
 *   /reserve/optimistic:
 *     post:
 *       tags: [Reservations]
 *       summary: Test optimistic locking (VersionColumn on concert)
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReserveRequest'
 *       responses:
 *         "201":
 *           description: Reservation created
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ReservationCreated'
 *         "400":
 *           $ref: '#/components/responses/ValidationError'
 *         "409":
 *           $ref: '#/components/responses/ConflictError'
 *   /reserve/pessimistic:
 *     post:
 *       tags: [Reservations]
 *       summary: Test pessimistic row lock on concert
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReserveRequest'
 *       responses:
 *         "201":
 *           description: Reservation created
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ReservationCreated'
 *         "400":
 *           $ref: '#/components/responses/ValidationError'
 *         "409":
 *           $ref: '#/components/responses/ConflictError'
 *   /purchase:
 *     post:
 *       tags: [Reservations]
 *       summary: Complete purchase for a pending reservation
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseRequest'
 *       responses:
 *         "200":
 *           description: Reservation marked completed
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/PurchaseSuccess'
 *         "400":
 *           $ref: '#/components/responses/ValidationError'
 *         "409":
 *           $ref: '#/components/responses/ConflictError'
 *   /tickets:
 *     get:
 *       tags: [Tickets]
 *       summary: List tickets (public fields only)
 *       responses:
 *         "200":
 *           description: Success
 *           content:
 *             application/json:
 *               schema:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/TicketListItem'
 *         "400":
 *           $ref: '#/components/responses/ValidationError'
 *         "409":
 *           $ref: '#/components/responses/ConflictError'
 */

export {};
