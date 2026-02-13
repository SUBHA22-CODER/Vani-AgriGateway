import { DatabaseConnection } from './connection';

export class DatabaseSchema {
  static async initializeTables(): Promise<void> {
    const createFarmersTable = `
      CREATE TABLE IF NOT EXISTS farmers (
        phone_number VARCHAR(20) PRIMARY KEY,
        name VARCHAR(255),
        state VARCHAR(100) NOT NULL,
        district VARCHAR(100) NOT NULL,
        block VARCHAR(100),
        village VARCHAR(100),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        primary_crops TEXT[],
        preferred_language VARCHAR(20) NOT NULL,
        farm_size DECIMAL(10, 2),
        soil_type VARCHAR(100),
        irrigation_type VARCHAR(100),
        communication_channel VARCHAR(20) DEFAULT 'voice',
        callback_time VARCHAR(20),
        detail_level VARCHAR(20) DEFAULT 'basic',
        follow_up_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR(255) PRIMARY KEY,
        call_id VARCHAR(255),
        phone_number VARCHAR(20) REFERENCES farmers(phone_number),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        status VARCHAR(20) NOT NULL,
        current_topic VARCHAR(255),
        previous_queries TEXT[],
        detected_crops TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createInteractionsTable = `
      CREATE TABLE IF NOT EXISTS interactions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) REFERENCES sessions(session_id),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        channel VARCHAR(20) NOT NULL,
        query TEXT NOT NULL,
        response TEXT NOT NULL,
        satisfaction INTEGER,
        duration INTEGER
      );
    `;

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_farmers_district ON farmers(district);
      CREATE INDEX IF NOT EXISTS idx_farmers_language ON farmers(preferred_language);
      CREATE INDEX IF NOT EXISTS idx_sessions_phone ON sessions(phone_number);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
      CREATE INDEX IF NOT EXISTS idx_interactions_session ON interactions(session_id);
    `;

    try {
      await DatabaseConnection.query(createFarmersTable);
      await DatabaseConnection.query(createSessionsTable);
      await DatabaseConnection.query(createInteractionsTable);
      await DatabaseConnection.query(createIndexes);
      console.log('Database tables initialized successfully');
    } catch (error) {
      console.error('Error initializing database tables:', error);
      throw error;
    }
  }
}
