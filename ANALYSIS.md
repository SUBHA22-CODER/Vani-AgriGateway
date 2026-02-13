# Login and Registration Logic Analysis

## Overview
The Vani-Agri Gateway implements a phone-based authentication and registration system designed for farmers using basic feature phones. The system uses phone numbers as the primary identifier for user authentication and session management.

## Authentication Flow

### Login Process
1. **Phone Call Initiation**: Farmer calls the designated phone number
2. **Phone Number Identification**: System extracts caller's phone number from the telephony gateway
3. **Profile Lookup**: System queries the ProfileDatabase using the phone number
4. **User Classification**:
   - If profile exists → Returning user flow
   - If profile doesn't exist → New user registration flow
5. **Session Creation**: New CallSession is created or existing session is resumed
6. **Authentication Complete**: User is authenticated and session is active

### Registration Process
1. **New User Detection**: Phone number not found in ProfileDatabase
2. **Initial Profile Creation**: Minimal profile created with phone number
3. **Information Collection**: System prompts for:
   - Location (state, district, village)
   - Primary crops
   - Preferred language
   - Farm size (optional)
   - Soil type (optional)
4. **Profile Completion**: Collected information is saved to ProfileDatabase
5. **Registration Success**: Full profile created and user can access services

## Database Interaction Files

### ProfileDatabase.ts
**Location**: `src/database/ProfileDatabase.ts`
**Purpose**: Handles all farmer profile data persistence and retrieval
**Key Operations**:
- `createProfile()`: Creates new farmer profile with encrypted phone number
- `getProfile()`: Retrieves profile by phone number
- `updateProfile()`: Updates existing profile information
- `recordInteraction()`: Logs user interactions for history tracking
- `deleteProfile()`: Removes profile (for data privacy compliance)
- `findByLocation()`: Queries profiles by geographic location

**Data Encryption**: Phone numbers are encrypted using base64 encoding before storage

### SessionDatabase.ts
**Location**: `src/database/SessionDatabase.ts`
**Purpose**: Manages active call sessions and session lifecycle
**Key Operations**:
- `createSession()`: Initializes new call session
- `getSession()`: Retrieves session by session ID
- `getActiveSessionByPhone()`: Finds active session for a phone number
- `updateSession()`: Updates session state and context
- `endSession()`: Marks session as completed
- `resumeSession()`: Allows resuming dropped calls within TTL window

**Session Cleanup**: Automatic cleanup task runs every minute to remove expired sessions

## Session Management

### Session Architecture
The system implements a sophisticated session management system that handles:
- Active call sessions
- Session resumption after dropped calls
- Session context preservation
- Automatic session expiry

### Session Lifecycle

1. **Session Creation**
   - Triggered when user calls in
   - Unique session ID generated: `session_{timestamp}_{random}`
   - Session linked to phone number and call ID
   - Initial status set to 'active'

2. **Session Active State**
   - Stores conversation context
   - Tracks interaction history
   - Maintains farmer profile reference
   - Records queries and responses

3. **Session Context Management**
   - `currentTopic`: Active discussion subject
   - `previousQueries`: Query history for context
   - `weatherData`: Cached weather information
   - `marketData`: Cached market prices
   - `detectedCrops`: Crops mentioned in conversation

4. **Session Resumption**
   - If call drops, session remains active for TTL period (default 10 minutes)
   - When user calls back, system resumes previous session
   - Conversation context is preserved
   - Previous queries and data are still available

5. **Session Termination**
   - Natural end: User completes call
   - Timeout: Session expires after TTL period
   - System marks session as 'completed'
   - Session data archived but not immediately deleted

6. **Session Cleanup**
   - Background task runs every 60 seconds
   - Removes completed sessions
   - Removes sessions beyond TTL
   - Cleans up phone number mappings

### Session Security Features

- **Phone Number Isolation**: Each phone can only have one active session
- **Session Validation**: Middleware validates session before processing requests
- **TTL Enforcement**: Sessions automatically expire to prevent stale data
- **Status Tracking**: Session status ('active', 'completed', 'dropped', 'transferred')

## Service Layer Architecture

### FarmerProfileManager.ts
**Location**: `src/services/FarmerProfileManager.ts`
**Purpose**: Business logic layer for profile management
**Key Methods**:
- `getOrCreateProfile()`: Retrieves existing or creates new profile
- `authenticateByPhone()`: Phone-based authentication
- `updateLastInteraction()`: Tracks user activity timestamps

### SessionManager.ts
**Location**: `src/services/SessionManager.ts`
**Purpose**: Business logic layer for session operations
**Key Methods**:
- `startSession()`: Initializes session with farmer profile
- `updateSessionContext()`: Updates conversation context
- `addInteraction()`: Records query-response pairs
- `getSessionHistory()`: Retrieves past sessions for a phone number

### AuthenticationService.ts
**Location**: `src/services/AuthenticationService.ts`
**Purpose**: Unified authentication and authorization service
**Key Methods**:
- `registerFarmer()`: New farmer registration
- `loginFarmer()`: Phone-based login with session creation
- `authenticateCall()`: Validates and creates call session
- `isAuthenticated()`: Checks if phone has active session
- `logout()`: Terminates user session

## Middleware Layer

### SessionMiddleware.ts
**Location**: `src/middleware/SessionMiddleware.ts`
**Purpose**: Request-level session validation and management
**Key Methods**:
- `validateSession()`: Verifies session is active
- `extendSession()`: Updates last activity timestamp
- `requireActiveSession()`: Throws error if no active session
- `handleSessionExpiry()`: Manages expired sessions

## Main Application Integration

### VaniAgriGateway.ts
**Location**: `src/VaniAgriGateway.ts`
**Purpose**: Main application orchestrator
**Key Workflows**:

1. **Incoming Call Handling**
   - Receives phone number and call ID
   - Triggers authentication service
   - Returns appropriate response (new user vs returning user)

2. **Registration Completion**
   - Accepts profile data from user
   - Updates profile in database
   - Confirms successful registration

3. **Call Termination**
   - Ends active session
   - Logs interaction history
   - Cleans up session resources

## Data Flow Summary

1. **Farmer calls** → Telephony Gateway provides phone number + call ID
2. **AuthenticationService.loginFarmer()** → Checks ProfileDatabase
3. **Profile exists?**
   - YES: Load profile, create/resume session
   - NO: Create minimal profile, initiate registration
4. **SessionManager.startSession()** → Creates CallSession in SessionDatabase
5. **During call**: Interactions logged, context updated in session
6. **Call ends** → SessionManager.endSession() → Session marked completed
7. **Cleanup task** → Removes old sessions from SessionDatabase

## Security Considerations

- Phone numbers encrypted in ProfileDatabase
- Session IDs are cryptographically random
- Role-based access controls (mentioned in requirements)
- Automatic session expiry prevents unauthorized access
- Data retention policies (30-day audio, 7-day deletion on request)

## Scalability Features

- In-memory Map storage (can be replaced with Redis/PostgreSQL)
- Automatic session cleanup prevents memory leaks
- Stateless service design allows horizontal scaling
- Session resumption enables fault tolerance
