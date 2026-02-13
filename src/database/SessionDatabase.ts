import { CallSession } from '../models/CallSession';

export class SessionDatabase {
  private sessions: Map<string, CallSession>;
  private activeSessionsByPhone: Map<string, string>;
  private sessionTTL: number;
  private cleanupIntervalId?: NodeJS.Timeout;
  private static readonly CLEANUP_INTERVAL_MS = 60000;

  constructor(ttlMinutes: number = 10) {
    this.sessions = new Map();
    this.activeSessionsByPhone = new Map();
    this.sessionTTL = ttlMinutes * 60 * 1000;
    this.startCleanupTask();
  }

  async createSession(callSession: CallSession): Promise<CallSession> {
    this.sessions.set(callSession.sessionId, callSession);
    this.activeSessionsByPhone.set(callSession.phoneNumber, callSession.sessionId);
    return callSession;
  }

  async getSession(sessionId: string): Promise<CallSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async getActiveSessionByPhone(phoneNumber: string): Promise<CallSession | null> {
    const sessionId = this.activeSessionsByPhone.get(phoneNumber);
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session && session.status === 'active') {
        return session;
      }
      this.activeSessionsByPhone.delete(phoneNumber);
    }
    return null;
  }

  async updateSession(sessionId: string, updates: Partial<CallSession>): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      Object.assign(session, updates);
      this.sessions.set(sessionId, session);
    }
  }

  async endSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.status = 'completed';
      session.endTime = new Date();
      this.sessions.set(sessionId, session);
      this.activeSessionsByPhone.delete(session.phoneNumber);
    }
  }

  async resumeSession(phoneNumber: string, callId: string): Promise<CallSession | null> {
    const session = await this.getActiveSessionByPhone(phoneNumber);
    if (session && this.isSessionResumable(session)) {
      session.callId = callId;
      session.status = 'active';
      this.sessions.set(session.sessionId, session);
      return session;
    }
    return null;
  }

  private isSessionResumable(session: CallSession): boolean {
    const now = new Date().getTime();
    const lastActivityTime = session.context.lastActivity?.getTime() || session.startTime.getTime();
    return (now - lastActivityTime) < this.sessionTTL && session.status !== 'completed';
  }

  async getSessionsByPhone(phoneNumber: string): Promise<CallSession[]> {
    const results: CallSession[] = [];
    for (const session of this.sessions.values()) {
      if (session.phoneNumber === phoneNumber) {
        results.push(session);
      }
    }
    return results;
  }

  async getActiveSessionCount(): Promise<number> {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.status === 'active') {
        count++;
      }
    }
    return count;
  }

  private startCleanupTask(): void {
    this.cleanupIntervalId = setInterval(() => {
      const now = new Date().getTime();
      for (const [sessionId, session] of this.sessions.entries()) {
        const lastActivityTime = session.context.lastActivity?.getTime() || session.startTime.getTime();
        if (session.status === 'completed' || 
            (now - lastActivityTime) > this.sessionTTL) {
          this.sessions.delete(sessionId);
          if (this.activeSessionsByPhone.get(session.phoneNumber) === sessionId) {
            this.activeSessionsByPhone.delete(session.phoneNumber);
          }
        }
      }
    }, SessionDatabase.CLEANUP_INTERVAL_MS);
  }

  dispose(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }
  }
}
