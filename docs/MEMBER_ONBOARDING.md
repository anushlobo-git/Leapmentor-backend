# MEMBER_ONBOARDING.md

# LeapMentor Backend — Member Onboarding Guide

Welcome to the **LeapMentor Backend** project.

This document is intended to help new contributors become productive as quickly as possible by explaining the project's architecture, development workflow, coding standards, and contribution process.

---

# Table of Contents

* Welcome
* Project Overview
* Technology Stack
* Development Prerequisites
* Initial Project Setup
* Environment Configuration
* Running the Project
* Understanding the Architecture
* Understanding the Folder Structure
* Development Workflow
* Coding Standards
* Git Workflow
* Testing Guidelines
* Debugging
* Common Development Tasks
* Pull Request Checklist
* Useful Commands
* Learning Resources

---

# Welcome

LeapMentor is a mentorship platform that enables mentors and mentees to connect through verified profiles, scheduling, messaging, payments, and real-time collaboration.

As a backend contributor, you'll primarily work with:

* Express.js
* MongoDB
* Mongoose
* Socket.IO
* Redis
* Dependency Injection
* Repository Pattern
* REST APIs

The backend is designed to be modular, scalable, and highly testable.

---

# Project Overview

The backend powers:

* Authentication
* Mentor & mentee onboarding
* Profile management
* Mentor search
* Session scheduling
* Availability management
* Payments & escrow
* Messaging
* Notifications
* Admin dashboard
* Reports & moderation
* Background cron jobs

---

# Technology Stack

| Layer          | Technology                     |
| -------------- | ------------------------------ |
| Runtime        | Node.js                        |
| Framework      | Express.js                     |
| Database       | MongoDB                        |
| ODM            | Mongoose                       |
| Cache          | Redis                          |
| Authentication | JWT + Google OAuth + Clerk SSO |
| File Storage   | Cloudinary                     |
| Realtime       | Socket.IO                      |
| Testing        | Jest                           |
| Validation     | Celebrate + Joi                |

---

# Development Prerequisites

Install the following tools before starting:

* Node.js (18+)
* npm
* MongoDB
* Redis
* Git
* VS Code (recommended)

Recommended VS Code Extensions:

* ESLint
* Prettier
* Error Lens
* GitLens
* MongoDB for VS Code
* Thunder Client or REST Client

---

# Initial Project Setup

Clone the repository

```bash
git clone <repository-url>

cd Leapmentor-backend
```

Install dependencies

```bash
npm install
```

Create your environment file

```bash
cp .env.example .env
```

Fill in all required environment variables.

---

# Running the Project

Development

```bash
npm run dev
```

Production

```bash
npm start
```

Running tests

```bash
npm test
```

Coverage

```bash
npm run test:coverage
```

---

# Understanding the Architecture

The project follows a strict three-layer architecture.

```
HTTP Request

↓

Route

↓

Validation

↓

Middleware

↓

Controller

↓

Service

↓

Repository

↓

MongoDB
```

Each layer has a single responsibility.

## Controller

Responsible for:

* Reading requests
* Calling services
* Returning responses

Never place business logic here.

---

## Service

Responsible for:

* Business rules
* Workflow orchestration
* Validation beyond request schema
* Repository coordination

Never access Express request or response objects.

---

## Repository

Responsible for:

* Database queries
* Aggregations
* CRUD operations

Never place business rules here.

---

# Dependency Injection

The project uses Dependency Injection to reduce coupling.

Instead of creating repositories manually inside services, dependencies are injected through the container.

Benefits:

* Easy testing
* Mocking
* Loose coupling
* Better maintainability

---

# Understanding the Folder Structure

```
config/
controllers/
services/
repositories/
models/
mappers/
middleware/
routes/
validations/
utils/
socket/
cron/
scripts/
```

Each folder has a single responsibility.

When adding a new feature, follow the existing structure.

Example:

```
Goal Feature

goal.routes.js

↓

goal.controller.js

↓

goal.service.js

↓

goal.repository.js

↓

Goal.js
```

---

# Development Workflow

When implementing a new API:

### Step 1

Create validation schema

```
validations/
```

↓

### Step 2

Create route

```
routes/
```

↓

### Step 3

Create controller

↓

### Step 4

Implement service

↓

### Step 5

Update repository if database access is needed

↓

### Step 6

Write unit tests

↓

### Step 7

Update Swagger documentation

---

# Coding Standards

## Controllers

Keep controllers thin.

Good:

* Parse request
* Call service
* Return response

Avoid:

* Database queries
* Complex logic
* Nested conditionals

---

## Services

Services should contain:

* Business logic
* Transactions
* Cross-repository workflows

Avoid:

* Express-specific code
* Response formatting

---

## Repositories

Repositories should:

* Query MongoDB
* Return plain data
* Handle pagination

Avoid:

* Business decisions
* HTTP logic

---

## Mappers

Always return DTOs to clients.

Never expose:

* Passwords
* Internal IDs (if unnecessary)
* Sensitive metadata

---

# Git Workflow

Create a feature branch.

```
feature/add-session-rating
```

Fixes

```
fix/payment-timeout
```

Hotfix

```
hotfix/security-patch
```

Commit messages

Good:

```
feat(auth): add Google OAuth login

fix(notification): resolve duplicate push delivery

refactor(session): simplify booking workflow

test(wallet): add repository unit tests
```

---

# Testing Guidelines

Every new feature should include tests.

Test:

* Services
* Repositories
* Controllers (where appropriate)

Mock:

* Database
* Redis
* Cloudinary
* External APIs

Aim for meaningful coverage rather than just high percentages.

---

# Debugging

Useful logs

```
console.log()

logger.info()

logger.error()
```

Inspect MongoDB collections using:

* MongoDB Compass
* VS Code MongoDB Extension

Use Postman or Thunder Client to test APIs.

---

# Common Development Tasks

## Add a new API

* Validation
* Route
* Controller
* Service
* Repository
* Tests
* Swagger

---

## Add a new database model

* Create schema
* Add indexes
* Create repository
* Inject into container
* Use in service

---

## Add a new service

* Create service
* Register in container
* Inject dependencies
* Create tests

---

# Pull Request Checklist

Before creating a PR:

* Code builds successfully
* Tests pass
* No ESLint errors
* No Prettier issues
* Added unit tests
* Updated documentation
* Updated Swagger (if APIs changed)
* Removed debug logs
* Reviewed your own code

---

# Useful Commands

Install dependencies

```bash
npm install
```

Run development server

```bash
npm run dev
```

Run tests

```bash
npm test
```

Generate coverage

```bash
npm run test:coverage
```

Run ESLint

```bash
npm run lint
```

Fix formatting

```bash
npm run format
```

---

# Learning Resources

New contributors should familiarize themselves with:

* Express.js routing
* Mongoose models
* Dependency Injection
* Repository Pattern
* REST API design
* JWT authentication
* Socket.IO
* MongoDB aggregation
* Jest testing
* Project documentation

Read these documents in order:

1. `README.md`
2. `PROJECT_STRUCTURE.md`
3. `MEMBER_ONBOARDING.md`
4. API documentation (Swagger)
5. Relevant feature modules

---

# Final Notes

The LeapMentor backend emphasizes clean architecture, maintainability, and consistency. Follow existing patterns whenever possible, keep responsibilities isolated to their appropriate layers, and ensure every contribution includes tests and documentation updates. By adhering to these practices, new features can be integrated smoothly while preserving the project's long-term scalability and code quality.
