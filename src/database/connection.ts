import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export class DatabaseConnection {
  private static pool: Pool;

  static initialize(): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        host: process.env.DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        database: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      this.pool.on('error', (err) => {
        console.error('Unexpected database error:', err);
      });
    }

    return this.pool;
  }

  static getPool(): Pool {
    if (!this.pool) {
      return this.initialize();
    }
    return this.pool;
  }

  static async query(text: string, params?: any[]) {
    const pool = this.getPool();
    return pool.query(text, params);
  }

  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
