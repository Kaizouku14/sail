# Wordle — Frontend

React frontend for the Wordle multiplayer word game.

## Tech Stack

- **React 19** with TypeScript
- **Vite** — dev server and bundler
- **Tailwind CSS v4** — utility-first styling, mobile-first responsive design
- **Zustand** — lightweight state management
- **React Router** — client-side routing
- **React Hook Form + Zod** — form handling and validation
- **Socket.IO** — real-time WebSocket client for race mode

## Getting Started

```sh
pnpm install
pnpm run dev
```

## Scripts

| Command | Description |
|---|---|
| `pnpm run dev` | Start dev server with HMR |
| `pnpm run build` | Production build to `dist/` |
| `pnpm run preview` | Preview production build locally |
| `pnpm run lint` | Run ESLint |

## Project Structure

```
src/
├── features/        # Domain features
│   ├── game/        # Board, Tile, Keyboard components
│   ├── race/        # Race lobby, room, opponent board
│   ├── stats/       # Solo + race stats, guess distribution
│   └── auth/        # Login/register forms
├── components/      # Shared UI (header, button, card, input)
├── hooks/           # useGame, useRace
├── store/           # Zustand stores (game, auth, race)
├── service/         # API client + WebSocket service
├── pages/           # Route-level page components
├── layouts/         # Game layout, auth layout
├── lib/             # Utility functions (cn, statusStyles)
├── types/           # TypeScript type definitions
└── utils/           # Constants, helpers
```
