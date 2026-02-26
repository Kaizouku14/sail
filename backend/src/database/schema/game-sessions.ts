import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  integer,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const gameSessions = pgTable('game_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  sessionId: text('session_id'),
  wordDate: date('word_date').notNull(),
  status: text('status').default('IN_PROGRESS').notNull(),
  guessCount: integer('guess_count'),
  completedAt: timestamp('completed_at'),
});
