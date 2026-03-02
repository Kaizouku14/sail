import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  db: ReturnType<typeof drizzle>;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.pool = new Pool({
      connectionString: this.config.get<string>('DATABASE_URL'),
      max: 5, // free-tier DBs have limited connections
      idleTimeoutMillis: 30_000, // close idle connections after 30s
      connectionTimeoutMillis: 10_000, // fail fast if DB is unreachable
      ssl: { rejectUnauthorized: false }, // required for Neon
    });
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
