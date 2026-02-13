import jwt, { SignOptions } from 'jsonwebtoken';
import { AuthTokenPayload } from '../types/models';

export class TokenService {
  private secret: string;
  private expiresIn: string;

  constructor() {
    this.secret = process.env.JWT_SECRET || 'default-secret-change-this';
    this.expiresIn = process.env.JWT_EXPIRY || '24h';
  }

  generateToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn as any });
  }

  verifyToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, this.secret) as AuthTokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  decodeToken(token: string): AuthTokenPayload | null {
    try {
      return jwt.decode(token) as AuthTokenPayload;
    } catch (error) {
      return null;
    }
  }
}
