import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users';
import { RoomStatus } from '@/common/constants/room-status.constants';
import { PlayerStatus } from '@/common/constants/player-status.constants';

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  hostId: uuid('host_id')
    .references(() => users.id)
    .notNull(),
  word: text('word').notNull(),
  status: text('status', { enum: RoomStatus }).default('WAITING').notNull(),
  timeLimit: integer('time_limit').default(360).notNull(),
  startedAt: timestamp('started_at'),
  finishedAt: timestamp('finished_at'),
  winnerId: uuid('winner_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const roomPlayers = pgTable('room_players', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id')
    .references(() => rooms.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  status: text('status', { enum: PlayerStatus }).default('PLAYING').notNull(),
  guessCount: integer('guess_count').default(0).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});
