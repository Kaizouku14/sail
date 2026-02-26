import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  integer,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { GameStatus } from '@/common/constants/game-state.constants';

export const gameSessions = pgTable('game_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  sessionId: text('session_id'),
  wordDate: date('word_date').notNull(),
  status: text('status', { enum: GameStatus }).default('IN_PROGRESS').notNull(),
  guessCount: integer('guess_count'),
  completedAt: timestamp('completed_at'),
});
