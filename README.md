# Ticket Management Backend

A backend API for a concert ticket reservation system.

This project was created as part of a backend bootcamp assignment. The goal was to build more than a basic CRUD API. This backend focuses on safe ticket reservation, request validation, logging, concurrency control, API documentation, Docker deployment, AWS EC2 deployment, Nginx reverse proxy, domain mapping, and HTTPS.

---

## Live Deployment

The API has been deployed on AWS EC2 with Docker and Nginx.

Main API:

```txt
https://ticket-system.int.yt/health
```

Swagger API documentation:

```txt
https://ticket-system.int.yt/api-docs
```

---

## Project Overview

This project simulates a concert ticket reservation backend.

Users can:

- View concerts
- Reserve tickets
- Complete a reservation purchase
- Release expired reservations
- View tickets through a safe response format
- Test API behavior through Swagger documentation

The main backend challenge is handling a high-demand ticket situation. For example, if only one ticket is left, two users should not be able to reserve it at the same time.

The system is designed so that:

```txt
One request succeeds.
The other request fails.
The final stock does not become negative.
```

---

## Why This Project Matters

A ticketing system is a good example of a backend problem where correctness is very important.

A simple API can easily fail when many users click at the same time. This project demonstrates how to make the backend safer by using:

- Transactions
- Atomic stock updates
- Validation
- Error mapping
- Rate limiting
- Structured logs
- Correlation IDs
- Deployment with Docker and Nginx

---

## Tech Stack

| Area | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express.js |
| ORM | TypeORM |
| Database | SQLite |
| Validation | Zod |
| Logging | Pino / JSON logs |
| Rate Limiting | Redis |
| API Documentation | Swagger UI |
| Containerization | Docker |
| Multi-service setup | Docker Compose |
| Cloud Server | AWS EC2 |
| Reverse Proxy | Nginx |
| Domain | `int.yt` subdomain |
| SSL/TLS | Certbot / Let's Encrypt |

---

## Main Features

### 1. Health Check

Endpoint:

```http
GET /health
```

This endpoint is used to check if the server is running.

Example response:

```json
{
  "status": "ok"
}
```

---

### 2. Concert List

Endpoint:

```http
GET /concerts
```

Returns concerts and their available stock.

Example response:

```json
[
  {
    "id": 1,
    "name": "Low-stock concert (concurrency demo)",
    "availableStock": 1
  },
  {
    "id": 2,
    "name": "Standard concert",
    "availableStock": 10
  }
]
```

---

### 3. Ticket Reservation

Endpoint:

```http
POST /reserve
```

Creates a pending reservation.

Example request:

```json
{
  "concertId": 1,
  "userId": "user-1",
  "quantity": 1
}
```

Rules:

- `concertId` must be valid.
- `userId` is required.
- `quantity` must be an integer.
- `quantity` must be between 1 and 5.
- If stock is not enough, the request fails.
- The reservation starts as `PENDING`.
- The reservation expires after 5 minutes.

---

### 4. Purchase Confirmation

Endpoint:

```http
POST /purchase
```

Converts a pending reservation into a completed purchase.

Example request:

```json
{
  "reservationId": 1
}
```

The backend checks that the reservation:

- Exists
- Is still pending
- Has not expired

---

### 5. Expired Reservation Cleanup

Endpoint:

```http
POST /cleanup/expired-reservations
```

This endpoint releases expired pending reservations and adds the stock back to the concert.

This is important because users may reserve tickets but never complete the purchase.

---

### 6. Request Validation

The project uses Zod to validate incoming request bodies.

Invalid data is rejected before it reaches the business logic.

Example invalid request:

```json
{
  "concertId": 1,
  "userId": "bad-user",
  "quantity": 99,
  "extra": "bad"
}
```

Example error response:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "quantity: Too big: expected number to be <=5",
  "ref": "submit-test-123"
}
```

Unknown fields are also rejected.

---

### 7. Global Error Handler

The backend uses a global error handler.

Instead of returning random error messages from each controller, errors are mapped to one clean response format:

```json
{
  "error": "ERROR_CODE",
  "message": "User friendly message",
  "ref": "correlation-id"
}
```

The `ref` field helps connect the API error response to backend logs.

---

### 8. Correlation ID

Every request has a correlation ID.

If the client sends this header:

```http
X-Correlation-ID: submit-test-123
```

the backend keeps the same ID throughout the request.

Example log flow:

```txt
submit-test-123 → request received
submit-test-123 → validation error
```

This makes debugging easier because all logs for one request can be found using the same ID.

---

### 9. Structured JSON Logging

The backend logs requests and errors in JSON format.

Example:

```json
{
  "level": 30,
  "method": "POST",
  "path": "/reserve",
  "correlation_id": "submit-test-123",
  "msg": "request received"
}
```

This is useful for debugging and for future observability tools.

---

### 10. Rate Limiting

The `/reserve` endpoint is protected by rate limiting.

Rule:

```txt
Maximum 5 POST /reserve requests per minute per IP
```

If too many requests are sent, the API returns:

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many reservation attempts from this IP. You can make up to 5 POST /reserve requests per minute.",
  "ref": "correlation-id"
}
```

Redis is used to support the rate limiter.

---

### 11. Concurrency Protection

The project includes reservation logic designed to prevent double-selling.

Example situation:

```txt
Available stock: 1
User A reserves 1 ticket
User B reserves 1 ticket at the same time
```

Expected result:

```txt
User A: success
User B: conflict or out of stock
Final stock: 0
```

Wrong result:

```txt
Final stock: -1
```

The backend avoids this problem by using safer stock update logic.

---

### 12. Atomic Stock Update

Stock is decreased using an atomic database update.

Concept:

```sql
UPDATE concerts
SET availableStock = availableStock - :quantity
WHERE id = :concertId
AND availableStock >= :quantity;
```

This means the database checks and updates stock in one operation.

This is safer than reading the stock, subtracting it in JavaScript, and saving it later.

---

### 13. Stress Test Endpoint

Endpoint:

```http
POST /reserve/stress-test
```

This endpoint is used only for assignment concurrency testing.

It reuses the same reservation business logic, but it avoids the normal rate limit so two simultaneous requests can be tested clearly.

Example stress test:

```bash
curl -X POST https://ticket-system.int.yt/reserve/stress-test \
  -H "Content-Type: application/json" \
  -d '{"concertId":1,"userId":"stress-a","quantity":1}' &

curl -X POST https://ticket-system.int.yt/reserve/stress-test \
  -H "Content-Type: application/json" \
  -d '{"concertId":1,"userId":"stress-b","quantity":1}' &
```

Expected result:

```txt
Only one request succeeds.
The other request fails.
Final stock is 0.
Stock does not become -1.
```

---

### 14. Response DTO Protection

The ticket API does not expose internal database fields.

Hidden fields:

```txt
internal_note
version
```

Allowed fields:

```txt
id
concertId
category
createdAt
```

This prevents internal information from being leaked in API responses.

---

### 15. Database Migrations

The project uses TypeORM migrations.

Important setting:

```ts
synchronize: false
```

This means the database schema is controlled through migration files, not automatic synchronization.

Example migrations:

```txt
InitialSchema
AddTicketCategory
AddReservationIndexes
AddConcertVersionColumn
```

This helped me learn how database schemas evolve safely over time.

---

### 16. Seed Script

The seed script prepares demo data.

It creates or resets:

```txt
Low-stock concert (concurrency demo) → availableStock = 1
Standard concert → availableStock = 10
```

Run seed in Docker:

```bash
docker compose exec api npm run seed
```

This makes testing easier because the demo stock can be reset before stress testing.

---

### 17. Swagger API Documentation

Swagger UI is included to make the API easier to inspect and test.

Swagger URL:

```txt
https://ticket-system.int.yt/api-docs
```

Swagger shows:

- API endpoints
- request body examples
- response examples
- validation errors
- conflict responses

This helps teachers, reviewers, and other developers understand the project without reading all the source code first.

---

### 18. Docker Deployment

The project runs with Docker and Docker Compose.

Main services:

```txt
api
redis
```

Docker makes the deployment more consistent between local development and the EC2 server.

Common commands:

```bash
docker compose up -d --build
docker compose logs -f api
docker compose exec api npm run migration:run
docker compose exec api npm run seed
```

---

### 19. AWS EC2 Deployment

The backend is deployed on an AWS EC2 Ubuntu server.

Deployment flow:

```txt
GitHub repository
→ EC2 server
→ Docker Compose
→ API container
→ Nginx reverse proxy
→ Public domain with HTTPS
```

---

### 20. Nginx Reverse Proxy

Nginx receives public traffic and forwards it to the Express API.

Flow:

```txt
User request
→ Nginx on port 80/443
→ Express API on port 3000
```

This allows the API to use a clean URL:

```txt
https://ticket-system.int.yt/health
```

instead of:

```txt
http://18.138.197.183:3000/health
```

---

### 21. Domain Mapping

The project is connected to an `int.yt` subdomain.

DNS mapping connects the subdomain to the EC2 Elastic IP.

Concept:

```txt
ticket-system.int.yt → EC2 Elastic IP
```

This makes the project look more professional and easier to share.

---

### 22. HTTPS / SSL

HTTPS was enabled using Certbot and Let's Encrypt.

The final API uses:

```txt
https://
```

instead of:

```txt
http://
```

HTTP traffic is redirected to HTTPS.

This improves security and makes the deployment more production-like.

---

### 23. Graceful Shutdown

The server handles shutdown signals such as:

```txt
SIGTERM
SIGINT
```

When the app stops, it should:

```txt
receive shutdown signal
stop accepting new requests
wait for pending work
close database connection
exit safely
```

This is useful when Docker stops or restarts the API container.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check API health |
| GET | `/concerts` | List concerts and stock |
| POST | `/reserve` | Reserve tickets |
| POST | `/reserve/stress-test` | Assignment-only concurrency stress test |
| POST | `/purchase` | Complete a pending reservation |
| POST | `/cleanup/expired-reservations` | Release expired reservations |
| GET | `/tickets` | List tickets using safe DTO response |
| POST | `/tickets` | Create ticket |
| GET | `/api-docs` | Swagger API documentation |
| GET | `/docs` | Swagger alias, if enabled |
| GET | `/test-error` | Error monitoring test endpoint, if enabled |

---

## How to Run Locally

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Run migrations locally:

```bash
npm run migration:run:dev
```

Run seed locally:

```bash
npm run seed:dev
```

---

## How to Run with Docker

Build and start containers:

```bash
docker compose up -d --build
```

Run migrations:

```bash
docker compose exec api npm run migration:run
```

Run seed data:

```bash
docker compose exec api npm run seed
```

Check API health:

```bash
curl http://localhost/health
```

View logs:

```bash
docker compose logs -f api
```

---

## Testing Examples

### Health Check

```bash
curl https://ticket-system.int.yt/health
```

Expected:

```json
{
  "status": "ok"
}
```

### Concert List

```bash
curl https://ticket-system.int.yt/concerts
```

Expected:

```txt
List of concerts with available stock
```

### Validation Test

```bash
curl -X POST https://ticket-system.int.yt/reserve \
  -H "Content-Type: application/json" \
  -d '{"concertId":1,"userId":"bad-user","quantity":99}'
```

Expected:

```txt
VALIDATION_ERROR
```

### Correlation ID Test

```bash
curl -X POST https://ticket-system.int.yt/reserve \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: submit-test-123" \
  -d '{"concertId":1,"userId":"bad-user","quantity":99}'
```

Check logs:

```bash
docker compose logs api | grep submit-test-123
```

Expected:

```txt
The same correlation ID appears in request and validation error logs.
```

### Stress Test

Reset demo stock first:

```bash
docker compose exec api npm run seed
```

Then run:

```bash
curl -X POST https://ticket-system.int.yt/reserve/stress-test \
  -H "Content-Type: application/json" \
  -d '{"concertId":1,"userId":"stress-a","quantity":1}' &

curl -X POST https://ticket-system.int.yt/reserve/stress-test \
  -H "Content-Type: application/json" \
  -d '{"concertId":1,"userId":"stress-b","quantity":1}' &
```

Expected:

```txt
One request succeeds.
One request fails.
Final stock is 0.
```

---

## What I Utilized

In this project, I utilized several backend development and deployment concepts:

### Backend Development

- Express.js for API routing
- TypeScript for safer code
- TypeORM for database access
- SQLite for simple file-based storage
- Zod for request validation
- DTO pattern to protect internal fields

### Database and Data Safety

- TypeORM migrations for schema changes
- `synchronize: false` for safer database management
- Atomic update logic for ticket stock
- Transaction-based thinking for reservation safety
- Indexes for faster lookup and cleanup

### Observability and Debugging

- Correlation IDs for request tracing
- JSON structured logs
- Global error mapping
- Clean error responses with reference IDs
- Swagger documentation for API visibility

### Security and Reliability

- Rate limiting with Redis
- Hidden internal database fields
- HTTPS with Certbot and Let's Encrypt
- Nginx reverse proxy
- Graceful shutdown handling

### Deployment and Operations

- Docker for containerization
- Docker Compose for multi-service setup
- AWS EC2 for cloud hosting
- Elastic IP for stable server address
- Domain mapping with an `int.yt` subdomain
- Nginx routing from domain to API container
- SSL/TLS setup for secure public access

---

## What I Learned

This project helped me understand that backend development is not only about writing API routes.

I learned that a real backend must also handle:

### 1. Data Consistency

Ticket stock must be correct even when multiple users send requests at the same time. I learned why simple read-update-save logic can be dangerous and why atomic updates are safer.

### 2. Race Conditions

A race condition can happen when two users try to reserve the last ticket at the same time. This project helped me understand how double-selling can happen and how to prevent it.

### 3. Migrations

I learned why database changes should be managed with migrations instead of automatic synchronization. Migrations make schema changes easier to track and safer to deploy.

### 4. Validation

I learned that the backend should not trust user input. Invalid data should be rejected before it reaches the business logic.

### 5. Error Handling

I learned how global error handling makes API responses cleaner and more consistent.

### 6. Logging and Debugging

I learned how correlation IDs help connect a user-facing error response with backend logs. This makes debugging much easier.

### 7. Rate Limiting

I learned how rate limiting protects an API from too many repeated requests from the same IP.

### 8. API Documentation

I learned that Swagger is useful because teachers, testers, and other developers can understand and test the API more easily.

### 9. Deployment

I learned how to deploy a backend API to AWS EC2 using Docker. I also learned how to use Nginx as a reverse proxy.

### 10. Domain and HTTPS

I learned how a domain points to an EC2 server, how Nginx routes that request to the API, and how Certbot adds HTTPS with a free SSL certificate.

### 11. Production Thinking

This project helped me understand that production backend work includes not only code, but also logs, deployment, security, documentation, and operations.

---

## Project Status

Completed:

- Concert API
- Reservation API
- Purchase API
- Expired reservation cleanup
- Request validation
- Global error handling
- Correlation ID logging
- Structured JSON logs
- Rate limiting with Redis
- Response DTO protection
- TypeORM migrations
- Seed script
- Swagger documentation
- Docker setup
- AWS EC2 deployment
- Nginx reverse proxy
- Domain mapping
- HTTPS with Certbot

Optional / future improvement:

- Self-hosted Sentry dashboard
- More complete automated CI/CD
- More advanced load testing
- PostgreSQL instead of SQLite for stronger production database behavior
- Better user authentication
- Admin dashboard for managing concerts and tickets

---

## Final Note

This project is an educational backend assignment, but it includes many real backend engineering concepts.

It demonstrates how to build, test, document, and deploy a backend API while thinking about correctness, safety, observability, and production deployment.
