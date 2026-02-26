import { pgTable, text, timestamp, uuid, json } from 'drizzle-orm/pg-core';
import { gameSessions } from './game-sessions';

export const guesses = pgTable('guesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .references(() => gameSessions.id)
    .notNull(),
  word: text('word').notNull(),
  results: json('results').notNull(), // [{ letter, status }]
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
});
