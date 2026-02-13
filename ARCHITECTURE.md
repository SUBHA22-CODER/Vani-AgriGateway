# Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Applications                          │
│                    (Voice IVR, SMS Service, USSD)                   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 │ HTTP/REST API
                                 │
┌────────────────────────────────▼────────────────────────────────────┐
│                          Express API Server                          │
│                         (src/index.ts)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Authentication Routes                      │  │
│  │  POST /api/auth/register   - Register farmer                │  │
│  │  POST /api/auth/login      - Login and create session       │  │
│  │  GET  /api/auth/profile    - Get farmer profile             │  │
│  │  PUT  /api/auth/profile    - Update farmer profile          │  │
│  │  DELETE /api/auth/profile  - Delete farmer profile          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     Session Routes                            │  │
│  │  GET  /api/sessions/:id          - Get session details       │  │
│  │  PUT  /api/sessions/:id/context  - Update session context    │  │
│  │  POST /api/sessions/:id/end      - End session               │  │
│  │  GET  /api/sessions/active/:phone - Get active sessions      │  │
│  │  POST /api/sessions/:id/resume   - Resume dropped session    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
         ▼                                   ▼
┌────────────────────┐           ┌────────────────────┐
│   Auth Middleware  │           │    Controllers     │
│  (JWT Validation)  │           │  - AuthController  │
│                    │           │  - SessionController│
│ src/middleware/    │           │                    │
│ auth.middleware.ts │           │ src/controllers/   │
└────────────────────┘           └──────┬─────────────┘
                                        │
                                        │
                                        ▼
                          ┌─────────────────────────┐
                          │       Services          │
                          │  - AuthService          │
                          │  - SessionService       │
                          │  - TokenService         │
                          │                         │
                          │  src/services/          │
                          │  src/utils/             │
                          └────┬─────────────┬──────┘
                               │             │
                               │             │
               ┌───────────────┘             └──────────────┐
               │                                            │
               ▼                                            ▼
┌──────────────────────────┐                  ┌──────────────────────────┐
│    PostgreSQL Database   │                  │      Redis Cache         │
│                          │                  │                          │
│  Tables:                 │                  │  Cached Data:            │
│  - farmers               │                  │  - Active sessions       │
│  - sessions              │                  │  - Session context       │
│  - interactions          │                  │                          │
│                          │                  │  TTL: 1 hour (default)   │
│  src/database/           │                  │                          │
│  - connection.ts         │                  │  src/database/           │
│  - schema.ts             │                  │  - redis.ts              │
└──────────────────────────┘                  └──────────────────────────┘
```

## Authentication Flow

```
┌─────────┐                                        ┌─────────────┐
│ Farmer  │                                        │  Database   │
└────┬────┘                                        └──────┬──────┘
     │                                                    │
     │ 1. Call system (first time)                       │
     │────────────────────────────────────┐              │
     │                                    │              │
     │                                    ▼              │
     │                          ┌──────────────────┐     │
     │                          │  IVR collects:   │     │
     │                          │  - Phone number  │     │
     │                          │  - Location      │     │
     │                          │  - Language      │     │
     │                          │  - Crops         │     │
     │                          └────────┬─────────┘     │
     │                                   │               │
     │                                   │               │
     │ 2. POST /auth/register            │               │
     │◄──────────────────────────────────┘               │
     │                                                    │
     │ 3. Create/Update farmer profile                   │
     │───────────────────────────────────────────────────►│
     │                                                    │
     │ 4. Profile saved                                   │
     │◄───────────────────────────────────────────────────│
     │                                                    │
     │ 5. POST /auth/login (phoneNumber, callId)         │
     │────────────────────────────────────┐              │
     │                                    │              │
     │                                    ▼              │
     │                          ┌──────────────────┐     │
     │                          │  Get profile     │     │
     │                          └────────┬─────────┘     │
     │                                   │               │
     │ 6. Query farmer profile           │               │
     │───────────────────────────────────┼──────────────►│
     │                                   │               │
     │ 7. Return profile                 │               │
     │◄──────────────────────────────────┼───────────────│
     │                                   │               │
     │                                   ▼               │
     │                          ┌──────────────────┐     │
     │                          │  Create session  │     │
     │                          │  Generate JWT    │     │
     │                          └────────┬─────────┘     │
     │                                   │               │
     │ 8. Save session                   │               │
     │───────────────────────────────────┼──────────────►│
     │                                   │               │
     │ 9. Return JWT token & session     │               │
     │◄──────────────────────────────────┘               │
     │                                                    │
```

## Session Management Flow

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│  Session State  │     │  PostgreSQL  │     │    Redis     │
└────────┬────────┘     └──────┬───────┘     └──────┬───────┘
         │                     │                    │
         │ 1. Create Session   │                    │
         │─────────────────────►                    │
         │                     │                    │
         │ 2. INSERT session   │                    │
         │                     │                    │
         │ 3. Session saved    │                    │
         │◄────────────────────┘                    │
         │                                          │
         │ 4. Cache session    │                    │
         │──────────────────────────────────────────►
         │                                          │
         │ 5. Session cached (TTL: 1h)              │
         │◄──────────────────────────────────────────
         │                                          │
         │ 6. Get Session (fast path)               │
         │──────────────────────────────────────────►
         │                                          │
         │ 7. Return from cache                     │
         │◄──────────────────────────────────────────
         │                                          │
         │ 8. Update Context                        │
         │─────────────────────►                    │
         │                     │                    │
         │ 9. UPDATE session   │                    │
         │                     │                    │
         │ 10. Context updated │                    │
         │◄────────────────────┘                    │
         │                                          │
         │ 11. Update cache                         │
         │──────────────────────────────────────────►
         │                                          │
         │ 12. Cache updated                        │
         │◄──────────────────────────────────────────
         │                                          │
         │ 13. End Session                          │
         │─────────────────────►                    │
         │                     │                    │
         │ 14. UPDATE status   │                    │
         │                     │                    │
         │ 15. Session ended   │                    │
         │◄────────────────────┘                    │
         │                                          │
         │ 16. Remove from cache                    │
         │──────────────────────────────────────────►
         │                                          │
         │ 17. Cache deleted                        │
         │◄──────────────────────────────────────────
         │                                          │
```

## Database Schema

```
┌─────────────────────────────────────────────────────────┐
│                    farmers (table)                      │
├─────────────────────────────────────────────────────────┤
│  phone_number (PK)         VARCHAR(20)                  │
│  name                      VARCHAR(255)                 │
│  state                     VARCHAR(100) NOT NULL        │
│  district                  VARCHAR(100) NOT NULL        │
│  block                     VARCHAR(100)                 │
│  village                   VARCHAR(100)                 │
│  latitude                  DECIMAL(10,8)                │
│  longitude                 DECIMAL(11,8)                │
│  primary_crops             TEXT[]                       │
│  preferred_language        VARCHAR(20) NOT NULL         │
│  farm_size                 DECIMAL(10,2)                │
│  soil_type                 VARCHAR(100)                 │
│  irrigation_type           VARCHAR(100)                 │
│  communication_channel     VARCHAR(20)                  │
│  callback_time             VARCHAR(20)                  │
│  detail_level              VARCHAR(20)                  │
│  follow_up_enabled         BOOLEAN                      │
│  created_at                TIMESTAMP                    │
│  updated_at                TIMESTAMP                    │
└─────────────────────────────────────────────────────────┘
                          │
                          │ 1:N
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   sessions (table)                      │
├─────────────────────────────────────────────────────────┤
│  session_id (PK)           VARCHAR(255)                 │
│  call_id                   VARCHAR(255)                 │
│  phone_number (FK)         VARCHAR(20) → farmers        │
│  start_time                TIMESTAMP NOT NULL           │
│  end_time                  TIMESTAMP                    │
│  status                    VARCHAR(20) NOT NULL         │
│  current_topic             VARCHAR(255)                 │
│  previous_queries          TEXT[]                       │
│  detected_crops            TEXT[]                       │
│  created_at                TIMESTAMP                    │
└─────────────────────────────────────────────────────────┘
                          │
                          │ 1:N
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 interactions (table)                    │
├─────────────────────────────────────────────────────────┤
│  id (PK)                   SERIAL                       │
│  session_id (FK)           VARCHAR(255) → sessions      │
│  timestamp                 TIMESTAMP                    │
│  channel                   VARCHAR(20) NOT NULL         │
│  query                     TEXT NOT NULL                │
│  response                  TEXT NOT NULL                │
│  satisfaction              INTEGER                      │
│  duration                  INTEGER                      │
└─────────────────────────────────────────────────────────┘
```

## File Structure

```
Vani-AgriGateway/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts         # Authentication endpoints
│   │   └── session.controller.ts      # Session management endpoints
│   │
│   ├── database/
│   │   ├── connection.ts              # PostgreSQL connection pool
│   │   ├── redis.ts                   # Redis connection
│   │   └── schema.ts                  # Database schema initialization
│   │
│   ├── middleware/
│   │   └── auth.middleware.ts         # JWT authentication middleware
│   │
│   ├── services/
│   │   ├── auth.service.ts            # Farmer profile management
│   │   └── session.service.ts         # Session lifecycle management
│   │
│   ├── types/
│   │   └── models.ts                  # TypeScript interfaces
│   │
│   ├── utils/
│   │   └── token.service.ts           # JWT token generation/validation
│   │
│   ├── __tests__/
│   │   └── token.service.test.ts      # Unit tests
│   │
│   └── index.ts                       # Application entry point
│
├── .env.example                       # Environment configuration template
├── .gitignore                         # Git ignore rules
├── package.json                       # Node.js dependencies
├── tsconfig.json                      # TypeScript configuration
├── jest.config.js                     # Jest test configuration
├── API.md                             # API documentation
├── IMPLEMENTATION.md                  # Implementation details
├── SUMMARY.md                         # Implementation summary
└── ARCHITECTURE.md                    # This file
```
