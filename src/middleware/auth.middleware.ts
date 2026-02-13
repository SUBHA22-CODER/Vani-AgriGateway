import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../utils/token.service';

export interface AuthRequest extends Request {
  user?: {
    phoneNumber: string;
    sessionId: string;
  };
}

export class AuthMiddleware {
  private tokenService: TokenService;

  constructor() {
    this.tokenService = new TokenService();
  }

  authenticate = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      const token = authHeader.substring(7);
      const payload = this.tokenService.verifyToken(token);

      req.user = {
        phoneNumber: payload.phoneNumber,
        sessionId: payload.sessionId,
      };

      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}
