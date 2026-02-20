# Wordle-Like Game — Architecture & Learning Plan

> A comprehensive guide for building a full-stack, multiplayer, AI-enhanced Wordle clone.
> Learning-oriented, not just implementation-oriented.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [NestJS + Fastify Backend](#nestjs--fastify-backend)
4. [Feature Breakdown](#feature-breakdown)
   - [Word Dictionary & Validation](#1-word-dictionary--validation)
   - [Daily Deterministic Word Generation](#2-daily-deterministic-word-generation)
   - [Guess Evaluation (Duplicate-Letter Handling)](#3-guess-evaluation-duplicate-letter-handling)
   - [WebSocket Architecture](#4-websocket-architecture)
   - [AI Integration](#5-ai-integration)
   - [Anti-Cheating Strategies](#6-anti-cheating-strategies)
   - [Stateless vs. Stateful Backend](#7-stateless-vs-stateful-backend)
   - [Rate Limiting & Abuse Prevention](#8-rate-limiting--abuse-prevention)
   - [Persistence](#9-persistence)
   - [Testing Strategy](#10-testing-strategy)
5. [Algorithms & Concepts to Learn](#algorithms--concepts-to-learn)
6. [Why This Project Is Technically Valuable](#why-this-project-is-technically-valuable)

---

## Project Overview

This project is a full-stack Wordle-like game built with:

- **Frontend**: React + Vite
- **Backend**: NestJS with Fastify adapter
- **Real-time**: WebSockets via NestJS `@WebSocketGateway` (race/multiplayer mode)
- **AI**: LLM integration for hints, difficulty scoring, and cheating detection
- **Data**: Redis (sessions, pub/sub, rate limiting) + PostgreSQL (users, history)

The goal is not just to ship a game — it's to encounter real engineering problems: correctness under edge cases, distributed state, security boundaries, and principled testing.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT (React + Vite)               │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌──────────┐   │
│  │  Game UI │  │ WS Client│  │AI Hints│  │Auth/State│   │
│  └────┬─────┘  └────┬─────┘  └───┬────┘  └────┬─────┘   │
└───────┼─────────────┼────────────┼────────────┼─────────┘
        │ HTTP/REST   │ WebSocket  │ HTTP       │ HTTP
┌───────▼─────────────▼────────────▼────────────▼─────────┐
│                    API GATEWAY / Load Balancer          │
├──────────────┬───────────────┬──────────────────────────┤
│  REST API    │  WS Gateway   │   AI Service (internal)  │
│  (NestJS +   │  (NestJS      │   (LLM proxy or          │
│   Fastify)   │  @WsGateway)  │    fine-tuned model)     │
├──────────────┴───────────────┴──────────────────────────┤
│                    Shared Services                      │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│   │  Redis   │  │Postgres  │  │ Word Dict│              │
│   │(sessions,│  │(users,   │  │ (file or │              │
│   │ rate lim,│  │ history) │  │ DB table)│              │
│   │ pub/sub) │  └──────────┘  └──────────┘              │
│   └──────────┘                                          │
└─────────────────────────────────────────────────────────┘
```

---

## NestJS + Fastify Backend

### Why This Stack

NestJS provides an opinionated, modular structure built on top of Node.js. Fastify replaces Express as the underlying HTTP adapter, delivering significantly better throughput via schema-based serialization and a lower-overhead request lifecycle. Together they give you production-grade structure without sacrificing performance.

### NestJS Request Lifecycle (Learn This First)

Understanding the order in which NestJS processes a request is the single most important thing to internalize before building features. Misunderstanding this order is the most common source of bugs in NestJS applications.

```
Incoming Request
      │
      ▼
  Middleware          (e.g. logging, cookie parsing — runs before guards)
      │
      ▼
  Guards              (e.g. AuthGuard, WsAuthGuard — decides if request proceeds)
      │
      ▼
  Interceptors (pre)  (e.g. rate limiting, request timing — wraps handler)
      │
      ▼
  Pipes               (e.g. ValidationPipe — transforms & validates DTOs)
      │
      ▼
  Controller / Gateway Handler
      │
      ▼
  Interceptors (post) (e.g. response transformation, logging)
      │
      ▼
  Exception Filters   (e.g. catch HttpException, WsException — formats error response)
      │
      ▼
Outgoing Response
```

### Module Structure

Each domain becomes a self-contained NestJS module. Modules declare what they export so other modules can import only what they need — this enforces boundaries and keeps the codebase navigable as it grows.

```
src/
├── app.module.ts                  ← root module, imports all features
│
├── game/
│   ├── game.module.ts
│   ├── game.controller.ts         ← REST: POST /guess, GET /game-state
│   ├── game.service.ts            ← evaluation logic, word derivation
│   ├── game.gateway.ts            ← @WebSocketGateway for race mode
│   └── dto/
│       ├── submit-guess.dto.ts    ← validated with class-validator
│       └── game-state.dto.ts
│
├── word/
│   ├── word.module.ts
│   └── word.service.ts            ← dictionary loading, O(1) lookup
│
├── ai/
│   ├── ai.module.ts
│   └── ai.service.ts              ← hint gen, difficulty scoring, cheat detection
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.guard.ts              ← JWT guard for HTTP routes
│   ├── ws-auth.guard.ts           ← JWT guard for WebSocket handshake
│   └── auth.service.ts
│
├── redis/
│   ├── redis.module.ts            ← global module, exported to all
│   └── redis.service.ts           ← sessions, pub/sub, rate limiting
│
└── config/
    └── config.module.ts           ← @nestjs/config, validates env vars at startup
```

### Key NestJS Concepts by Feature

| Concept | Used For in This Project |
|---|---|
| **`@Module`** | Encapsulate each domain (GameModule, AuthModule, AIModule) |
| **`@Controller`** | REST route handlers (`POST /guess`, `GET /game-state`) |
| **`@WebSocketGateway`** | Race mode WebSocket server (replaces raw `ws`/Socket.io setup) |
| **`@Injectable` / Services** | Business logic — evaluation, word selection, AI calls |
| **`Guards`** | JWT auth on HTTP + WebSocket handshake; rate limit enforcement |
| **`Interceptors`** | Request logging, response shaping, timing metrics |
| **`Pipes` + `ValidationPipe`** | Auto-validate and transform incoming DTOs using `class-validator` |
| **`Exception Filters`** | Consistent error responses — `HttpException`, `WsException` |
| **`ConfigModule`** | Environment variables with validation schema at startup |

### Fastify-Specific Considerations

- Use `@nestjs/platform-fastify` and `FastifyAdapter` instead of the default Express adapter
- Fastify's **schema-based JSON serialization** is its biggest performance win — declare response schemas and Fastify skips slow generic serialization
- Express middleware (e.g. `cookie-parser`) does **not** work with Fastify — use `@fastify/cookie` registered via `app.register()`
- CORS, helmet, and compression all have Fastify-native equivalents (`@fastify/cors`, `@fastify/helmet`, `@fastify/compress`)
- Fastify uses **hooks** where Express uses middleware — NestJS abstracts most of this, but you'll encounter it when registering Fastify plugins directly

### WebSocket Gateway

NestJS's `@WebSocketGateway` decorator turns a class into a WebSocket server. It integrates cleanly with NestJS's dependency injection, so your `GameGateway` can inject `GameService`, `RedisService`, and `AuthService` just like any other provider.

```
GameGateway (@WebSocketGateway)
  ├── handleConnection()      ← validate JWT on handshake via WsAuthGuard
  ├── handleDisconnect()      ← update room state in Redis, notify others
  ├── @SubscribeMessage('submitGuess')
  │     → call GameService.evaluate()
  │     → publish result to Redis pub/sub
  │     → broadcast to room via server.to(roomId).emit()
  └── Redis Pub/Sub subscriber
        → receive events from other WS server instances
        → forward to local socket connections
```

### Testing in NestJS

NestJS's dependency injection makes unit testing clean — you create a testing module, swap real providers for mocks, and test services in isolation.

| Test Type | NestJS Approach |
|---|---|
| **Unit** | `Test.createTestingModule()` with mock providers for Redis, DB, AI |
| **Integration** | `@nestjs/testing` with `supertest` against a real Fastify app instance |
| **WebSocket** | Spin up a test gateway, connect a real WS client, assert emitted events |
| **E2E** | Full app boot with test DB; run complete game flows |

> **Tip**: NestJS's `@nestjs/testing` package is purpose-built for this. Learn to use `moduleRef.get()` to retrieve providers and inspect internal state in tests.

---

## Feature Breakdown

### 1. Word Dictionary & Validation

#### Functional Requirements
- Maintain a curated list of valid 5-letter English words
- Separate "answer words" (common, fair) from "valid guess words" (larger set)
- Reject non-dictionary guesses before evaluation

#### Non-Functional Requirements
- Validation must be **O(1)** — not O(n) linear scan
- Dictionary must not be trivially extractable from the client bundle (anti-cheat)

#### Backend vs. Frontend
| Concern | Owner |
|---|---|
| Authoritative validation | **Backend** — `WordService` loaded at startup, injected into `GameService` |
| Optimistic local validation | **Frontend** — compressed word list for UX responsiveness |

#### Data Models & API Contracts
```
valid_words: Set<string>         // loaded into WordService at startup via OnModuleInit
answer_words: string[]           // ordered, seeded list

POST /game/validate
  Request:  { word: string }     // validated by ValidationPipe + DTO
  Response: { valid: boolean }
```

#### Failure Cases & Edge Cases
- Word list file missing at startup → **fail fast, don't serve**
- Unicode/emoji inputs → sanitize and reject non-alpha or non-5-char
- Case sensitivity bugs → always normalize to lowercase

---

### 2. Daily Deterministic Word Generation

#### Functional Requirements
- All users get the same word on the same calendar day
- Word rotates at midnight UTC
- No word repeats within the list's cycle

#### Non-Functional Requirements
- Must be **reproducible** — same date always returns same word
- Stateless computation preferred (no DB call needed)

#### Algorithm
```
index = daysSinceEpoch % answer_words.length
word  = answer_words[index]
```

#### Failure Cases & Edge Cases
- **Timezone bugs** — always anchor to UTC
- **List length changes** between deploys shift all future words → version your list
- **Client clock manipulation** → backend sets the canonical date

---

### 3. Guess Evaluation (Duplicate-Letter Handling)

#### Functional Requirements
- Return per-letter results: `CORRECT` (green), `PRESENT` (yellow), `ABSENT` (gray)
- Handle duplicates correctly
  - Example: guessing `SPEED` against answer `SPELL` → only **one** E should be yellow

#### The Algorithm (Two-Pass — Learn This)

| Pass | Action |
|---|---|
| **Pass 1** | Mark `CORRECT` positions; remove matched letters from available pool |
| **Pass 2** | For remaining letters, check pool → `PRESENT` if found, else `ABSENT` |

> A single-pass naive algorithm produces wrong results for duplicates. This is one of the most instructive bugs in the project.

#### Failure Cases & Edge Cases
- Single-pass logic → incorrect yellow counts on duplicate letters
- Answer or guess not normalized to lowercase before comparison

---

### 4. WebSocket Architecture

#### Functional Requirements
- **Race mode**: multiple players solve the same word simultaneously
- Broadcast events: player joined, guess submitted, player won, game over
- **Reconnection**: player can rejoin an in-progress room within a TTL window

#### Non-Functional Requirements
- **Scalability**: WS connections are stateful → need sticky sessions or pub/sub for multi-instance deployments
- **Security**: authenticate WS connections with a token at handshake
- **Graceful degradation**: if WS fails, fall back to polling

#### Backend vs. Frontend
| Concern | Owner |
|---|---|
| Room management, broadcasting | **Backend** — `GameGateway` + `RedisService` pub/sub across instances |
| Rendering opponent progress | **Frontend** — react to incoming WS events |

#### Data Models & Event Contracts
```
Room   { id, word, players: Player[], status, createdAt }
Player { id, username, guesses: Guess[], status }

WS Events:
  { type: "GUESS_RESULT",  payload: { playerId, result[] } }
  { type: "PLAYER_WON",   payload: { playerId, guessCount } }
  { type: "PLAYER_JOINED",payload: { playerId, username } }
```

#### Failure Cases & Edge Cases
- Player disconnects mid-game → store state in Redis, allow rejoin within TTL
- **Split-brain** across WS instances → use Redis pub/sub as shared message bus
- Message ordering issues → add sequence numbers to events

---

### 5. AI Integration

Three distinct AI paradigms — each worth understanding separately.

#### 5a. Hint Generation
- User requests a hint → send current board state to LLM
- LLM returns a **semantic clue**, not the word: *"Think of something you find in a kitchen"*
- Rate-limit hints per game to preserve challenge
- **Failure case**: validate that the hint does not contain the target word

#### 5b. Difficulty Scoring
- Before adding a word to the answer list, score it by: word frequency, letter pattern commonality, estimated solve rate
- Use embeddings or a classifier trained on historical game outcomes
- Expose a `difficulty: easy | medium | hard` tag

#### 5c. Cheating Detection
- Track **guess entropy** over time — a player who consistently achieves maximum information gain per guess is suspicious
- Send anonymized session data (guess sequence, timing) to an anomaly detector
- Flag superhuman sessions for review

#### Backend vs. Frontend
| Concern | Owner |
|---|---|
| All LLM calls | **Backend** — `AIService` injectable; API keys in `ConfigModule`, never exposed to client |
| Rendering hint text, difficulty badge | **Frontend** — display only |

#### Failure Cases & Edge Cases
- LLM latency is high → stream responses; show loading state
- AI service down → degrade gracefully, disable hint button with clear UX message

---

### 6. Anti-Cheating Strategies

#### Functional Requirements
- Target word is **never sent to the client** before the game ends
- Server validates all guesses independently
- Detect statistically improbable play patterns

#### Strategies
| Strategy | How It Works |
|---|---|
| Word sealed server-side | Client only receives evaluation results, never the word |
| Signed game tokens (JWT) | Enforced by `AuthGuard` on every HTTP route and WS handshake |
| Guess timing analysis | `GameService` checks timestamp delta; reject or flag if < 1s |
| Information-gain tracking | Flag sessions that consistently maximize entropy reduction |
| Honeypot words | Rare words in the list; immediate correct guesses are suspicious |

#### Failure Cases & Edge Cases
- False positives — skilled players may look suspicious; tune thresholds carefully
- IP-based detection fails for shared NAT → prefer session/user-level signals

---

### 7. Stateless vs. Stateful Backend

| | Stateless | Stateful |
|---|---|---|
| **What it means** | Each request carries all context (JWT, game ID) | Server holds state between requests |
| **Scales how** | Horizontally — any instance handles any request | Needs session affinity or shared store |
| **Used for** | REST API, single-player daily game | Multiplayer rooms via WebSockets |
| **Pattern** | HTTP servers remain stateless | Externalize state to Redis + Postgres |

> **Design Decision**: Keep HTTP API stateless; externalize all mutable state to Redis + Postgres. This is the correct industry pattern.

---

### 8. Rate Limiting & Abuse Prevention

#### Functional Requirements
- Limit guess submissions per minute per IP/user
- Limit AI hint requests per game session
- Throttle account creation and login attempts

#### Non-Functional Requirements
- Rate limiting must work across **multiple server instances**
- Must not degrade performance for legitimate users

#### Algorithms
| Algorithm | Use Case |
|---|---|
| **Token Bucket** | Allows burst traffic up to a cap, then drains |
| **Sliding Window** | Smooth, precise request counting over time |

Both implemented in Redis to work across all server instances. In NestJS, rate limiting is best implemented as a **Guard** (blocks before the handler runs) or an **Interceptor** (can log and transform the response). A Guard is preferred — it short-circuits the request before any business logic executes.

- HTTP `429` responses must include a `Retry-After` header
- Clients should use **exponential backoff**

#### Failure Cases & Edge Cases
- IP-based limiting breaks behind shared NAT → prefer user-level limits when authenticated
- Redis goes down → fail open with local in-memory fallback (accept some abuse over a full outage)

---

### 9. Persistence

#### Anonymous (No Account)
- Game state stored in `localStorage` + a session token (cookie or local)
- Backend uses session ID as key in Redis (TTL: 24h)
- No cross-device sync

#### Authenticated Users
- PostgreSQL stores users, game sessions, and guesses
- Enables: streaks, history, leaderboards, cross-device sync
- Design for eventual migration: **anonymous sessions can be claimed post-registration**

#### Data Models
```sql
User         { id, username, email, created_at }
GameSession  { id, user_id | session_id, word_date, status, completed_at }
Guess        { id, session_id, word, result[], submitted_at }
```

---

### 10. Testing Strategy

#### Unit Tests
- `GameService.evaluate()` — especially duplicate-letter edge cases; mock no dependencies needed (pure function)
- `WordService.isValid()` — word validation logic
- `GameService.getDailyWord()` — given a date, assert expected word
- Use `Test.createTestingModule()` with mock providers for Redis, DB, and AI

#### Integration Tests
- REST endpoints via `supertest` against a booted `FastifyAdapter` app instance
- `POST /game/guess`, `GET /game/state` — real `ValidationPipe` runs, DTOs validated
- WebSocket flow: connect a test WS client to `GameGateway`, submit a guess, assert broadcast events
- AI hint endpoint: provide a mock `AIService`, assert prompt construction and response parsing

#### Property-Based Tests *(Key Learning Opportunity)*
Generate thousands of random inputs and assert **invariants that must always hold**:

```
∀ guess, answer:
  count(CORRECT) + count(PRESENT) + count(ABSENT) = 5
  CORRECT letters always appear at the correct position in answer
  PRESENT letters always appear somewhere in answer
```

**Tools**: `fast-check` (JavaScript) — integrates cleanly with Jest, which NestJS uses by default

#### End-to-End Tests
- Boot the full NestJS app with a test PostgreSQL instance (e.g. via Docker Compose)
- Full game flow: join → guess × N → win/lose → stats saved
- Multiplayer: two concurrent WS clients connect to `GameGateway`; one wins; assert the other receives `PLAYER_WON`

---

## Algorithms & Concepts to Learn

### NestJS + Fastify Framework Concepts
- **Dependency Injection (DI)** — NestJS's core pattern; services are injected rather than instantiated, making them testable and swappable. Learn the difference between singleton, request-scoped, and transient providers.
- **Decorator pattern** — NestJS is built on TypeScript decorators (`@Controller`, `@Injectable`, `@WebSocketGateway`). Understanding how decorators work at the language level will demystify NestJS's "magic."
- **Middleware vs. Guards vs. Interceptors vs. Pipes** — four different extension points in the NestJS request lifecycle, each with a distinct purpose. Confusing them is the most common architectural mistake in NestJS projects.
- **DTO pattern (Data Transfer Objects)** — plain classes decorated with `class-validator` rules; `ValidationPipe` transforms and validates incoming data automatically before it reaches your handler.
- **Module encapsulation** — providers in a module are private by default; you must explicitly `export` what other modules can inject. This enforces boundaries at the framework level.
- **Schema-based serialization (Fastify)** — Fastify uses JSON Schema to serialize responses 2–3× faster than `JSON.stringify`. Learn to declare response schemas on your routes for the performance win.

### String & Array Processing
- **Two-pass evaluation** — correct duplicate-letter handling in guess scoring
- **Set membership (HashSet)** — O(1) dictionary lookup vs. O(n) array scan
- **String normalization** — Unicode, case folding; required for reliable matching
- **Trie** — space-efficient alternative to HashSet; enables prefix queries (useful for word suggestions)

### Probabilistic & Information Theory
- **Shannon entropy** — measures information gained per guess; used in cheating detection and optimal strategy analysis
- **Frequency analysis** — letter frequency in English; used for difficulty scoring and hint generation
- **Token bucket / sliding window** — rate limiting; understand the tradeoff between burst tolerance and steady-state control

### Distributed Systems
- **Pub/Sub pattern** — Redis pub/sub enables WS broadcasting across multiple server instances without coupling them
- **Stateless HTTP + external state store** — scales better than sticky sessions; understand *why*
- **Eventual consistency** — where it's acceptable (leaderboards) vs. dangerous (game results) in this project

### Cryptography & Security
- **JWT (JSON Web Tokens)** — stateless authentication; understand signing, expiry, and why secrets never go in the payload
- **Deterministic hashing** — deriving today's word from a date without storing it
- **HMAC** — signing game state to prevent client-side tampering

### Testing Theory
- **Property-based testing** — define invariants; the framework generates thousands of cases automatically
- **Test doubles (mocks/stubs/fakes)** — isolate external services (LLM, DB) in unit tests
- **Contract testing** — verify that backend API and frontend agree on data shapes (especially WS event schemas)

### Data Structures Reference
| Structure | Used For |
|---|---|
| HashSet | O(1) word validation |
| Trie | Prefix queries / word suggestions |
| Circular buffer | Efficient word cycling |
| Redis Sorted Set | Leaderboard ranking by score + timestamp |

---

## Why This Project Is Technically Valuable

This project is deceptively simple on the surface — but it surfaces a remarkable breadth of real engineering challenges.

**It teaches you how opinionated frameworks create real leverage.** NestJS's module system, dependency injection, and lifecycle hooks aren't arbitrary — they encode decades of lessons about maintainability and testability. Building a real project in NestJS teaches you *why* these patterns exist, not just how to use them. That understanding transfers to any framework.

**It forces you to think about correctness, not just functionality.** The duplicate-letter evaluation bug is a perfect example: a naïve implementation appears to work for 90% of inputs. Learning to find and fix that 10% is the difference between a junior and senior engineer.

**It teaches you where to draw the client/server boundary.** Every decision — where validation lives, what state is shared, what the client is allowed to know — has security and scalability consequences. This mirrors production systems.

**It introduces distributed systems thinking without overwhelming complexity.** Adding multiplayer via WebSockets forces you to confront state synchronization, connection lifecycle, and horizontal scaling in a low-stakes environment where you can actually understand the whole system.

**It makes AI integration concrete and principled.** Rather than "add a chatbot," you're using AI for anomaly detection, semantic hint generation, and content scoring — three genuinely different AI paradigms in one project.

**It teaches you that testing is a design activity.** Writing property-based tests for your evaluation algorithm will reveal edge cases you hadn't thought of. That experience — tests as a thinking tool, not just a verification step — changes how you build software permanently.

**It scales with your ambition.** A solo player version can be built in a weekend. Adding auth, multiplayer, AI, rate limiting, and a leaderboard can occupy months of genuine depth. The architecture above supports that entire journey without requiring a rewrite.

---

*Built as a learning-oriented architecture guide. Each section is a doorway into deeper engineering study.*
