# PROJECT_STRUCTURE.md

# LeapMentor Backend — Project Structure

## Table of Contents

* Overview
* Architecture Overview
* Root Directory Layout
* Complete Project Structure
* Directory Reference

  * Root Files
  * `config/`
  * `container/`
  * `controllers/`
  * `services/`
  * `repositories/`
  * `models/`
  * `mappers/`
  * `routes/`
  * `middleware/`
  * `validations/`
  * `gateways/`
  * `socket/`
  * `cron/`
  * `utils/`
  * `docs/`
  * `scripts/`
  * `migrations/`
  * `swagger/`
  * `__tests__/`
* Three-Layer Architecture
* Dependency Injection
* Request Lifecycle
* Response Contract
* Error Handling
* Naming Conventions

---

# Overview

The **LeapMentor Backend** is a modular, enterprise-grade Node.js application built using a layered architecture and Dependency Injection (DI). The project emphasizes strict separation of concerns, allowing each component to evolve independently while remaining highly testable and maintainable.

The application is organized around business domains rather than technical complexity, making the codebase easy to navigate as it scales.

---

# Architecture Overview

The project follows three primary architectural principles:

* **Three-Layer Architecture**
* **Dependency Injection (IoC)**
* **Repository Pattern**

This keeps HTTP handling, business rules, and database access completely isolated.

```
HTTP Request
      │
      ▼
 Controller
      │
      ▼
  Service Layer
      │
      ▼
 Repository Layer
      │
      ▼
   Database
```

---

# Root Directory Layout

```
Leapmentor-backend/
├── app.js
├── server.js
├── package.json
├── Dockerfile
├── README.md
├── CHANGELOG.md
├── LICENSE
├── instrument.js
├── config/
├── container/
├── controllers/
├── cron/
├── docs/
├── gateways/
├── mappers/
├── middleware/
├── migrations/
├── models/
├── repositories/
├── routes/
├── scripts/
├── services/
├── socket/
├── swagger/
├── utils/
├── validations/
└── __tests__/
```

---

# Complete Project Structure

```text
Leapmentor-backend/
├── __tests__/
├── config/
│   ├── swagger/
│   ├── cloudinary.js
│   ├── context.js
│   ├── db.js
│   ├── env.js
│   ├── logger.js
│   └── redis.js
├── container/
│   ├── controllers.js
│   ├── infrastructure.js
│   ├── repositories.js
│   ├── routers.js
│   ├── services.js
│   └── index.js
├── controllers/
├── cron/
├── docs/
├── gateways/
├── mappers/
├── middleware/
├── migrations/
├── models/
├── repositories/
├── routes/
├── scripts/
├── services/
├── socket/
├── swagger/
├── utils/
├── validations/
├── app.js
├── server.js
├── Dockerfile
├── package.json
└── README.md
```

---

# Directory Reference

## Root Files

The root directory contains the application's entry points, runtime configuration, deployment assets, and development tooling.

| File                       | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `app.js`                   | Creates and configures the Express application |
| `server.js`                | Starts the HTTP server                         |
| `package.json`             | Dependency and script management               |
| `package-lock.json`        | Dependency lock file                           |
| `Dockerfile`               | Container image configuration                  |
| `instrument.js`            | Application instrumentation (APM/Tracing)      |
| `CHANGELOG.md`             | Release history                                |
| `README.md`                | Project overview                               |
| `.editorconfig`            | Editor configuration                           |
| `.prettierrc`              | Formatting rules                               |
| `eslint.config.js`         | Linting configuration                          |
| `sonar-project.properties` | SonarQube configuration                        |

---

# config/

Contains centralized runtime configuration.

```
config/
├── cloudinary.js
├── context.js
├── db.js
├── env.js
├── logger.js
├── redis.js
└── swagger/
```

### Responsibilities

* Environment validation
* Database initialization
* Redis configuration
* Logging
* Cloudinary integration
* Swagger configuration
* Shared runtime context

---

# container/

Implements the application's Dependency Injection container.

```
container/
├── controllers.js
├── infrastructure.js
├── repositories.js
├── routers.js
├── services.js
└── index.js
```

### Responsibilities

* Dependency registration
* Service construction
* Repository wiring
* Controller injection
* Infrastructure initialization

No controller or service manually instantiates another layer.

---

# controllers/

The HTTP interface layer.

Responsibilities include:

* Reading request parameters
* Reading query strings
* Reading request body
* Calling service methods
* Returning standardized responses
* Never containing business logic

Example:

```
Client
    │
    ▼
Controller
    │
    ▼
Service
```

---

# services/

Contains all business rules.

Examples:

* Authentication
* Mentor onboarding
* Session scheduling
* Escrow workflows
* Notifications
* AI integrations

Responsibilities:

* Business validation
* Cross-repository coordination
* Domain workflows
* Transaction orchestration

Services never know about Express request or response objects.

---

# repositories/

Database abstraction layer.

Responsibilities include:

* MongoDB queries
* CRUD operations
* Aggregation pipelines
* Pagination
* Filtering
* Index-aware querying

Services never directly call Mongoose models.

Instead:

```
Service
    │
    ▼
Repository
    │
    ▼
Model
```

---

# models/

Contains Mongoose schema definitions.

Responsibilities:

* Collection schemas
* Indexes
* Field validation
* Virtuals
* Middleware (hooks)

Examples:

```
AdminUser.js
Availability.js
User.js
MentorProfile.js
```

---

# mappers/

Maps database entities into API-safe DTOs.

Responsibilities:

* Remove internal fields
* Normalize output
* Hide sensitive information
* Build response objects

Example:

```
Database Model
      │
      ▼
Mapper
      │
      ▼
API Response
```

---

# routes/

Defines API endpoints.

Responsibilities:

* Route registration
* Middleware composition
* Validation chaining
* Controller mapping

Example:

```
POST /auth/login

↓

Validation

↓

Authentication Middleware

↓

Controller

↓

Service
```

---

# middleware/

Reusable request-processing functions.

Includes:

* Authentication
* Authorization
* Error handling
* Request preprocessing
* Logging
* Context creation

Middleware executes before controllers.

---

# validations/

Contains request validation schemas.

Built using Joi.

Responsibilities:

* Validate request body
* Validate query parameters
* Validate URL params
* Reject malformed requests before business logic executes

Example:

```
Request

↓

Validation

↓

Controller
```

---

# gateways/

External service integrations.

Current responsibilities include:

* AI provider communication
* External API adapters
* Response normalization
* Retry logic

Acts as the boundary between the application and third-party systems.

---

# socket/

Real-time communication layer.

Components:

* Socket authentication
* Event registration
* Room management
* Connection lifecycle
* Live notifications

---

# cron/

Contains scheduled jobs.

Examples include:

* Background cleanup
* Scheduled notifications
* Payment reconciliation
* Escrow release
* Reminder processing

Runs independently of HTTP requests.

---

# utils/

Shared helper functions.

Includes utilities for:

* Error handling
* Authentication
* Email delivery
* Calendar generation
* Invoice generation
* Retry logic
* Token generation
* Slot generation
* Notifications

Utilities remain stateless and reusable.

---

# docs/

Contains project documentation.

Typical contents:

* Architecture guides
* Development standards
* API documentation
* Internal design notes

---

# swagger/

Contains OpenAPI documentation.

Responsibilities:

* Endpoint definitions
* Request schemas
* Response schemas
* Authentication documentation

---

# scripts/

Standalone executable scripts.

Examples:

* Seed initial admin
* Seed platform configuration
* Data migration helpers
* One-time maintenance utilities

Executed manually when needed.

---

# migrations/

Contains database migration scripts.

Responsibilities:

* Schema evolution
* Data migration
* Rollbacks
* Version tracking

---

# **tests**/

Contains automated test suites.

Includes:

* Unit tests
* Integration tests
* Repository tests
* Service tests
* Controller tests

Supports dependency injection and mocking for isolated testing.

---

# Three-Layer Architecture

The application enforces strict separation between transport, business logic, and persistence.

```
             HTTP Request
                   │
                   ▼
        ┌───────────────────┐
        │    Controller     │
        └───────────────────┘
                   │
                   ▼
        ┌───────────────────┐
        │     Service       │
        └───────────────────┘
                   │
                   ▼
        ┌───────────────────┐
        │   Repository      │
        └───────────────────┘
                   │
                   ▼
              MongoDB
```

### Controller

* HTTP only
* No database access
* No business logic

### Service

* Business rules
* Workflow orchestration
* Domain validation

### Repository

* Database operations
* Query abstraction
* Persistence logic

---

# Dependency Injection

The project uses an IoC container to wire dependencies.

Instead of:

```js
const UserRepository = require("./user.repository");
```

Services receive dependencies through constructor or factory injection.

Benefits include:

* Loose coupling
* Easy mocking
* Better unit testing
* Improved maintainability
* Clear dependency graph

---

# Request Lifecycle

```
Incoming Request
        │
        ▼
Express Router
        │
        ▼
Validation Middleware
        │
        ▼
Authentication Middleware
        │
        ▼
Controller
        │
        ▼
Service
        │
        ▼
Repository
        │
        ▼
MongoDB
        │
        ▼
Repository
        │
        ▼
Service
        │
        ▼
Controller
        │
        ▼
JSON Response
```

---

# Response Contract

## Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

---

## Collection Response

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalCount": 100
  }
}
```

---

# Error Handling

All errors pass through centralized middleware before reaching the client.

Example:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "email",
        "issue": "Invalid email address."
      }
    ]
  }
}
```

Benefits:

* Consistent API responses
* Centralized logging
* Secure error reporting
* No internal stack trace leakage

---

# Naming Conventions

## Models

PascalCase

```
User.js
AdminUser.js
MentorProfile.js
```

---

## Controllers

Domain-based kebab-case

```
admin-payments.controller.js
admin-users.controller.js
```

Feature-specific camelCase

```
mentorProfile.controller.js
connectRequest.controller.js
```

---

## Services

```
auth.service.js
session.service.js
mentorSearch.service.js
```

---

## Repositories

```
user.repository.js
wallet.repository.js
transaction.repository.js
```

---

## Routes

```
auth.routes.js
session.routes.js
report.routes.js
```

---

## Validation Schemas

```
auth.validation.js
goal.validation.js
mentorProfile.validation.js
```

---

# Summary

The LeapMentor Backend is designed around a scalable, maintainable architecture that emphasizes modularity, dependency injection, and clear separation of concerns. By isolating HTTP handling, business workflows, and data persistence into dedicated layers, the project remains easy to extend, test, and maintain as new features are introduced. The standardized response contracts, centralized configuration, reusable utilities, and structured directory organization ensure consistency across the entire codebase while supporting enterprise-grade development practices.
