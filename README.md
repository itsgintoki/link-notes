# LinkNotes

An authenticated note-taking API where every note gets a shareable short link and can have file attachments. Built as a single unified project covering REST APIs, auth, file storage, and short-link mechanics.

## Tech Stack

- **Runtime** — Node.js
- **Framework** — Express
- **Database** — PostgreSQL via Drizzle ORM
- **Auth** — JWT (access + refresh tokens), argon2 password hashing
- **File Storage** — Cloudinary
- **Validation** — Zod

## Features

- Full notes CRUD with Zod validation
- Every note gets a unique short link (`/n/:code`) with click tracking
- JWT-based auth with refresh token rotation
- Notes are scoped to their owner — users only see their own notes
- File attachments (images, PDFs) stored on Cloudinary
- Global error handler — no scattered `res.status(400)` calls

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL running locally or via Docker
- Cloudinary account (free tier works)

### Setup

1. Clone the repo
   ```bash
   git clone https://github.com/yourusername/link-notes.git
   cd link-notes
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file in the root:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/linknotes
   JWT_SECRET=your_jwt_secret
   REFRESH_SECRET=your_refresh_secret
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   PORT=8000
   ```

4. Push the database schema
   ```bash
   npm run db:push
   ```

5. Start the server
   ```bash
   npm run dev
   ```

## API Endpoints

### Auth

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /auth/register | No | Register a new user |
| POST | /auth/login | No | Login, returns access + refresh token |
| GET | /auth/me | Yes | Get current user |
| POST | /auth/refresh | No | Issue new access token from refresh token |
| POST | /auth/logout | Yes | Delete current refresh token |
| POST | /auth/logout-all | Yes | Delete all refresh tokens for the user |

### Notes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /notes | Yes | Create a note |
| GET | /notes | Yes | List all notes (supports `?search=` filter) |
| GET | /notes/:id | Yes | Get a note with its attachments |
| PUT | /notes/:id | Yes | Update a note |
| DELETE | /notes/:id | Yes | Delete a note |
| GET | /n/:code | No | Public short link — increments click count |

### Attachments

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /notes/:id/attachments | Yes | Upload a file to a note |
| GET | /notes/:id/attachments | Yes | List attachments for a note |
| DELETE | /notes/:id/attachments/:attachmentId | Yes | Delete an attachment |

## Design Decisions

**Cloudinary over local storage** — local file storage doesn't survive server restarts or deploys. Cloudinary gives persistent URLs, automatic CDN delivery, and a free tier that's enough for a project like this. Swapping from local to Cloudinary only changed the storage config, not the route handlers — that's the value of the abstraction.

**Refresh tokens stored in DB** — access tokens are stateless (verified by signature alone), but refresh tokens need to be revocable. Storing them in the DB means logout actually works — a deleted token can't be used to mint new access tokens even if someone intercepted it.

**Short code generated at creation** — generating it on first share would risk collisions if two requests hit simultaneously. Generating it at creation keeps it simple and ensures the code is always there, no conditional logic needed.

**Single project over four separate ones** — the original roadmap had four disconnected projects. Merging them into one means auth, validation, and error handling are built once and reused everywhere instead of re-implemented from scratch each time.
