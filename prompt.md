# EN2H Booking Platform REST API — Build Prompt

> Paste this whole file as a single prompt into Claude Code (or another AI coding agent). It contains everything needed to generate a complete, evaluation-ready NestJS project for the EN2H Software Engineer Intern assignment.

## 0. Role & Objective

You are a senior backend engineer. Build a **production-quality Booking Platform REST API** in **NestJS + TypeScript**, backed by **PostgreSQL (Neon serverless)**, that fully satisfies every requirement below. This will be graded against a 100-mark rubric (included at the end) — optimize for correctness, clean architecture, and NestJS idioms, not feature-cramming.

Work incrementally: scaffold the project → set up DB/migrations → build Auth → build Services module → build Bookings module → add validation/exception handling → add bonus features → write Swagger docs → write the README.

---

## 1. Scenario

Build a **Booking Platform REST API** that lets business users manage **services** they offer, and lets **customers** create **bookings** against those services. Two personas:
- **Business user (authenticated)** — manages the service catalog, reviews/updates bookings.
- **Customer (unauthenticated)** — browses services and creates bookings.

---

## 2. Tech Stack (decided — do not deviate without documenting why in README)

| Concern | Choice |
|---|---|
| Framework | NestJS (latest stable), TypeScript (strict mode) |
| Database | PostgreSQL via **Neon** (serverless Postgres) |
| ORM | **TypeORM** with migrations (`typeorm-ts-node-commonjs` CLI) — do **not** use `synchronize: true` outside a throwaway dev flag; ship real migration files since they're an explicit submission requirement |
| Auth | `@nestjs/jwt` + `@nestjs/passport` + `passport-jwt`, `bcrypt` for password hashing |
| Validation | `class-validator` + `class-transformer`, global `ValidationPipe` (whitelist, forbidNonWhitelisted, transform) |
| Docs | `@nestjs/swagger` mounted at `/api/docs` |
| Config | `@nestjs/config`, `.env` driven, validated at boot (Joi or class-validator env schema) |
| Testing | Jest — unit tests for services, e2e for at least auth + bookings business rules |
| Containerization | `Dockerfile` (multi-stage) + `docker-compose.yml` (app + local Postgres fallback for reviewers without Neon access) |

---

## 3. Functional Requirements

### 3.1 Authentication
- `POST /auth/register` — email, password, name → hash password with bcrypt, create user, return access token (+ refresh token if implementing that bonus).
- `POST /auth/login` — email, password → validate, return JWT access token (+ refresh token).
- `JwtAuthGuard` protecting all "manage" routes described below.
- Standard JWT payload: `{ sub: userId, email }`, reasonable expiry (e.g. 15m access / 7d refresh if refresh tokens implemented).

### 3.2 Service Management
Entity fields (from spec): `title`, `description`, `duration`, `price`, `isActive`.

**Design decision to make explicitly (document in README → "Assumptions Made"):**
The spec says "authenticated users should be able to: create/update/delete/get all/get by id" but the Business Rules only say *"Only authenticated users can **manage** services"* and separately imply customers need to browse services to book them. Resolve this as:
- `POST /services`, `PATCH /services/:id`, `DELETE /services/:id` → **JWT-protected** (this is "managing").
- `GET /services`, `GET /services/:id` → **public** (read-only), so unauthenticated customers can browse the catalog before booking. Only return/consider `isActive: true` services in the public listing by default (support an `includeInactive` query param for authenticated calls if you want, but keep it simple).

State this assumption explicitly in the README.

### 3.3 Booking Management
Entity fields (from spec): `customerName`, `customerEmail`, `customerPhone`, `serviceId`, `bookingDate`, `bookingTime`, `status`, `notes`.

Per the explicit business rule *"Customers can create bookings without authentication"*:
- `POST /bookings` → **public**, no auth required.
- `GET /bookings`, `GET /bookings/:id`, `PATCH /bookings/:id/status`, `DELETE /bookings/:id` (cancel) → **JWT-protected** (staff-only management/visibility of bookings). Document this as an assumption too — the spec doesn't state auth for these explicitly, but it's the only interpretation consistent with "customers can create bookings without auth" implying everything else needs auth.

Endpoints:
- `POST /bookings` — create (public)
- `GET /bookings` — list all (protected, paginated + filterable — see bonuses)
- `GET /bookings/:id` — get one (protected)
- `PATCH /bookings/:id/status` — update status (protected)
- `DELETE /bookings/:id` — cancel booking, i.e. set status to `CANCELLED` (protected) — implement as a soft state change, not a hard delete, so history is preserved.

### 3.4 Booking Status
Enum, exactly as specified:
```
PENDING
CONFIRMED
CANCELLED
COMPLETED
```
Define an explicit allowed-transition map in the service layer, e.g.:
```
PENDING    -> CONFIRMED | CANCELLED
CONFIRMED  -> COMPLETED | CANCELLED
CANCELLED  -> (terminal, no transitions out)
COMPLETED  -> (terminal, no transitions out)
```
Reject invalid transitions with `400 Bad Request` and a clear message.

### 3.5 Business Rules (enforce in the service layer, not just DB constraints)
1. A booking must reference an existing `serviceId` → `404` if the service doesn't exist (consider also validating `isActive`, and document that choice).
2. `bookingDate` cannot be in the past → validate against current server date (compare dates, not datetimes, unless `bookingTime` is combined — be consistent and document the comparison approach).
3. Cancelled bookings cannot be marked `COMPLETED` → enforced by the transition map above (`CANCELLED` is terminal).
4. Only authenticated users can manage services → `JwtAuthGuard` on write endpoints (3.2).
5. Customers can create bookings without authentication → no guard on `POST /bookings` (3.3).

---

## 4. Database Schema

```
User
- id            uuid, PK, default gen_random_uuid()
- name          varchar
- email         varchar, unique, not null
- password      varchar (bcrypt hash), not null
- createdAt     timestamptz
- updatedAt     timestamptz

Service
- id            uuid, PK
- title         varchar, not null
- description   text
- duration      int (minutes), not null
- price         decimal(10,2), not null
- isActive      boolean, default true
- createdAt     timestamptz
- updatedAt     timestamptz

Booking
- id            uuid, PK
- customerName  varchar, not null
- customerEmail varchar, not null
- customerPhone varchar, not null
- serviceId     uuid, FK -> Service.id, not null, onDelete: RESTRICT
- bookingDate   date, not null
- bookingTime   time (or varchar "HH:mm" — pick one, document it), not null
- status        enum('PENDING','CONFIRMED','CANCELLED','COMPLETED'), default 'PENDING'
- notes         text, nullable
- createdAt     timestamptz
- updatedAt     timestamptz
```

Relations: `Booking.service` → `ManyToOne(Service)`; `Service.bookings` → `OneToMany(Booking)`.

For the "prevent duplicate bookings" bonus: add a **unique composite index** on `(serviceId, bookingDate, bookingTime)` at the DB level, in addition to a service-layer check that returns a clean `409 Conflict` rather than letting a raw DB error leak.

Generate real TypeORM migration files (not just `synchronize`) — this is an explicit submission requirement (`Database Migration Files`).

---

## 5. API Surface Summary

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Create user |
| POST | `/auth/login` | Public | Get JWT |
| POST | `/auth/refresh` | Public (refresh token) | Bonus: rotate access token |
| POST | `/services` | JWT | Create service |
| GET | `/services` | Public | List services (paginated, filterable) |
| GET | `/services/:id` | Public | Get service by id |
| PATCH | `/services/:id` | JWT | Update service |
| DELETE | `/services/:id` | JWT | Delete service |
| POST | `/bookings` | Public | Create booking |
| GET | `/bookings` | JWT | List bookings (paginated, search, filter by status) |
| GET | `/bookings/:id` | JWT | Get booking by id |
| PATCH | `/bookings/:id/status` | JWT | Update booking status (transition-checked) |
| DELETE | `/bookings/:id` | JWT | Cancel booking (soft status change) |

All list endpoints return a consistent envelope, e.g.:
```json
{ "data": [...], "meta": { "page": 1, "limit": 10, "total": 42 } }
```
All error responses use a consistent shape via the global exception filter, e.g.:
```json
{ "statusCode": 400, "message": "...", "error": "Bad Request", "path": "...", "timestamp": "..." }
```

---

## 6. Bonus Features — implement all of these

- **Pagination** on `GET /services` and `GET /bookings` (`page`, `limit` query params, capped max limit).
- **Search bookings** — by `customerName` and/or `customerEmail` (query param, case-insensitive `ILIKE`).
- **Filter by status** on `GET /bookings` (`?status=PENDING`).
- **Swagger documentation** at `/api/docs`, with DTOs annotated via `@ApiProperty`, bearer-auth scheme configured, tags per module.
- **Docker support** — `Dockerfile` + `docker-compose.yml`.
- **Validation** — global `ValidationPipe`, DTOs for every input with strict class-validator rules (email format, phone format, enum checks, date-not-in-past custom validator, etc.).
- **Global Exception Handling** — a global `HttpExceptionFilter` producing the consistent error shape above; also handle unexpected/unknown errors gracefully (don't leak stack traces).
- **Refresh Token** — `/auth/refresh` endpoint, refresh tokens stored hashed if persisted, or stateless with rotation.
- **Unit Testing** — Jest tests for `AuthService`, `ServicesService`, and especially `BookingsService` (status transition logic, past-date rule, duplicate-booking rule).
- **Prevent duplicate bookings** — unique DB index + service-layer `409 Conflict` check (see §4).

---

## 7. Project Structure (NestJS best practices, feature-modules)

```
src/
  main.ts
  app.module.ts
  config/
    configuration.ts
    validation.schema.ts
  common/
    filters/
      http-exception.filter.ts
    interceptors/
      transform.interceptor.ts
    decorators/
      current-user.decorator.ts
    guards/
      jwt-auth.guard.ts
    dto/
      pagination-query.dto.ts
  database/
    data-source.ts
    migrations/
  modules/
    auth/
      dto/ (register.dto.ts, login.dto.ts)
      strategies/jwt.strategy.ts
      auth.controller.ts
      auth.service.ts
      auth.module.ts
    users/
      entities/user.entity.ts
      users.service.ts
      users.module.ts
    services/
      dto/ (create-service.dto.ts, update-service.dto.ts, query-service.dto.ts)
      entities/service.entity.ts
      services.controller.ts
      services.service.ts
      services.module.ts
    bookings/
      dto/ (create-booking.dto.ts, update-status.dto.ts, query-booking.dto.ts)
      entities/booking.entity.ts
      enums/booking-status.enum.ts
      validators/not-in-past.validator.ts
      bookings.controller.ts
      bookings.service.ts
      bookings.module.ts
test/
  auth.e2e-spec.ts
  bookings.e2e-spec.ts
.env.example
docker-compose.yml
Dockerfile
README.md
```

---

## 8. API Documentation
- Use `@nestjs/swagger`, mount UI at `/api/docs`.
- Every DTO annotated with `@ApiProperty` (including examples).
- Configure `addBearerAuth()` and apply `@ApiBearerAuth()` on protected controllers.
- Also export a **Postman collection JSON** as an alternative/companion artifact (`docs/postman_collection.json`) since the spec accepts either.

---

## 9. Environment Variables (`.env.example`)

```
NODE_ENV=development
PORT=3000

# Neon Postgres connection string — sslmode=require is mandatory for Neon
DATABASE_URL=postgresql://<user>:<password>@<neon-host>/<db>?sslmode=require

JWT_SECRET=changeme
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=changeme_refresh
JWT_REFRESH_EXPIRES_IN=7d
```

Note in code/README: TypeORM's PG driver needs `ssl: { rejectUnauthorized: false }` (or Neon's recommended SSL config) when connecting via `DATABASE_URL`, since Neon enforces SSL.

---

## 10. README.md — must include all of these sections

1. **Project Overview** — what it does, tech stack, architecture summary.
2. **Installation Steps** — clone, `npm install`.
3. **Environment Variables** — table explaining every var in `.env.example`.
4. **Database Setup** — how to provision a Neon DB (or fall back to local Postgres via docker-compose), how to point `DATABASE_URL` at it.
5. **Running the Application** — `npm run start:dev`, Docker instructions.
6. **Running Migrations** — exact CLI commands (`npm run migration:generate`, `npm run migration:run`, `npm run migration:revert`).
7. **API Documentation** — link/instructions for `/api/docs`, and where to find the Postman collection.
8. **Assumptions Made** — explicitly call out:
   - Service reads (`GET /services`, `GET /services/:id`) are public; writes are JWT-protected.
   - Booking read/status-update/cancel endpoints are JWT-protected; only `POST /bookings` is public.
   - `bookingDate`/`bookingTime` comparison approach for the "not in the past" rule.
   - Any other interpretation calls made where the spec was silent.
9. **Future Improvements** — e.g. role-based access (admin vs staff), email/SMS notifications on booking status change, rate limiting on the public booking endpoint, idempotency keys, soft-delete for services, audit log.

---

## 11. Important Notes / Non-Functional Requirements
- Clean, readable, maintainable code; consistent naming.
- Proper REST semantics and status codes: `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`.
- Meaningful, incremental commit messages (conventional commits).
- `.gitignore` excludes `node_modules`, `.env`, `dist`.
- `.env.example` committed, `.env` never committed.
- Third-party libraries are fine where they add value (bcrypt, class-validator, swagger, etc.) — don't reinvent them.

---

## 12. Evaluation Criteria (build against this, in priority order)

| Criteria | Marks |
|---|---|
| Project Structure | 15 |
| NestJS Best Practices | 15 |
| Authentication | 15 |
| Database Design | 15 |
| API Design | 15 |
| Validation & Error Handling | 10 |
| Code Quality & Maintainability | 10 |
| Documentation | 5 |
| Bonus Features | 10 |
| **Total** | **100** |

---

## 13. Definition of Done
- [ ] All required auth, service, and booking endpoints implemented and working against a real Neon DB.
- [ ] All 5 business rules enforced with tests proving each one.
- [ ] Migrations committed and runnable from a clean DB.
- [ ] Global validation + global exception filter in place.
- [ ] Swagger live at `/api/docs`; Postman collection exported.
- [ ] All bonus features from §6 implemented.
- [ ] README covers every section in §10, including Assumptions Made.
- [ ] `.env.example`, Dockerfile, docker-compose.yml present.
- [ ] `npm test` passes (unit + e2e).
- [ ] No secrets or `node_modules` committed.