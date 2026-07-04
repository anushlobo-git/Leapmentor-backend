# API Documentation & Rate Limiting Guide

This document covers the LeapMentor backend API documentation system (Swagger/OpenAPI) and the rate limiting strategy.

## Table of Contents

- [Swagger/OpenAPI Documentation](#swaggeropenapi-documentation)
- [Accessing Swagger UI](#accessing-swagger-ui)
- [API Structure](#api-structure)
- [Rate Limiting](#rate-limiting)
- [Rate Limiter Configuration](#rate-limiter-configuration)
- [Handling Rate Limit Responses](#handling-rate-limit-responses)

---

## Swagger/OpenAPI Documentation

The LeapMentor API is fully documented using **OpenAPI 3.0.0** specification. This documentation is automatically generated and served via Swagger UI.

### What is Swagger/OpenAPI?

- **OpenAPI Specification**: A standardized format for describing REST APIs
- **Swagger UI**: An interactive web interface to explore and test API endpoints
- **Benefits**:
  - Clear endpoint documentation with request/response examples
  - Interactive testing directly from the browser
  - Schema validation and auto-generated client SDKs
  - Self-documenting API reduces the need for separate docs

### Documentation Files Location

All Swagger configuration files are located in:

```
Leapmentor-backend/config/swagger/
├── index.js                    # Main OpenAPI spec definition
├── schemas/                    # Reusable component schemas
│   ├── common.js              # Common schema definitions (Error, Success, etc.)
│   ├── auth.js                # Authentication schemas
│   ├── profiles.js            # User profile schemas
│   ├── connectRequest.js       # Session/Connect request schemas
│   ├── admin.js               # Admin-specific schemas
│   └── misc.js                # Miscellaneous schemas
└── paths/                      # Endpoint definitions grouped by feature
    ├── auth.js                # Authentication endpoints
    ├── usersAndProfiles.js    # User and profile endpoints
    ├── connectAndSessions.js  # Session booking endpoints
    ├── financial.js           # Payment and transaction endpoints
    └── administrative.js      # Admin dashboard endpoints
```

---

## Accessing Swagger UI

### Local Development

1. Start the backend server:

   ```bash
   cd Leapmentor-backend
   npm run dev
   ```

2. Open your browser and navigate to:

   ```
   http://localhost:5000/api-docs
   ```

3. You'll see the interactive Swagger UI with all available endpoints

### Production

Swagger UI is also available on the production server at:

```
https://api.leapmentor.com/api-docs
```

### Using Swagger UI

- **Browse endpoints**: Click on endpoint names to expand and see details
- **View schemas**: See request/response body structures
- **Try it out**: Use the "Try it out" button to test endpoints directly
- **Authentication**: Use the lock icon to add JWT tokens or cookies
- **View examples**: Each endpoint shows example request/response bodies

---

## API Structure

### Base URL

- **Local Development**: `http://localhost:5000/api/v1`
- **Production**: `https://api.leapmentor.com/api/v1`

### Endpoint Categories

#### 1. **Authentication** (`/auth`)

- User registration and login
- Password reset and email verification
- OAuth flows (Google, LinkedIn, Apple via Clerk)
- Token refresh and logout

**Swagger Definition**: `config/swagger/paths/auth.js`

Example endpoints:

```
POST   /auth/register          # Register new user
POST   /auth/login             # Login with credentials
POST   /auth/google-callback   # Google OAuth callback
POST   /auth/refresh           # Refresh JWT token
```

#### 2. **Users & Profiles** (`/users`, `/mentors`, `/mentees`)

- User profile management
- Mentor and mentee onboarding
- Profile verification and document uploads
- Profile search and filtering

**Swagger Definition**: `config/swagger/paths/usersAndProfiles.js`

Example endpoints:

```
GET    /users/:id              # Get user profile
PUT    /users/:id              # Update user profile
GET    /mentors                # Search mentors
POST   /mentees/:id/profile    # Create mentee profile
```

#### 3. **Sessions & Bookings** (`/connect-requests`, `/sessions`, `/goals`, `/notes`)

- Session discovery and booking
- Availability management
- Slot locking and conflict resolution
- Session feedback and goal tracking
- Shared and private notes

**Swagger Definition**: `config/swagger/paths/connectAndSessions.js`

Example endpoints:

```
POST   /connect-requests              # Create booking request
GET    /connect-requests/:id/slots    # Get available slots
PATCH  /connect-requests/:id/approve  # Approve session
POST   /sessions/:id/notes            # Add session notes
```

#### 4. **Payments & Escrow** (`/transactions`, `/wallets`, `/payments`)

- Transaction history
- Wallet management
- Escrow payment processing
- Invoice generation and PDF export

**Swagger Definition**: `config/swagger/paths/financial.js`

Example endpoints:

```
GET    /transactions              # Get transaction history
POST   /wallets/:id/release       # Release escrow payment
GET    /invoices/:id/pdf          # Download invoice as PDF
```

#### 5. **Admin Dashboard** (`/admin`)

- User verification workflows
- Engagement reporting
- Commission management
- Support ticket handling
- Platform analytics

**Swagger Definition**: `config/swagger/paths/administrative.js`

Example endpoints:

```
GET    /admin/stats              # Platform statistics
PATCH  /admin/users/:id/verify   # Verify user
GET    /admin/reports            # Engagement reports
```

---

## Rate Limiting

Rate limiting protects the API from abuse and ensures fair resource distribution across all users.

### Why Rate Limiting?

- **Prevents DDoS attacks**: Blocks excessive traffic from single sources
- **Protects resources**: Ensures server CPU/memory isn't exhausted
- **Fair usage**: Prevents one user from monopolizing the API
- **Cost control**: Caps potential abuse-driven costs for third-party services
- **Data security**: Throttles brute force attacks on auth endpoints

### Rate Limiter Configuration

Rate limits are managed via **Redis** for distributed tracking and **express-rate-limit** for enforcement.

#### Current Rate Limits

| Limiter                   | Endpoint           | Window   | Max Requests | Tracking      | Purpose                     |
| ------------------------- | ------------------ | -------- | ------------ | ------------- | --------------------------- |
| **apiLimiter**            | `/api/v1/*`        | 15 min   | 1000         | IP address    | General API access          |
| **authLimiter**           | `/api/v1/auth/*`   | 15 min   | 1000         | Email or IP   | Authentication attempts     |
| **aiLimiter**             | `/api/v1/ai/*`     | 1 hour   | 2000         | User ID or IP | AI service requests         |
| **connectRequestLimiter** | Booking creation   | 24 hours | 500          | User ID       | Connection request creation |
| **bookingLimiter**        | Session booking    | 1 hour   | 1000         | User ID       | Prevents booking spam       |
| **escrowLimiter**         | Payment processing | 1 hour   | 2000         | User ID       | Payment attempt throttling  |

#### Configuration Details

**Location**: `middleware/rateLimiter.js`

```javascript
// Example: authLimiter configuration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 1000, // 1000 requests per window
  store: makeStore("rl:auth:"), // Redis store with "rl:auth:" prefix
  keyGenerator: (req) => {
    const email = req.body?.email?.toLowerCase() || "";
    if (email) return `email:${email}`;
    return `ip:${getIP(req)}`; // Fall back to IP if no email
  },
  message: {
    success: false,
    message: "Too many auth attempts, please try again in 15 minutes.",
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});
```

#### IP Detection

For production deployments behind reverse proxies (Nginx, CloudFlare, etc.), the limiter correctly extracts the client IP:

```javascript
const getIP = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : req.socket?.remoteAddress || req.ip;
  return ip?.replace(/^::ffff:/, "") || "unknown";
};
```

---

## Handling Rate Limit Responses

### Success Response

When a request succeeds and you're under the limit:

```http
HTTP/1.1 200 OK
RateLimit-Limit: 1000
RateLimit-Remaining: 999
RateLimit-Reset: 1719792000

{
  "success": true,
  "data": { ... }
}
```

### Rate Limit Exceeded Response

When you exceed the limit:

```http
HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 1000
RateLimit-Remaining: 0
RateLimit-Reset: 1719792000
Retry-After: 900

{
  "success": false,
  "message": "Too many requests, please try again later."
}
```

### Headers Explained

- **RateLimit-Limit**: Maximum requests allowed in the window
- **RateLimit-Remaining**: How many requests are left in the current window
- **RateLimit-Reset**: Unix timestamp when the window resets
- **Retry-After**: Seconds to wait before retrying

### Client-Side Handling

#### JavaScript/Fetch Example

```javascript
const makeRequest = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      console.warn(`Rate limited. Retry after ${retryAfter} seconds`);

      // Wait and retry
      await new Promise((resolve) =>
        setTimeout(resolve, parseInt(retryAfter) * 1000),
      );
      return makeRequest(url, options); // Recursive retry
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Request failed:", error);
    throw error;
  }
};
```

#### Axios Example

```javascript
const api = axios.create({
  baseURL: "http://localhost:5000/api/v1",
});

// Interceptor to handle rate limit responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers["retry-after"];
      console.warn(`Rate limited. Retrying after ${retryAfter}s`);

      await new Promise((resolve) =>
        setTimeout(resolve, parseInt(retryAfter) * 1000),
      );

      return api.request(error.config); // Retry original request
    }
    return Promise.reject(error);
  },
);
```

---

## Best Practices

### For API Consumers

1. **Check Rate Limit Headers**: Always inspect `RateLimit-Remaining` before sending critical requests
2. **Implement Exponential Backoff**: If rate limited, wait longer between retries
3. **Batch Requests**: Combine multiple operations into fewer API calls
4. **Cache Results**: Store responses locally when possible to reduce API calls
5. **Monitor Headers**: Watch `RateLimit-Reset` to know when limits refresh

### For Backend Developers

1. **Update Limits Carefully**: Rate limits are in `middleware/rateLimiter.js`
2. **Test Changes**: Always test rate limiter changes in a staging environment first
3. **Monitor Redis**: Ensure Redis is running and monitoring rate limit data
4. **Log Violations**: Check server logs for repeated limit violations (potential attack)
5. **Document Changes**: Update this file when changing rate limits

### Adjusting Rate Limits

To modify rate limits, edit `middleware/rateLimiter.js`:

```javascript
// Example: Increase auth limit to 2000 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // ← Change this value
  // ... rest of config
});
```

Then restart the backend:

```bash
npm run dev
```

---

## Swagger Definition Example

Here's how an endpoint is documented in Swagger:

**File**: `config/swagger/paths/auth.js`

```javascript
module.exports = {
  "/auth/login": {
    post: {
      tags: ["Authentication"],
      summary: "User login with email and password",
      description: "Authenticate a user and receive JWT token",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: { type: "string", format: "email" },
                password: { type: "string", minLength: 6 },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Login successful",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginResponse" },
            },
          },
        },
        401: { $ref: "#/components/responses/UnauthorizedError" },
        429: {
          description: "Rate limit exceeded",
          headers: {
            "Retry-After": { schema: { type: "integer" } },
          },
        },
      },
    },
  },
};
```

---

## Monitoring & Debugging

### Check Rate Limiter Status

View Redis keys tracking rate limits:

```bash
redis-cli
> KEYS "rl:*"
> GET "rl:auth:email:user@example.com"
```

### Enable Debug Logging

Add this to your environment to log rate limiter activity:

```bash
export DEBUG=express-rate-limit
npm run dev
```

### Monitor via BetterStack

Rate limit violations and patterns are logged through Winston/BetterStack:

```
Filter logs: "Too many requests" or "Too many auth attempts"
Alert on: Patterns indicating brute force attacks
```

---

## Summary

| Feature                 | Details                                               |
| ----------------------- | ----------------------------------------------------- |
| **Documentation**       | OpenAPI 3.0.0 spec at `/api-docs`                     |
| **Interactive Testing** | Swagger UI at `http://localhost:5000/api-docs`        |
| **General API Limit**   | 1000 req / 15 min per IP                              |
| **Auth Limit**          | 1000 req / 15 min per email/IP                        |
| **Rate Limit Headers**  | RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset |
| **Storage**             | Redis with key prefix tracking                        |
| **Client Handling**     | Use Retry-After header for backoff                    |

For questions or to update rate limits, refer to `middleware/rateLimiter.js` and this documentation.
