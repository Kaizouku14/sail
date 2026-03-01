ALTER TABLE "game_sessions" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "game_sessions" ALTER COLUMN "session_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "time_limit" integer DEFAULT 360 NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "finished_at" timestamp;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "winner_id" uuid;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_session_id_unique" UNIQUE("session_id");