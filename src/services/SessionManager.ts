import { SessionDatabase } from '../database/SessionDatabase';
import { CallSession, SessionContext } from '../models/CallSession';
import { FarmerProfile, InteractionRecord } from '../models/FarmerProfile';
import * as crypto from 'crypto';

export class SessionManager {
  private database: SessionDatabase;

  constructor(database: SessionDatabase) {
    this.database = database;
  }

  async startSession(
    callId: string, 
    phoneNumber: string, 
    farmerProfile?: FarmerProfile
  ): Promise<CallSession> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const session: CallSession = {
      sessionId,
      callId,
      phoneNumber,
      farmerProfile,
      startTime: now,
      status: 'active',
      interactions: [],
      context: {
        previousQueries: [],
        lastActivity: now
      }
    };
    return await this.database.createSession(session);
  }

  async getSession(sessionId: string): Promise<CallSession | null> {
    return await this.database.getSession(sessionId);
  }

  async updateSessionContext(sessionId: string, contextUpdates: Partial<SessionContext>): Promise<void> {
    const session = await this.database.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    session.context = { ...session.context, ...contextUpdates };
    await this.database.updateSession(sessionId, { context: session.context });
  }

  async addInteraction(sessionId: string, interaction: InteractionRecord): Promise<void> {
    const session = await this.database.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    session.interactions.push(interaction);
    await this.database.updateSession(sessionId, { interactions: session.interactions });
  }

  async endSession(sessionId: string): Promise<void> {
    await this.database.endSession(sessionId);
  }

  async resumeSession(phoneNumber: string, callId: string): Promise<CallSession | null> {
    return await this.database.resumeSession(phoneNumber, callId);
  }

  async getActiveSessionByPhone(phoneNumber: string): Promise<CallSession | null> {
    return await this.database.getActiveSessionByPhone(phoneNumber);
  }

  private generateSessionId(): string {
    return `session_${crypto.randomUUID()}`;
  }

  async getSessionHistory(phoneNumber: string): Promise<CallSession[]> {
    return await this.database.getSessionsByPhone(phoneNumber);
  }

  async updateSessionStatus(
    sessionId: string, 
    status: 'active' | 'completed' | 'dropped' | 'transferred'
  ): Promise<void> {
    await this.database.updateSession(sessionId, { status });
  }
}
