# LinkNotes

A REST API for authenticated note-taking where every note gets a shareable short link and can carry file attachments. Built with Node.js, Express, PostgreSQL (via Drizzle ORM), and Cloudinary.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running with Docker (recommended)](#running-with-docker-recommended)
  - [Running Locally](#running-locally)
- [API Reference](#api-reference)
  - [Auth](#auth)
  - [Notes](#notes)
  - [Attachments](#attachments)
- [Design Decisions](#design-decisions)
- [Scripts](#scripts)

---

## Features

- **Full notes CRUD** — create, read, update, and delete notes, with Zod-validated request bodies
- **Short links** — every note is assigned a unique short code at creation (`/n/:code`); visiting the link increments a click counter
- **Search** — filter your notes list with a `?search=` query param
- **JWT auth** — access tokens + refresh tokens with rotation; logout invalidates only the current session, logout-all clears every session
- **File attachments** — upload images or PDFs to a note; stored on Cloudinary with persistent URLs
- **Owner-scoped data** — users can only read or modify their own notes and attachments
- **Security defaults** — Helmet headers, CORS, rate limiting, argon2 password hashing, morgan request logging
- **Centralised error handling** — a single global error handler; no scattered `res.status()` calls in route logic

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 18+ (ESM) |
| Framework | Express 5 |
| Database | PostgreSQL 17 via Drizzle ORM |
| Auth | JWT (access + refresh tokens), argon2 password hashing |
| Validation | Zod |
| File storage | Cloudinary (via multer-storage-cloudinary) |
| Short codes | nanoid |
| Dev tooling | drizzle-kit, node --watch |

---

## Project Structure

```
link-notes/
├── controllers/        # Route handler logic (auth, notes, attachments)
├── db/                 # Drizzle ORM client and schema definitions
├── middlewares/        # Auth guard, error handler, file upload config
├── models/             # Data-access layer (queries against the DB)
├── public/             # Static assets (served at /)
├── routes/             # Express routers (auth, notes, attachments)
├── utils/              # Shared helpers (token generation, short-code utils)
├── validations/        # Zod schemas for request bodies
├── index.js            # App entry point — Express setup, middleware chain
├── drizzle.config.js   # Drizzle Kit configuration
├── docker-compose.yml  # One-command PostgreSQL setup
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js 18+** (ESM modules are used throughout)
- **pnpm** (the repo includes a `pnpm-workspace.yaml`; npm works too)
- **PostgreSQL** — run locally or spin it up via the included Docker Compose file
- **Cloudinary account** — free tier is plenty for development

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://postgres:admin@localhost:5432/postgres

# JWT
JWT_SECRET=your_jwt_access_secret
REFRESH_SECRET=your_jwt_refresh_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Server
PORT=8000
```

### Running with Docker (recommended)

The repo ships a `docker-compose.yml` that starts a PostgreSQL 17 instance with persistent storage:

```bash
# Start the database
docker compose up -d

# Install dependencies
pnpm install

# Push the schema to the database
pnpm run db:push

# Start the dev server (with file watching)
pnpm run dev
```

### Running Locally

If you already have PostgreSQL running, skip the Docker step and point `DATABASE_URL` at your instance, then:

```bash
pnpm install
pnpm run db:push
pnpm run dev
```

The server starts on `http://localhost:8000` (or the port set in `.env`).

---

## API Reference

All protected routes require an `Authorization: Bearer <access_token>` header.

### Auth

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Register a new user |
| `POST` | `/auth/login` | No | Login — returns access token + refresh token |
| `GET` | `/auth/me` | Yes | Get the currently authenticated user |
| `POST` | `/auth/refresh` | No | Exchange a refresh token for a new access token |
| `POST` | `/auth/logout` | Yes | Invalidate the current refresh token |
| `POST` | `/auth/logout-all` | Yes | Invalidate all refresh tokens for the user |

**Register / Login body:**
```json
{
  "email": "you@example.com",
  "password": "supersecret"
}
```

---

### Notes

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/notes` | Yes | Create a note |
| `GET` | `/notes` | Yes | List all notes (supports `?search=` filter) |
| `GET` | `/notes/:id` | Yes | Get a single note with its attachments |
| `PUT` | `/notes/:id` | Yes | Update a note |
| `DELETE` | `/notes/:id` | Yes | Delete a note and its attachments |
| `GET` | `/n/:code` | No | Public short link — increments click count, returns note |

**Create / Update note body:**
```json
{
  "title": "My Note",
  "content": "Note body goes here"
}
```

Each created note receives a unique `shortCode`. The short link resolves at `/n/<shortCode>` without authentication.

---

### Attachments

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/notes/:id/attachments` | Yes | Upload a file to a note (multipart/form-data, field: `file`) |
| `GET` | `/notes/:id/attachments` | Yes | List all attachments for a note |
| `DELETE` | `/notes/:id/attachments/:attachmentId` | Yes | Delete an attachment |

Files are uploaded to Cloudinary and the returned URL is stored in the database. Supported types: images and PDFs.

---

## Design Decisions

**Cloudinary over local storage** — files uploaded to local disk disappear on server restarts and don't survive deploys. Cloudinary provides persistent URLs, CDN delivery, and automatic format handling. The abstraction means switching storage backends only touches the upload config, not the route handlers.

**Refresh tokens stored in the database** — access tokens are stateless and verified purely by signature. Refresh tokens need to be revocable (for logout to actually work), so they're written to the DB. Deleting the row means a stolen refresh token can never mint a new access token.

**Short code generated at note creation** — generating it lazily on first share would risk race conditions if two requests arrived simultaneously. Creating it upfront keeps the logic simple and removes any conditional branching when resolving `/n/:code` links.

**Zod for validation + centralised error handler** — validation errors are thrown as structured exceptions and caught by a single global handler, keeping controllers clean and response shapes consistent across the API.

---

## Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `node --watch index` | Start server with live reload |
| `db:push` | `drizzle-kit push` | Push schema changes to the database |
| `db:studio` | `drizzle-kit studio` | Open Drizzle Studio (visual DB browser) |
