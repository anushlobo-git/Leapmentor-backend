# LeapMentor — Backend Service

LeapMentor is a full-stack mentorship platform that connects mentors and mentees through structured booking, real-time communication, session management, and verified profiles. This repository contains the backend REST API and Socket.IO server that powers the platform.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [API Reference](#api-reference)
- [Authentication Flows](#authentication-flows)
- [Real-time Events (Socket.IO)](#real-time-events-socketio)
- [Cron Jobs](#cron-jobs)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Overview

The LeapMentor backend provides the following core capabilities:

- JWT-based authentication with Email/Password, Google OAuth, and Clerk SSO (LinkedIn / Apple)
- Mentor and mentee profile onboarding with Cloudinary-backed document and image uploads
- Mentor discovery with search, filtering, and Redis-cached results
- Availability management and slot-based session booking with conflict detection
- Real-time chat and notifications via Socket.IO
- Escrow-based payment flow with admin-controlled refund processing
- Session feedback, shared notes, private notes, and goal tracking
- Admin dashboard with verification workflows, engagement reporting, and commission management
- Scheduled cron jobs for availability cleanup and session reminders

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 5 |
| Database | MongoDB with Mongoose 9 |
| Caching | Redis |
| Real-time | Socket.IO 4 |
| Authentication | JWT, Google OAuth, Clerk SSO |
| File Storage | Cloudinary |
| Email | Nodemailer (SMTP) |
| Push Notifications | Web Push (VAPID) |
| Testing | Jest, Supertest, mongodb-memory-server |
| Deployment | Render |

---

## Project Structure

```
Leapmentor-backend/
├── app.js                    # Express app configuration and middleware registration
├── server.js                 # HTTP server entry point and Socket.IO initialisation
├── config/                   # Database, Cloudinary, Redis, and third-party configurations
├── controllers/              # Thin HTTP layer — receives requests, delegates to services
├── middleware/               # Authentication, role guards, upload handlers, error handling
├── models/                   # Mongoose schema definitions
├── repositories/             # Data access layer — all direct database interactions
├── routes/                   # Express route declarations with validation middleware
├── services/                 # Business logic layer — orchestrates repositories and utilities
├── mappers/                  # DTO mappers — decouples database documents from API responses
├── validations/              # Celebrate/Joi request validation schemas
├── socket/                   # Socket.IO event handlers and room management
├── utils/                    # Shared utilities — caching, email, ICS generation, AppError
├── cron/                     # Scheduled background jobs
├── scripts/                  # One-off admin and migration scripts
└── __tests__/                # Jest test suites
```

---

## Prerequisites

Ensure the following are available before running the project locally:

- **Node.js** v18 or higher
- **npm** v9 or higher
- **MongoDB** — local instance or MongoDB Atlas cluster URI
- **Redis** — local instance or hosted Redis URL
- **Cloudinary** account for file storage
- **SMTP** credentials for transactional email
- **Google Cloud** project with OAuth 2.0 credentials
- **Clerk** account for SSO (LinkedIn / Apple)
- **VAPID keys** for web push notifications (generate via `web-push generate-vapid-keys`)

---

## Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the backend directory
cd Leapmentor-backend

# Install dependencies
npm install
```

---

## Environment Variables

Create a `.env` file in the `Leapmentor-backend` root directory. Use the template below — replace placeholder values with your actual credentials. **Never commit real secrets to version control.**

```env
# ── Server ────────────────────────────────────────────────
PORT=5000
NODE_ENV=development

# ── Database ──────────────────────────────────────────────
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>

# ── Redis ─────────────────────────────────────────────────
REDIS_URL=redis://<host>:<port>

# ── JWT ───────────────────────────────────────────────────
JWT_SECRET=<your_jwt_secret_min_32_chars>

# ── Google OAuth ──────────────────────────────────────────
GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>

# ── Clerk SSO (LinkedIn / Apple) ──────────────────────────
CLERK_SECRET_KEY=<your_clerk_secret_key>

# ── Client URLs ───────────────────────────────────────────
APP_BASE_URL=http://localhost:5173
CLIENT_URL=http://localhost:5173

# ── Email (SMTP) ──────────────────────────────────────────
SMTP_HOST=<smtp_host>
SMTP_PORT=587
SMTP_USER=<smtp_username>
SMTP_PASS=<smtp_password>
FROM_EMAIL=LeapMentor <no-reply@yourdomain.com>

# ── Cloudinary ────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>

# ── Web Push (VAPID) ──────────────────────────────────────
VAPID_PUBLIC_KEY=<vapid_public_key>
VAPID_PRIVATE_KEY=<vapid_private_key>
VAPID_EMAIL=mailto:<your_email>
```

---

## Running the Project

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

The server starts on the port defined by `PORT` in your `.env` file (default: `5000`).

---

## API Reference

All protected routes require the header:
```
Authorization: Bearer <jwt_token>
```

### Authentication — `/auth`

| Method | Endpoint               | Auth| Description                      |
|--------|------------------------|---- |----------------------------------|
| POST   | `/auth/register`       | No  | Register with email and password |
| POST   | `/auth/login`          | No  | Login and receive JWT            |
| POST   | `/auth/google`         | No  | Google OAuth sign-in             |
| POST   | `/auth/verify-otp`     | No  | Verify email via OTP             |
| GET    | `/auth/verify-email`   | No  | Verify email via magic link      |
| POST   | `/auth/resend-otp`     | No  | Resend OTP to email              |
| POST   | `/auth/forgot-password`| No  | Request password reset link      |
| POST   | `/auth/reset-password` | No  | Reset password via token         |
| GET    | `/auth/me`             | Yes | Get authenticated user details   |

### Mentor Profiles — `/mentor-profile`

| Method | Endpoint              | Auth   | Description                  |
|--------|-----------------------|--------|------------------------------|
| POST   | `/mentor-profile`     | Mentor | Create onboarding profile    |
| GET    | `/mentor-profile/me`  | Mentor | Get own profile              |
| PUT    | `/mentor-profile/me`  | Mentor | Update own profile           |
| GET    | `/mentor-profile/:id` | Public | Get published mentor profile |

### Mentee Profiles — `/mentee-profile`

| Method | Endpoint              | Auth   | Description                  |
|--------|-----------------------|--------|------------------------------|
| POST   | `/mentee-profile`     | Mentee | Create onboarding profile    |
| GET    | `/mentee-profile/me`  | Mentee | Get own profile              | 
| PUT    | `/mentee-profile/me`  | Mentee | Update own profile           |
| GET    | `/mentee-profile/:id` | Public | Get published mentee profile |

### File Uploads — `/upload`

| Method | Endpoint                         | Auth   | Description                                 |
|--------|----------------------------------|--------|---------------------------------------------|
| POST   | `/upload/profile-picture`        | Yes    | Upload profile picture to Cloudinary        |
| POST   | `/upload/verification-documents` | Mentor | Upload resume and work experience documents |

### Mentor Discovery — `/mentors`

| Method | Endpoint          | Auth   | Description               |
|--------|-------------------|--------|---------------------------|
| GET    | `/mentors/search` | Mentee | Search and filter mentors |

### Availability — `/availability`

| Method | Endpoint                  | Auth   | Description             |
|--------|---------------------------|--------|-------------------------|
| POST   | `/availability`           | Mentor | Set availability slots  |
| GET    | `/availability/:mentorId` | Yes    | Get mentor availability |
| PUT    | `/availability`           | Mentor | Update availability     |

### Connect Requests — `/connect-requests`

| Method | Endpoint                        | Auth   | Description                     |
|--------|---------------------------------|--------|---------------------------------|
| POST   | `/connect-requests`             | Mentee | Send a connect request          |
| GET    | `/connect-requests/my-requests` | Mentee | Get outgoing requests           |
| GET    | `/connect-requests/incoming`    | Mentor | Get incoming requests           |
| PATCH  | `/connect-requests/:id/respond` | Mentor | Accept or reject a request      |
| PATCH  | `/connect-requests/:id/refer`   | Mentor | Refer request to another mentor |
| DELETE | `/connect-requests/:id`         | Mentee | Cancel a request                |
| GET    | `/connect-requests/ongoing`     | Yes    | Get ongoing sessions            |
| GET    | `/connect-requests/:id`         | Yes    | Get session detail              |

### Payments & Escrow — `/escrow`

| Method | Endpoint                           | Auth   | Description                     |
|--------|------------------------------------|--------|---------------------------------|
| POST   | `/escrow/deposit`                  | Mentee | Deposit to escrow for a session |
| POST   | `/escrow/release`                  | Mentor | Release payment after session   |
| GET    | `/escrow/status/:connectRequestId` | Yes    | Get escrow status               |

### Earnings — `/earnings`

| Method | Endpoint    | Auth   | Description                                  |
|--------|-------------|--------|----------------------------------------------|
| GET    | `/earnings` | Mentor | Get earnings summary and transaction history |

### Feedback — `/feedback`

| Method | Endpoint                      | Auth | Description                        |
|--------|-------------------------------|------|------------------------------------|
| POST   | `/feedback`                   | Yes  | Submit session feedback and rating |
| GET    | `/feedback/:connectRequestId` | Yes  | Get feedback for a session         |

### Chat — `/messages`

| Method | Endpoint                  | Auth | Description                          |
|--------|---------------------------|------|--------------------------------------|
| GET    | `/messages/:connectionId` | Yes  | Get message history for a connection |

### Notes — `/notes` and `/private-notes`

| Method | Endpoint               | Auth | Description                        |
|--------|------------------------|------|------------------------------------|
| POST   | `/notes`               | Yes  | Create a shared session note       |
| GET    | `/notes/:connectionId` | Yes  |  Get shared notes for a connection |
| PATCH  | `/notes/:id`           | Yes  | Update a shared note               |
| DELETE | `/notes/:id`           | Yes  | Delete a shared note               |
| POST   | `/private-notes`       | Yes  | Create a private note              |
| GET    | `/private-notes`       | Yes  | Get own private notes              |

### Reports — `/reports`

| Method | Endpoint      | Auth | Description               |
|--------|---------------|------|---------------------------|
| POST   | `/reports`    | Yes  | Submit a report           |
| GET    | `/reports/me` | Yes  | Get own submitted reports |

### Notifications — `/notifications`

| Method | Endpoint                  | Auth | Description                     |
|--------|---------------------------|------|---------------------------------|
| GET    | `/notifications`          | Yes  | Get all notifications           |
| PATCH  | `/notifications/:id/read` | Yes  | Mark notification as read       |
| PATCH  | `/notifications/read-all` | Yes  |  Mark all notifications as read |

### Admin — `/admin`

| Method | Endpoint                                 | Auth  | Description                               |
|--------|------------------------------------------|-------|-------------------------------------------|
| POST   | `/admin/login`                           | No    | Admin login                               | 
| GET    | `/admin/users`                           | Admin | List all users                            |
| PATCH  | `/admin/users/:id/ban`                   | Admin | Ban a user                                |
| GET    | `/admin/mentor-verifications`            | Admin | List all mentor verification applications |
| PATCH  | `/admin/mentor-verifications/:id/verify` | Admin | Approve mentor verification               |
| PATCH  | `/admin/mentor-verifications/:id/revoke` | Admin | Revoke mentor verification                |
| GET    | `/admin/engagements`                     | Admin | View all connect request engagements      |
| GET    | `/admin/reports`                         | Admin | View all submitted reports                |
| PATCH  | `/admin/reports/:id`                     | Admin | Resolve or dismiss a report               |
| POST   | `/admin/reports/:id/refund`              | Admin | Process mentee refund                     |
| GET    | `/admin/payments`                        | Admin | View all transactions                     |
| GET    | `/admin/settings`                        | Admin | Get platform settings                     |
| PATCH  | `/admin/settings`                        | Admin | Update platform settings                  |
| POST   |  `/admin/settings/add-admin`             | Admin | Provision a new admin account             |

---

## Authentication Flows

### Email / Password

1. `POST /auth/register` — creates user account and sends OTP + magic link to the registered email
2. User verifies identity via OTP or magic link — sets `isEmailVerified = true`
3. `POST /auth/login` — returns a signed JWT on success
4. All protected routes require: `Authorization: Bearer <token>`

### Google OAuth

1. Frontend renders the Google Sign-In button via the GSI library
2. On successful sign-in, Google returns a signed credential JWT
3. Frontend posts the credential to `POST /auth/google`
4. Backend verifies the token with `google-auth-library`, finds or creates the user, and returns a JWT

### Clerk SSO (LinkedIn / Apple)

1. Frontend triggers Clerk's `authenticateWithRedirect` flow
2. After authentication, Clerk redirects to the SSO callback route
3. Backend exchanges the Clerk session token for an internal JWT
4. Role selection and terms acceptance are persisted before redirect to the dashboard

---

## Real-time Events (Socket.IO)

Socket.IO runs on the same HTTP server as Express. Authentication is handled by `socketAuth.js`, which validates the JWT passed in `socket.handshake.auth.token`.

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join_room` | `{ connectionId }` | Join a chat room for a given connection |
| `send_message` | `{ connectionId, content }` | Send a message in a chat room |
| `disconnect` | — | Auto-cleanup on client disconnect |

### Server → Client

| Event | Description |
|---|---|
| `receive_message` | Delivers a new chat message to room members |
| `notification` | Pushes a real-time notification to a specific user |
| `new_connect_request` | Notifies a mentor of an incoming request |
| `request_status_changed` | Notifies participants when a request status changes |
| `request_accepted` | Notifies mentee when their request is accepted |
| `request_declined` | Notifies mentee when their request is declined |
| `request_referred` | Notifies mentee when their request is referred |

---

## Cron Jobs

| File | Schedule | Description |
|---|---|---|
| `cleanupAvailability.js` | Daily at midnight | Removes expired specific-date slots from mentor availability |
| `sessionReminders.js` | Every hour | Sends push notification and email reminders for upcoming sessions |

---

## Testing

```bash
# Run all test suites
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode during development
npm run test:watch
```

Test suites are located in `__tests__/` and use `mongodb-memory-server` — no live database connection is required.

| Suite | Coverage |
|---|---|
| `auth.test.js` | Registration, login, token validation |
| `availability.test.js` | Slot creation, updates, conflict detection |
| `escrow.test.js` | Payment hold and release logic |
| `session.test.js` | Full session lifecycle |

---

## Deployment

The backend is deployed on **Render**.

1. Connect the GitHub repository to your Render service
2. Add all environment variables from the [Environment Variables](#environment-variables) section to the Render dashboard under **Environment**
3. Set the **Start Command** to:
   ```
   node server.js
   ```
4. After the first deploy, add the Render backend URL to:
   - **Google Cloud Console** → Authorised Redirect URIs
   - **Google Cloud Console** → Authorised JavaScript Origins (frontend URL)
   - **Clerk Dashboard** → Allowed redirect URLs