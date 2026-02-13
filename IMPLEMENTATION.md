# Login and Registration Logic Implementation

## Overview

This implementation provides a complete authentication and session management system for the Vani-Agri Gateway platform. The system is designed to handle farmer registration, login, profile management, and session tracking through a RESTful API.

## Architecture

### Database Layer

#### PostgreSQL Database
The system uses PostgreSQL as the primary database for persistent storage of farmer profiles and session data.

**Tables:**

1. **farmers** - Stores farmer profile information
   - Primary Key: `phone_number`
   - Stores location data (state, district, block, village, coordinates)
   - Stores agricultural data (primary crops, farm size, soil type, irrigation type)
   - Stores preferences (language, communication channel, detail level)
   - Includes timestamps for creation and updates

2. **sessions** - Stores call session information
   - Primary Key: `session_id`
   - Foreign Key: `phone_number` references farmers table
   - Tracks session status (active, completed, dropped, transferred)
   - Stores session context (current topic, previous queries, detected crops)
   - Includes call metadata (call_id, start/end times)

3. **interactions** - Stores individual farmer interactions
   - Links to sessions via `session_id`
   - Records query-response pairs
   - Tracks satisfaction ratings and interaction duration

**File:** `src/database/connection.ts`
- Implements PostgreSQL connection pooling
- Provides query execution interface
- Handles connection lifecycle and error management

**File:** `src/database/schema.ts`
- Defines database schema initialization
- Creates tables and indexes
- Ensures database structure consistency

#### Redis Cache
Redis is used for session state caching to improve performance and reduce database load.

**File:** `src/database/redis.ts`
- Manages Redis connection
- Provides session caching with TTL (Time To Live)
- Supports fast session retrieval and updates

**Session Storage Strategy:**
- Active sessions are cached in Redis with configurable expiry (default: 1 hour)
- Session data is also persisted in PostgreSQL for durability
- Cache miss triggers database lookup and repopulates cache

### Authentication Flow

#### Registration Process

**Endpoint:** `POST /api/auth/register`

**Flow:**
1. Client sends farmer data (phone number, location, language, crops)
2. System validates required fields
3. AuthService creates or updates farmer profile in database
4. Uses UPSERT (INSERT ... ON CONFLICT UPDATE) to handle re-registration
5. Returns created/updated farmer profile

**File:** `src/services/auth.service.ts` - Method: `registerFarmer()`

**Database Interaction:**
```sql
INSERT INTO farmers (phone_number, name, state, district, ...)
VALUES (...)
ON CONFLICT (phone_number) 
DO UPDATE SET ... 
RETURNING *;
```

This approach ensures:
- First-time registration creates new profile
- Re-registration updates existing profile without errors
- Atomic operation prevents race conditions

#### Login Process

**Endpoint:** `POST /api/auth/login`

**Flow:**
1. Client sends phone number and call ID
2. System retrieves farmer profile from database
3. If profile doesn't exist, returns 404 error
4. SessionService creates new active session
5. Session stored in both PostgreSQL and Redis
6. TokenService generates JWT token with phone number and session ID
7. Returns token, session details, and farmer profile

**File:** `src/services/auth.service.ts` - Method: `getFarmerProfile()`
**File:** `src/services/session.service.ts` - Method: `createSession()`
**File:** `src/utils/token.service.ts` - Method: `generateToken()`

**Session Creation:**
```sql
INSERT INTO sessions (session_id, call_id, phone_number, start_time, status, ...)
VALUES (...)
RETURNING *;
```

Redis caching:
```
SET session:{sessionId} {json_data} EX {expiry_seconds}
```

### Session Management

#### Session Lifecycle

1. **Creation** - New session created during login
2. **Active** - Session in use during farmer interaction
3. **Context Updates** - Session context updated as conversation progresses
4. **Completion** - Session marked as completed when call ends
5. **Resumption** - Dropped sessions can be resumed within 10 minutes

**File:** `src/services/session.service.ts`

#### Session State Management

**Key Methods:**

1. `createSession()` - Creates new session with unique ID
   - Generates UUID for session ID
   - Stores in PostgreSQL for persistence
   - Caches in Redis for fast access
   - Associates with farmer profile if available

2. `getSession()` - Retrieves session data
   - Checks Redis cache first (fast path)
   - Falls back to PostgreSQL on cache miss
   - Repopulates cache after database lookup
   - Handles date/time deserialization

3. `updateSessionContext()` - Updates session context
   - Modifies current topic, queries, detected crops
   - Updates both database and cache
   - Maintains consistency across storage layers

4. `endSession()` - Terminates active session
   - Sets status to 'completed'
   - Records end time
   - Removes from Redis cache
   - Keeps in PostgreSQL for historical records

5. `resumeSession()` - Restores dropped session
   - Validates session was dropped recently (< 10 minutes)
   - Reactivates session status
   - Re-caches in Redis
   - Allows farmers to continue interrupted calls

**Context Tracking:**
- `currentTopic` - Current conversation subject
- `previousQueries` - Array of farmer's past queries
- `detectedCrops` - Crops mentioned in conversation

### Token-Based Authentication

**File:** `src/utils/token.service.ts`

**JWT Token Structure:**
```json
{
  "phoneNumber": "9876543210",
  "sessionId": "uuid-v4-session-id",
  "iat": 1234567890,
  "exp": 1234654290
}
```

**Token Lifecycle:**
1. Generated during login with configurable expiry (default: 24 hours)
2. Signed with secret key from environment variables
3. Sent to client in login response
4. Client includes in Authorization header for authenticated requests
5. Middleware validates token on protected endpoints

**File:** `src/middleware/auth.middleware.ts`

**Authentication Flow:**
1. Extract token from `Authorization: Bearer {token}` header
2. Verify token signature and expiry
3. Decode payload to get phone number and session ID
4. Attach user data to request object
5. Allow request to proceed or return 401 error

### API Endpoints

#### Authentication Endpoints

**POST /api/auth/register**
- Registers new farmer or updates existing profile
- Public endpoint (no authentication required)
- Returns farmer profile

**POST /api/auth/login**
- Authenticates farmer and creates session
- Public endpoint (no authentication required)
- Returns JWT token, session, and profile

**GET /api/auth/profile/:phoneNumber**
- Retrieves farmer profile
- Public endpoint (no authentication required)
- Returns farmer profile or 404

**PUT /api/auth/profile/:phoneNumber**
- Updates farmer profile
- Requires authentication
- Returns updated profile

**DELETE /api/auth/profile/:phoneNumber**
- Deletes farmer profile and all associated data
- Requires authentication
- Returns success message

#### Session Endpoints

**GET /api/sessions/:sessionId**
- Retrieves session details
- Requires authentication
- Returns session data

**PUT /api/sessions/:sessionId/context**
- Updates session context (topics, queries, crops)
- Requires authentication
- Returns success message

**POST /api/sessions/:sessionId/end**
- Ends active session
- Requires authentication
- Returns success message

**GET /api/sessions/active/:phoneNumber**
- Lists all active sessions for a farmer
- Requires authentication
- Returns array of sessions

**POST /api/sessions/:sessionId/resume**
- Resumes a dropped session (if within 10 minutes)
- Requires authentication
- Returns session data or 404

### Data Flow Examples

#### Farmer Registration and First Call

1. Farmer calls the system for the first time
2. IVR collects: phone number, location, preferred language, primary crops
3. System calls `POST /api/auth/register` with collected data
4. Database creates farmer profile
5. System calls `POST /api/auth/login` with phone number and call ID
6. New session created and cached
7. JWT token generated
8. IVR uses token for subsequent authenticated calls
9. As conversation progresses, system calls `PUT /api/sessions/:sessionId/context`
10. When call ends, system calls `POST /api/sessions/:sessionId/end`

#### Returning Farmer Call

1. Farmer calls the system
2. System identifies phone number
3. System calls `POST /api/auth/login` with phone number and new call ID
4. Existing farmer profile retrieved
5. New session created with profile data
6. JWT token generated
7. IVR has access to farmer's history and preferences
8. Personalized responses based on location and crops

#### Dropped Call Resumption

1. Call drops unexpectedly
2. Session status updated to 'dropped'
3. Farmer calls back within 10 minutes
4. System calls `POST /api/sessions/:sessionId/resume`
5. Previous session reactivated
6. Context preserved (previous queries, current topic)
7. Farmer continues conversation seamlessly

### Security Considerations

1. **Password-less Authentication** - Uses phone number as primary identifier (suitable for telephony systems)
2. **JWT Tokens** - Stateless authentication with expiry
3. **Environment Variables** - Sensitive data (DB credentials, JWT secret) stored in .env
4. **Data Encryption** - PostgreSQL supports encryption at rest (configuration dependent)
5. **HTTPS** - Should be enforced in production deployment
6. **Input Validation** - All endpoints validate required fields
7. **SQL Injection Prevention** - Uses parameterized queries
8. **Rate Limiting** - Should be added in production (not implemented in minimal version)

### Performance Optimization

1. **Connection Pooling** - PostgreSQL connection pool (max 20 connections)
2. **Redis Caching** - Active sessions cached for fast retrieval
3. **Database Indexes** - Indexes on phone_number, district, language, session status
4. **Lazy Loading** - Farmer profiles only loaded when needed
5. **Session Expiry** - Automatic cleanup of inactive sessions via TTL

### Error Handling

1. **Database Errors** - Caught and logged with generic error responses
2. **Validation Errors** - Return 400 with specific error messages
3. **Not Found Errors** - Return 404 for missing resources
4. **Authentication Errors** - Return 401 for invalid/expired tokens
5. **Server Errors** - Return 500 for unexpected failures

### Configuration

**Environment Variables (.env):**
- `DATABASE_HOST` - PostgreSQL host
- `DATABASE_PORT` - PostgreSQL port
- `DATABASE_NAME` - Database name
- `DATABASE_USER` - Database user
- `DATABASE_PASSWORD` - Database password
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port
- `JWT_SECRET` - Secret key for JWT signing
- `JWT_EXPIRY` - Token expiration time
- `SESSION_EXPIRY` - Session cache TTL in seconds
- `PORT` - API server port

### Deployment Considerations

1. **Database Setup** - Run PostgreSQL with proper credentials
2. **Redis Setup** - Run Redis instance for caching
3. **Environment Configuration** - Copy .env.example to .env and configure
4. **Build Process** - TypeScript compilation to JavaScript
5. **Process Management** - Use PM2 or similar for production
6. **Monitoring** - Add logging and monitoring tools
7. **Scaling** - Horizontal scaling supported (stateless design)

### Future Enhancements

1. **OTP Verification** - Add SMS-based one-time password verification
2. **Multi-Factor Authentication** - Additional security layer
3. **Session Analytics** - Track usage patterns and metrics
4. **Audit Logging** - Detailed activity logs for compliance
5. **Data Backup** - Automated backup strategies
6. **Load Balancing** - Multi-instance deployment with load balancer
