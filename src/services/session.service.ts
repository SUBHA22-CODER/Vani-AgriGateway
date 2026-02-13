import { v4 as uuidv4 } from 'uuid';
import { DatabaseConnection } from '../database/connection';
import { RedisConnection } from '../database/redis';
import { CallSession, SessionContext, FarmerProfile } from '../types/models';

export class SessionService {
  private sessionExpirySeconds: number;

  constructor() {
    this.sessionExpirySeconds = parseInt(process.env.SESSION_EXPIRY || '3600');
  }

  async createSession(
    phoneNumber: string,
    callId: string,
    farmerProfile?: FarmerProfile
  ): Promise<CallSession> {
    const sessionId = uuidv4();
    const session: CallSession = {
      sessionId,
      callId,
      phoneNumber,
      farmerProfile,
      startTime: new Date(),
      status: 'active',
      context: {
        previousQueries: [],
      },
    };

    const query = `
      INSERT INTO sessions (
        session_id, call_id, phone_number, start_time, status,
        previous_queries
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    try {
      await DatabaseConnection.query(query, [
        sessionId,
        callId,
        phoneNumber,
        session.startTime,
        session.status,
        session.context.previousQueries,
      ]);

      const redis = await RedisConnection.getClient();
      await redis.setEx(
        `session:${sessionId}`,
        this.sessionExpirySeconds,
        JSON.stringify(session)
      );

      return session;
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  async getSession(sessionId: string): Promise<CallSession | null> {
    try {
      const redis = await RedisConnection.getClient();
      const cachedSession = await redis.get(`session:${sessionId}`);

      if (cachedSession) {
        const session = JSON.parse(cachedSession);
        session.startTime = new Date(session.startTime);
        if (session.endTime) {
          session.endTime = new Date(session.endTime);
        }
        if (session.farmerProfile) {
          session.farmerProfile.createdAt = new Date(session.farmerProfile.createdAt);
          session.farmerProfile.updatedAt = new Date(session.farmerProfile.updatedAt);
        }
        return session;
      }

      const query = `
        SELECT * FROM sessions WHERE session_id = $1;
      `;

      const result = await DatabaseConnection.query(query, [sessionId]);
      if (result.rows.length === 0) {
        return null;
      }

      const session = this.mapRowToSession(result.rows[0]);
      await redis.setEx(
        `session:${sessionId}`,
        this.sessionExpirySeconds,
        JSON.stringify(session)
      );

      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      throw new Error('Failed to get session');
    }
  }

  async updateSessionContext(
    sessionId: string,
    context: Partial<SessionContext>
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.context = {
      ...session.context,
      ...context,
    };

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (context.currentTopic !== undefined) {
      setClauses.push(`current_topic = $${paramIndex++}`);
      values.push(context.currentTopic);
    }

    if (context.previousQueries) {
      setClauses.push(`previous_queries = $${paramIndex++}`);
      values.push(context.previousQueries);
    }

    if (context.detectedCrops) {
      setClauses.push(`detected_crops = $${paramIndex++}`);
      values.push(context.detectedCrops);
    }

    if (setClauses.length === 0) {
      return;
    }

    values.push(sessionId);
    const query = `
      UPDATE sessions
      SET ${setClauses.join(', ')}
      WHERE session_id = $${paramIndex};
    `;

    try {
      await DatabaseConnection.query(query, values);

      const redis = await RedisConnection.getClient();
      await redis.setEx(
        `session:${sessionId}`,
        this.sessionExpirySeconds,
        JSON.stringify(session)
      );
    } catch (error) {
      console.error('Error updating session context:', error);
      throw new Error('Failed to update session context');
    }
  }

  async endSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.status = 'completed';
    session.endTime = new Date();

    const query = `
      UPDATE sessions
      SET status = $1, end_time = $2
      WHERE session_id = $3;
    `;

    try {
      await DatabaseConnection.query(query, [
        session.status,
        session.endTime,
        sessionId,
      ]);

      const redis = await RedisConnection.getClient();
      await redis.del(`session:${sessionId}`);
    } catch (error) {
      console.error('Error ending session:', error);
      throw new Error('Failed to end session');
    }
  }

  async getActiveSessions(phoneNumber: string): Promise<CallSession[]> {
    const query = `
      SELECT * FROM sessions 
      WHERE phone_number = $1 AND status = 'active'
      ORDER BY start_time DESC;
    `;

    try {
      const result = await DatabaseConnection.query(query, [phoneNumber]);
      return result.rows.map(row => this.mapRowToSession(row));
    } catch (error) {
      console.error('Error getting active sessions:', error);
      throw new Error('Failed to get active sessions');
    }
  }

  async resumeSession(sessionId: string): Promise<CallSession | null> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    if (session.status !== 'dropped') {
      return session;
    }

    const timeSinceDropped = Date.now() - (session.endTime?.getTime() || 0);
    const tenMinutesInMs = 10 * 60 * 1000;

    if (timeSinceDropped > tenMinutesInMs) {
      return null;
    }

    session.status = 'active';
    session.endTime = undefined;

    const query = `
      UPDATE sessions
      SET status = $1, end_time = NULL
      WHERE session_id = $2;
    `;

    try {
      await DatabaseConnection.query(query, ['active', sessionId]);

      const redis = await RedisConnection.getClient();
      await redis.setEx(
        `session:${sessionId}`,
        this.sessionExpirySeconds,
        JSON.stringify(session)
      );

      return session;
    } catch (error) {
      console.error('Error resuming session:', error);
      throw new Error('Failed to resume session');
    }
  }

  private mapRowToSession(row: any): CallSession {
    return {
      sessionId: row.session_id,
      callId: row.call_id,
      phoneNumber: row.phone_number,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      status: row.status,
      context: {
        currentTopic: row.current_topic,
        previousQueries: row.previous_queries || [],
        detectedCrops: row.detected_crops || [],
      },
    };
  }
}
