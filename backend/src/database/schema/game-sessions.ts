import { pgTable, uuid, text, timestamp, date } from 'drizzle-orm/pg-core';
import { users } from './users';

export const gameSessions = pgTable('game_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  sessionId: text('session_id'),
  wordDate: date('word_date').notNull(),
  status: text('status').default('IN_PROGRESS').notNull(),
  completedAt: timestamp('completed_at'),
});
