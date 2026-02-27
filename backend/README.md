# Wordle Backend

The backend API and real-time WebSocket server for a multiplayer Wordle game. Built with **NestJS**, **Fastify**, **PostgreSQL**, **Redis**, and **Socket.IO**, with AI-powered hints via **Groq**.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Running the Server](#running-the-server)
- [API Reference](#api-reference)
  - [Auth](#auth)
  - [Game](#game)
- [WebSocket Events](#websocket-events)
  - [Client → Server](#client--server)
  - [Server → Client](#server--client)
- [Modules](#modules)
- [Database Schema](#database-schema)
- [Docker](#docker)
- [Scripts](#scripts)

## Tech Stack

| Layer            | Technology                         |
| ---------------- | ---------------------------------- |
| Framework        | NestJS 11 + Fastify 5             |
| Language         | TypeScript 5                       |
| Database         | PostgreSQL 16                      |
| ORM              | Drizzle ORM                        |
| Cache / Pub-Sub  | Redis 7 (via ioredis)             |
| WebSockets       | Socket.IO (via @nestjs/websockets) |
| Authentication   | JWT (via @nestjs/jwt) + bcrypt     |
| AI               | Groq SDK (LLM-powered hints)      |
| Validation       | class-validator + Joi              |
| Build Tool       | SWC                                |
| Package Manager  | pnpm                               |

## Architecture

```
src/
├── ai/            # Groq-powered hint generation & difficulty scoring
├── auth/          # JWT authentication, registration, login, stats
├── common/        # Shared constants, decorators, guards, types, utils
├── database/      # Drizzle ORM setup, schema definitions, migrations
├── game/          # Core game logic, guess evaluation, REST + WebSocket
├── redis/         # Redis client service (cache, pub/sub)
├── room/          # Multiplayer room management
├── word/          # Word dictionary loading & validation
├── app.module.ts  # Root module
└── main.ts        # Application bootstrap (Fastify adapter)
```

The backend uses a **hybrid architecture**:

- **REST API** — for solo gameplay, authentication, and game state queries.
- **WebSocket Gateway** (`/game` namespace) — for real-time multiplayer rooms with Redis pub/sub for event broadcasting.
- **Redis** — serves as the primary store for active game sessions, room state, and socket mappings. Acts as a pub/sub layer for cross-instance WebSocket event distribution.
- **PostgreSQL** — provides durable persistence for users, game sessions, guesses, and room history.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9
- [PostgreSQL](https://www.postgresql.org/) 16+
- [Redis](https://redis.io/) 7+

Or simply [Docker](https://www.docker.com/) to run everything containerized.

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
NODE_ENV=development
BASE_URL=http://localhost:5173
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/wordle
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=wordle

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-secret-key-at-least-32-characters-long
JWT_EXPIRES_IN=7d
COOKIE_SECRET=your-cookie-secret-at-least-32-characters

# AI (Groq)
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile
```

> **Note:** `GROQ_API_KEY` is required for the AI hint feature. Get one at [console.groq.com](https://console.groq.com/).

### Installation

```bash
pnpm install
```

### Database Setup

Generate and run Drizzle migrations:

```bash
# Generate migration files from schema
pnpm run db:generate

# Apply migrations to the database
pnpm run db:migrate
```

You can also inspect your database visually with:

```bash
pnpm run db:studio
```

### Running the Server

```bash
# Development (watch mode with SWC)
pnpm run start:dev

# Development (without watch)
pnpm run start

# Production
pnpm run build
pnpm run start:prod
```

The server starts on `http://localhost:3000` by default.

## API Reference

### Auth

| Method | Endpoint       | Auth | Rate Limited | Description                        |
| ------ | -------------- | ---- | ------------ | ---------------------------------- |
| POST   | `/auth/register` | No   | No           | Register a new user                |
| POST   | `/auth/login`    | No   | 5 req/60s    | Login and receive a JWT            |
| GET    | `/auth/stats`    | Yes  | No           | Get the current user's game stats  |

**POST `/auth/register`**

```json
{
  "username": "player1",
  "email": "player@example.com",
  "password": "securepassword"
}
```

**POST `/auth/login`**

```json
{
  "email": "player@example.com",
  "password": "securepassword"
}
```

Returns a JWT token for authenticated requests.

**GET `/auth/stats`** — returns win/loss stats, current streak, and guess distribution.

### Game

| Method | Endpoint         | Auth | Rate Limited | Description                          |
| ------ | ---------------- | ---- | ------------ | ------------------------------------ |
| POST   | `/game/validate` | No   | No           | Check if a word is in the dictionary |
| POST   | `/game/guess`    | Yes  | 10 req/60s   | Submit a guess for the daily word    |
| GET    | `/game/state`    | Yes  | No           | Get current game session state       |
| GET    | `/game/hint`     | Yes  | No           | Get an AI-generated hint (max 3)     |

**POST `/game/guess`**

```json
{
  "word": "crane"
}
```

Returns letter-by-letter results (`CORRECT`, `PRESENT`, or `ABSENT`), game status, and remaining guesses.

**GET `/game/hint`** — returns a semantic hint from the AI without revealing the answer. Limited to 3 hints per game session.

## WebSocket Events

Connect to the `/game` namespace with a JWT token in the auth handshake:

```js
const socket = io("http://localhost:3000/game", {
  auth: { token: "Bearer <jwt>" }
});
```

### Client → Server

| Event          | Payload                  | Description                  |
| -------------- | ------------------------ | ---------------------------- |
| `createRoom`   | —                        | Create a new multiplayer room |
| `joinRoom`     | `{ roomId: string }`     | Join an existing room         |
| `submitGuess`  | `{ word: string }`       | Submit a guess in a room      |

### Server → Client

| Event            | Payload                                          | Description                                |
| ---------------- | ------------------------------------------------ | ------------------------------------------ |
| `CONNECTED`      | `{ message, userId }`                            | Successful WebSocket connection             |
| `ROOM_CREATED`   | Room state object                                | Room was successfully created               |
| `ROOM_STATE`     | Room state object                                | Full room state on join                     |
| `PLAYER_JOINED`  | `{ playerId, username }`                         | Another player joined the room              |
| `PLAYER_LEFT`    | `{ playerId }`                                   | A player disconnected                       |
| `GUESS_RESULT`   | `{ playerId, guessNumber, results }`             | Result of a player's guess                  |
| `PLAYER_WON`     | `{ playerId, guessCount }`                       | A player solved the word                    |
| `GAME_OVER`      | `{ answer }`                                     | All players finished — reveals the answer   |
| `ERROR`          | `{ message }`                                    | Error message                               |

**Room flow:** A room starts in `WAITING` status. When a second player joins, it transitions to `IN_PROGRESS`. The game ends when all players have either won or exhausted their 6 guesses, at which point the status becomes `FINISHED`.

## Modules

| Module       | Description                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `AppModule`  | Root module — imports all feature modules, configures global env validation with Joi                |
| `AuthModule` | User registration, login (bcrypt + JWT), and player statistics                                     |
| `GameModule` | Core Wordle logic — daily word selection, two-pass guess evaluation, session management, WebSocket gateway |
| `WordModule` | Loads word dictionaries from static files, provides word validation and answer-word retrieval       |
| `RoomModule` | Multiplayer room lifecycle — create, join, leave, finalize — with Redis state and DB persistence    |
| `AIModule`   | Groq LLM integration for semantic hint generation and word difficulty scoring                       |
| `RedisModule`| Redis client wrapper — key/value ops, pub/sub, TTL management                                      |
| `DatabaseModule` | Drizzle ORM + PostgreSQL connection provider                                                   |

## Database Schema

**`users`** — registered player accounts

| Column     | Type      | Notes            |
| ---------- | --------- | ---------------- |
| id         | UUID (PK) | Auto-generated   |
| username   | TEXT      | Unique           |
| email      | TEXT      | Unique           |
| password   | TEXT      | bcrypt hash      |
| created_at | TIMESTAMP | Default: now()   |

**`game_sessions`** — solo game sessions

| Column       | Type      | Notes                               |
| ------------ | --------- | ----------------------------------- |
| id           | UUID (PK) | Auto-generated                      |
| user_id      | UUID (FK) | References `users.id`               |
| session_id   | TEXT      | Unique cookie-based session ID      |
| word_date    | DATE      | The date of the daily word          |
| status       | TEXT      | `IN_PROGRESS` / `WON` / `LOST`     |
| guess_count  | INTEGER   | Total guesses made (nullable)       |
| completed_at | TIMESTAMP | When the game ended (nullable)      |

**`guesses`** — individual guess records

| Column     | Type      | Notes                          |
| ---------- | --------- | ------------------------------ |
| id         | UUID (PK) | Auto-generated                 |
| session_id | UUID (FK) | References `game_sessions.id`  |
| word       | TEXT      | The guessed word               |
| results    | JSONB     | Array of letter results        |

**`rooms`** — multiplayer game rooms

| Column     | Type      | Notes                                     |
| ---------- | --------- | ----------------------------------------- |
| id         | UUID (PK) | Auto-generated                            |
| host_id    | UUID (FK) | References `users.id`                     |
| word       | TEXT      | The target word for this room             |
| status     | TEXT      | `WAITING` / `IN_PROGRESS` / `FINISHED`   |
| created_at | TIMESTAMP | Default: now()                            |

**`room_players`** — players within a room

| Column      | Type      | Notes                                  |
| ----------- | --------- | -------------------------------------- |
| id          | UUID (PK) | Auto-generated                         |
| room_id     | UUID (FK) | References `rooms.id`                  |
| user_id     | UUID (FK) | References `users.id`                  |
| status      | TEXT      | `PLAYING` / `WON` / `LOST`            |
| guess_count | INTEGER   | Number of guesses made                 |
| joined_at   | TIMESTAMP | Default: now()                         |

## Docker

The project includes a multi-stage `Dockerfile` and a `docker-compose.yml` that runs the backend alongside PostgreSQL and Redis.

```bash
# Build and start all services
pnpm run docker:up

# View logs
pnpm run docker:logs

# Stop all services
pnpm run docker:down
```

The Docker Compose setup exposes:

- **Backend** → `localhost:3000`
- **PostgreSQL** → `localhost:5432`
- **Redis** → `localhost:6379`

## Scripts

| Script              | Description                              |
| ------------------- | ---------------------------------------- |
| `pnpm run start`     | Start the server (SWC)                  |
| `pnpm run start:dev` | Start in watch mode (SWC)              |
| `pnpm run start:prod` | Start production build                 |
| `pnpm run build`     | Build the project                       |
| `pnpm run db:generate` | Generate Drizzle migrations           |
| `pnpm run db:migrate`  | Run pending migrations                |
| `pnpm run db:studio`   | Open Drizzle Studio (DB GUI)          |
| `pnpm run lint`      | Lint and auto-fix with ESLint           |
| `pnpm run format`    | Format code with Prettier               |
| `pnpm run test`      | Run unit tests                          |
| `pnpm run test:e2e`  | Run end-to-end tests                    |
| `pnpm run test:cov`  | Run tests with coverage                 |
| `pnpm run docker:up` | Build and start Docker containers       |
| `pnpm run docker:down` | Stop Docker containers                |
| `pnpm run docker:logs` | Tail backend container logs           |
