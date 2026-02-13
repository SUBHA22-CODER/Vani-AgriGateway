# Vani-Agri Gateway API

## Quick Start

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` with your database and Redis credentials.

### Database Setup

Ensure PostgreSQL and Redis are running, then start the server. The database tables will be created automatically.

### Build and Run

```bash
npm run build
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## API Reference

### Base URL

```
http://localhost:3000/api
```

### Authentication

Most endpoints require a JWT token obtained from the login endpoint. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Endpoints

#### Register Farmer

**POST** `/auth/register`

Register a new farmer or update existing farmer profile.

**Request Body:**
```json
{
  "phoneNumber": "9876543210",
  "name": "Ramesh Kumar",
  "location": {
    "state": "Karnataka",
    "district": "Mysore",
    "block": "Nanjangud",
    "village": "Mellahalli",
    "coordinates": {
      "latitude": 12.1234,
      "longitude": 76.5678
    }
  },
  "preferredLanguage": "kannada",
  "primaryCrops": ["rice", "sugarcane"]
}
```

**Response:**
```json
{
  "message": "Farmer registered successfully",
  "profile": {
    "phoneNumber": "9876543210",
    "name": "Ramesh Kumar",
    "location": { ... },
    "primaryCrops": ["rice", "sugarcane"],
    "preferredLanguage": "kannada",
    "preferences": {
      "communicationChannel": "voice",
      "detailLevel": "basic",
      "followUpEnabled": true
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Login

**POST** `/auth/login`

Authenticate farmer and create a new call session.

**Request Body:**
```json
{
  "phoneNumber": "9876543210",
  "callId": "call-12345"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "session": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "callId": "call-12345",
    "phoneNumber": "9876543210",
    "startTime": "2024-01-01T12:00:00.000Z",
    "status": "active",
    "context": {
      "previousQueries": []
    }
  },
  "profile": { ... }
}
```

#### Get Farmer Profile

**GET** `/auth/profile/:phoneNumber`

Retrieve farmer profile information.

**Response:**
```json
{
  "profile": {
    "phoneNumber": "9876543210",
    "name": "Ramesh Kumar",
    "location": { ... },
    "primaryCrops": ["rice", "sugarcane"],
    "preferredLanguage": "kannada",
    "preferences": { ... }
  }
}
```

#### Update Farmer Profile

**PUT** `/auth/profile/:phoneNumber`

Update farmer profile information. Requires authentication.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Ramesh Kumar Reddy",
  "primaryCrops": ["rice", "sugarcane", "cotton"],
  "farmSize": 5.5
}
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "profile": { ... }
}
```

#### Delete Farmer Profile

**DELETE** `/auth/profile/:phoneNumber`

Delete farmer profile. Requires authentication.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Profile deleted successfully"
}
```

#### Get Session

**GET** `/sessions/:sessionId`

Retrieve session details. Requires authentication.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "session": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "callId": "call-12345",
    "phoneNumber": "9876543210",
    "startTime": "2024-01-01T12:00:00.000Z",
    "status": "active",
    "context": {
      "currentTopic": "pest_control",
      "previousQueries": ["weather forecast", "pest identification"],
      "detectedCrops": ["rice"]
    }
  }
}
```

#### Update Session Context

**PUT** `/sessions/:sessionId/context`

Update session context during interaction. Requires authentication.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentTopic": "market_prices",
  "previousQueries": ["weather forecast", "pest identification", "rice prices"],
  "detectedCrops": ["rice", "sugarcane"]
}
```

**Response:**
```json
{
  "message": "Session context updated successfully"
}
```

#### End Session

**POST** `/sessions/:sessionId/end`

End an active session. Requires authentication.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Session ended successfully"
}
```

#### Get Active Sessions

**GET** `/sessions/active/:phoneNumber`

Get all active sessions for a farmer. Requires authentication.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "sessions": [
    {
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "callId": "call-12345",
      "phoneNumber": "9876543210",
      "startTime": "2024-01-01T12:00:00.000Z",
      "status": "active",
      "context": { ... }
    }
  ]
}
```

#### Resume Session

**POST** `/sessions/:sessionId/resume`

Resume a dropped session (within 10 minutes). Requires authentication.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Session resumed successfully",
  "session": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    ...
  }
}
```

#### Health Check

**GET** `/health`

Check API server health status.

**Response:**
```json
{
  "status": "ok"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields: phoneNumber, location, preferredLanguage, primaryCrops"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid or expired token"
}
```

### 404 Not Found
```json
{
  "error": "Farmer profile not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Supported Languages

- hindi
- tamil
- telugu
- kannada
- bengali
- gujarati
- english

## Session Status Values

- `active` - Session is currently active
- `completed` - Session ended normally
- `dropped` - Session ended due to disconnection
- `transferred` - Session transferred to human operator
