import { SessionManager } from '../services/SessionManager';
import { CallSession } from '../models/CallSession';

export class SessionMiddleware {
  private sessionManager: SessionManager;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  async validateSession(sessionId: string): Promise<boolean> {
    const session = await this.sessionManager.getSession(sessionId);
    return session !== null && session.status === 'active';
  }

  async getSessionFromRequest(sessionId: string): Promise<CallSession | null> {
    return await this.sessionManager.getSession(sessionId);
  }

  async extendSession(sessionId: string): Promise<void> {
    const session = await this.sessionManager.getSession(sessionId);
    if (session) {
      await this.sessionManager.updateSessionContext(sessionId, {
        lastActivity: new Date()
      });
    }
  }

  async handleSessionExpiry(sessionId: string): Promise<void> {
    await this.sessionManager.updateSessionStatus(sessionId, 'dropped');
  }

  async requireActiveSession(sessionId: string): Promise<CallSession> {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session || session.status !== 'active') {
      throw new Error('No active session found');
    }
    return session;
  }
}
