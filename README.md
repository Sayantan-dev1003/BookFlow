# EN2H Booking Platform REST API

## 1. Project Overview
A production-quality Booking Platform REST API built with NestJS, TypeScript, and PostgreSQL (via local Docker). It provides authentication, service catalog management, and a booking system where authenticated staff can manage services and bookings, while unauthenticated customers can browse services and create bookings.

**Tech Stack**: NestJS, TypeScript, PostgreSQL, TypeORM, JWT Auth, class-validator, Swagger, Docker.

## 2. Installation Steps
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

## 3. Environment Variables
| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Current environment | `development` |
| `PORT` | The port the API runs on | `3000` |
| `POSTGRES_USER` | PostgreSQL local user (for Docker) | `postgres_user` |
| `POSTGRES_PASSWORD` | PostgreSQL local password (for Docker) | `postgres_password` |
| `POSTGRES_DB` | PostgreSQL local database name (for Docker) | `db_name` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:5434/<POSTGRES_DB>` |
| `JWT_SECRET` | Secret used to sign access tokens | `changeme` |
| `JWT_EXPIRES_IN` | Access token lifespan | `15m` |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens | `changeme_refresh` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifespan | `7d` |

## 4. Database Setup
You can use a local PostgreSQL instance via Docker.

**Local Database (Docker):**
Start the local PostgreSQL container:
```bash
docker-compose up -d
```
Update your `.env` with:
```
DATABASE_URL=postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:5434/<POSTGRES_DB>
```

## 5. Running the Application
To run the app locally:
```bash
npm run start:dev
```

To run using Docker:
```bash
docker build -t bookflow-api .
docker run -p 3000:3000 bookflow-api
```

## 6. Running Migrations
TypeORM migrations are used to manage schema changes.
- **Generate a migration**:
  ```bash
  npm run migration:generate -- src/database/migrations/InitialMigration
  ```
- **Run migrations**:
  ```bash
  npm run migration:run
  ```
- **Revert the last migration**:
  ```bash
  npm run migration:revert
  ```

*(Make sure you have added these scripts to your `package.json`)*

## 7. API Documentation
The API is documented using Swagger. Once the application is running, navigate to `http://localhost:3000/api/docs` to view the interactive Swagger UI. You can use the "Authorize" button to set your JWT token for protected endpoints.

Below is a summary of the available endpoints:

### Auth
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Register a new staff user |
| `POST` | `/auth/login` | No | Login to obtain an access and refresh token |
| `POST` | `/auth/refresh` | No | Obtain a new access token using a refresh token |

### Services
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/services` | No | List active services (supports `page` and `limit` for pagination) |
| `GET` | `/services/:id` | No | Retrieve a specific active service |
| `POST` | `/services` | Yes (JWT) | Create a new service |
| `PATCH` | `/services/:id` | Yes (JWT) | Update an existing service |
| `DELETE` | `/services/:id` | Yes (JWT) | Delete a service (restricted if it has bookings) |

### Bookings
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/bookings` | No | Create a new booking (for unauthenticated customers) |
| `GET` | `/bookings` | Yes (JWT) | List bookings (supports `page`, `limit`, `search`, `status`) |
| `GET` | `/bookings/:id` | Yes (JWT) | Retrieve a specific booking |
| `PATCH` | `/bookings/:id/status`| Yes (JWT) | Update a booking's status (`PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`) |
| `DELETE` | `/bookings/:id` | Yes (JWT) | Cancel a booking (changes status to `CANCELLED`) |

## 8. Assumptions Made
- **Service Reads**: `GET /services` and `GET /services/:id` are public so customers can browse before booking. Only `isActive: true` services are returned.
- **Service Writes**: `POST`, `PATCH`, `DELETE` for `/services` are JWT-protected for staff.
- **Booking Rules**: `POST /bookings` is public. All other operations on bookings (`GET`, `PATCH /status`, `DELETE`) are JWT-protected.
- **Date validation**: The "not in the past" rule compares dates strictly by midnight UTC offset to prevent users in different timezones from facing edge-case validation errors.
- **Duplicate Bookings**: Prevented using a unique composite index on `(serviceId, bookingDate, bookingTime)` and gracefully handling the DB error (code 23505).
- **Time Format**: `bookingTime` is treated as a string with the `HH:mm` format.

## 9. Future Improvements
- Role-based access control (Admin vs Staff).
- Email/SMS notifications to customers on status changes (using an event emitter or message queue).
- Rate limiting on public endpoints to prevent abuse.
- Pagination cursor-based instead of offset-based for better performance on large datasets.
- Soft-delete for Services to preserve historical data integrity.
