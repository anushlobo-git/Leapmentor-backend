# LeapMentor Backend — DevOps & Deployment Guide

> **Audience:** Backend developers, DevOps engineers, and maintainers responsible for deploying, configuring, and monitoring the LeapMentor Backend.
>
> This guide explains the deployment architecture, infrastructure requirements, environment configuration, production deployment workflow, background services, monitoring, backups, and operational best practices.

---

# Table of Contents

* Overview
* Deployment Architecture
* Infrastructure Requirements
* Environment Variables
* Initial Project Setup
* Production Deployment
* Docker Deployment
* Database Configuration
* Redis Configuration
* Cloudinary Configuration
* Email Configuration
* Running Seed Scripts
* Reverse Proxy Considerations
* Socket.IO Deployment
* Background Jobs
* Logging
* Monitoring
* Health Checks
* Updating the Application
* Backup Strategy
* Troubleshooting
* Production Checklist

---

# Overview

The LeapMentor Backend is a Node.js and Express application that powers the LeapMentor platform. It exposes REST APIs, manages real-time communication using Socket.IO, executes scheduled background jobs, and integrates with multiple third-party services.

Core infrastructure includes:

* Node.js
* Express.js
* MongoDB
* Redis
* Socket.IO
* Cloudinary
* SMTP Email Service
* Docker
* Render (Production Hosting)

---

# Deployment Architecture

```text
                     Internet
                         │
                         ▼
                 Render Web Service
                         │
                         ▼
               Node.js / Express Server
                         │
         ┌───────────────┴────────────────┐
         ▼                                ▼
     MongoDB Atlas                     Redis
         │
         ▼
 Cloudinary • SMTP • Google OAuth • Clerk
```

---

# Infrastructure Requirements

Before deployment, ensure the following services are available:

* Node.js 18+
* npm
* MongoDB Atlas (or self-hosted MongoDB)
* Redis
* Cloudinary account
* SMTP provider
* Google OAuth credentials
* Clerk credentials
* Docker (optional)

---

# Environment Variables

Create a `.env` file in the project root.

Configure the following values:

## Server

* PORT
* NODE_ENV

## Database

* MONGO_URI

## Redis

* REDIS_URL

## Authentication

* JWT_SECRET
* JWT_EXPIRES_IN

## Google OAuth

* GOOGLE_CLIENT_ID
* GOOGLE_CLIENT_SECRET

## Clerk

* CLERK_SECRET_KEY

## Cloudinary

* CLOUDINARY_CLOUD_NAME
* CLOUDINARY_API_KEY
* CLOUDINARY_API_SECRET

## SMTP

* SMTP_HOST
* SMTP_PORT
* SMTP_USER
* SMTP_PASS
* FROM_EMAIL

## Client URLs

* CLIENT_URL
* APP_BASE_URL

## Web Push

* VAPID_PUBLIC_KEY
* VAPID_PRIVATE_KEY
* VAPID_EMAIL

Never commit the `.env` file to version control.

---

# Initial Project Setup

Clone the repository.

```bash
git clone <repository-url>

cd Leapmentor-backend
```

Install dependencies.

```bash
npm install
```

Verify all required environment variables have been configured before starting the application.

---

# Production Deployment

Start the application.

```bash
npm start
```

For local development:

```bash
npm run dev
```

The backend listens on the port defined by the `PORT` environment variable.

---

# Docker Deployment

Build the Docker image.

```bash
docker build -t leapmentor-backend .
```

Run the container.

```bash
docker run -d \
  --name leapmentor-backend \
  --env-file .env \
  -p 5000:5000 \
  leapmentor-backend
```

View logs.

```bash
docker logs leapmentor-backend
```

Stop the container.

```bash
docker stop leapmentor-backend
```

---

# Database Configuration

The application uses MongoDB as its primary datastore.

Verify:

* MongoDB instance is accessible.
* Connection string is correct.
* Application user has read/write permissions.
* Required indexes are created automatically by Mongoose.

---

# Redis Configuration

Redis provides caching and temporary storage.

Verify:

* Redis server is reachable.
* REDIS_URL is configured.
* Connection succeeds during application startup.

Redis is used for:

* Cache management
* Temporary application state
* Performance optimization

---

# Cloudinary Configuration

Cloudinary stores uploaded media.

Before deployment verify:

* Cloud Name
* API Key
* API Secret

All uploads are stored remotely rather than on the application server.

---

# Email Configuration

LeapMentor sends transactional emails using SMTP.

Verify:

* SMTP host
* SMTP port
* Username
* Password
* Sender email address

Test email delivery after deployment.

---

# Running Seed Scripts

When deploying a new environment, execute the required seed scripts.

Seed the administrator account.

```bash
node scripts/seedAdmin.js
```

Seed the platform commission settings.

```bash
node scripts/seedPlatformCommission.js
```

Run these scripts only once for each environment.

---

# Reverse Proxy Considerations

If deploying behind a reverse proxy (such as Nginx), ensure:

* HTTPS is enabled.
* WebSocket upgrades are forwarded.
* Appropriate timeout values are configured.
* Proxy headers are preserved.

---

# Socket.IO Deployment

Socket.IO is initialized from `server.js`.

Ensure the hosting environment supports:

* WebSocket connections
* Connection upgrades
* Persistent connections

If using a reverse proxy, configure WebSocket forwarding correctly.

---

# Background Jobs

Scheduled jobs are initialized during application startup.

Current responsibilities include:

* Availability cleanup
* Session reminders

No additional configuration is required after deployment.

---

# Logging

Application logs include:

* Startup events
* Database connection status
* Redis connection status
* Runtime errors
* Unhandled exceptions

Review logs regularly during deployment and operation.

---

# Monitoring

Monitor the following components:

* Application availability
* MongoDB connectivity
* Redis connectivity
* Email delivery
* Cloudinary uploads
* API response times
* Socket.IO connections

Integrate external monitoring services if required by the deployment environment.

---

# Health Checks

Verify the following after deployment:

* Application starts successfully.
* MongoDB connects.
* Redis connects.
* `/api-docs` loads successfully.
* Authentication endpoints respond.
* Socket.IO connections establish successfully.
* Cron jobs initialize.
* File uploads succeed.
* Email delivery works.

---

# Updating the Application

Pull the latest changes.

```bash
git pull origin main
```

Install updated dependencies.

```bash
npm install
```

Restart the application.

```bash
npm start
```

Verify application health before considering the deployment complete.

---

# Backup Strategy

Regularly back up:

* MongoDB database
* Environment configuration
* Deployment configuration
* SSL certificates (if applicable)

Cloudinary assets remain managed by Cloudinary.

---

# Troubleshooting

## Application fails to start

Verify:

* Environment variables
* Node.js version
* Installed dependencies

---

## MongoDB connection fails

Check:

* Connection string
* Credentials
* Network accessibility

---

## Redis connection fails

Verify:

* REDIS_URL
* Redis server availability
* Firewall configuration

---

## Email delivery fails

Check:

* SMTP credentials
* Provider restrictions
* Network connectivity

---

## Cloudinary uploads fail

Verify:

* Cloud Name
* API Key
* API Secret

---

## Socket.IO connection issues

Verify:

* WebSocket support
* Reverse proxy configuration
* Firewall settings

---

# Production Checklist

Before every production deployment:

* ✅ Pull the latest source code
* ✅ Install dependencies
* ✅ Verify environment variables
* ✅ Seed initial data (new environments only)
* ✅ Verify MongoDB connectivity
* ✅ Verify Redis connectivity
* ✅ Verify Cloudinary configuration
* ✅ Verify SMTP configuration
* ✅ Verify Google OAuth credentials
* ✅ Verify Clerk configuration
* ✅ Verify Docker image (if applicable)
* ✅ Verify `/api-docs`
* ✅ Verify Socket.IO connectivity
* ✅ Verify scheduled background jobs
* ✅ Execute smoke tests
* ✅ Monitor logs after deployment
* ✅ Confirm overall application health before announcing the deployment

---

# Deployment Notes

The LeapMentor Backend is designed to be deployed consistently across development, staging, and production environments. By maintaining environment-specific configuration through environment variables and following the deployment checklist above, deployments remain predictable, repeatable, and easy to troubleshoot.
