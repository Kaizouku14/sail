# Wordle

A full-stack multiplayer word game with AI-powered hints, real-time race mode, and stat tracking.

## Tech Stack

- **Frontend** — React, Vite, Tailwind CSS v4, Zustand
- **Backend** — NestJS, Fastify, Drizzle ORM
- **Real-time** — WebSockets via `@WebSocketGateway`
- **AI** — LLM integration for contextual hints
- **Data** — PostgreSQL (users, game history) + Redis (sessions, rate limiting)

## Features

- **Solo Mode** — Daily deterministic word + unlimited random replays
- **Race Mode** — 1v1 real-time rooms with invite links, timers, and rematch
- **AI Hints** — Up to 3 per game for authenticated users
- **Stats** — Win rate, streak, guess distribution, and race match history
- **Auth** — JWT-based login/register with guest play support
- **Responsive** — Mobile-first design that works across all screen sizes

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL
- Redis

### Backend

```sh
cd backend
pnpm install
cp .env.example .env   # configure DB, Redis, JWT secret, etc.
pnpm run start:dev
```

### Frontend

```sh
cd frontend
pnpm install
pnpm run dev
```

## Project Structure

```
wordle/
├── backend/
│   └── src/
│       ├── ai/          # LLM hint generation
│       ├── auth/        # JWT auth, guards
│       ├── game/        # Solo game logic, guess evaluation
│       ├── room/        # Race mode rooms + WebSocket gateway
│       ├── word/        # Dictionary loading, validation
│       ├── redis/       # Redis service wrapper
│       ├── database/    # Drizzle schema + service
│       └── common/      # Guards, decorators, constants
└── frontend/
    └── src/
        ├── features/    # game/, race/, stats/, auth/
        ├── components/  # Shared UI (header, buttons, cards)
        ├── hooks/       # useGame, useRace
        ├── store/       # Zustand stores
        ├── service/     # API + WebSocket clients
        ├── pages/       # Route-level components
        └── layouts/     # Game layout, auth layout
```
