import { Request, Response } from 'express';
import { SessionService } from '../services/session.service';

export class SessionController {
  private sessionService: SessionService;

  constructor() {
    this.sessionService = new SessionService();
  }

  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const session = await this.sessionService.getSession(sessionId);
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.status(200).json({ session });
    } catch (error) {
      console.error('Get session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateSessionContext(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const context = req.body;

      await this.sessionService.updateSessionContext(sessionId, context);

      res.status(200).json({
        message: 'Session context updated successfully',
      });
    } catch (error) {
      console.error('Update session context error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async endSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      await this.sessionService.endSession(sessionId);

      res.status(200).json({
        message: 'Session ended successfully',
      });
    } catch (error) {
      console.error('End session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getActiveSessions(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.params;

      const sessions = await this.sessionService.getActiveSessions(phoneNumber);

      res.status(200).json({ sessions });
    } catch (error) {
      console.error('Get active sessions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async resumeSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const session = await this.sessionService.resumeSession(sessionId);
      if (!session) {
        res.status(404).json({
          error: 'Session not found or cannot be resumed',
        });
        return;
      }

      res.status(200).json({
        message: 'Session resumed successfully',
        session,
      });
    } catch (error) {
      console.error('Resume session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
