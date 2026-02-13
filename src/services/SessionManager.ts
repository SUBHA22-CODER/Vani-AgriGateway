import { SessionDatabase } from '../database/SessionDatabase';
import { CallSession } from '../models/CallSession';
import { FarmerProfile } from '../models/FarmerProfile';

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
    const session: CallSession = {
      sessionId,
      callId,
      phoneNumber,
      farmerProfile,
      startTime: new Date(),
      status: 'active',
      interactions: [],
      context: {
        previousQueries: []
      }
    };
    return await this.database.createSession(session);
  }

  async getSession(sessionId: string): Promise<CallSession | null> {
    return await this.database.getSession(sessionId);
  }

  async updateSessionContext(sessionId: string, contextUpdates: any): Promise<void> {
    const session = await this.database.getSession(sessionId);
    if (session) {
      session.context = { ...session.context, ...contextUpdates };
      await this.database.updateSession(sessionId, { context: session.context });
    }
  }

  async addInteraction(sessionId: string, interaction: any): Promise<void> {
    const session = await this.database.getSession(sessionId);
    if (session) {
      session.interactions.push(interaction);
      await this.database.updateSession(sessionId, { interactions: session.interactions });
    }
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
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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
