import { TokenService } from '../utils/token.service';

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRY = '1h';
    tokenService = new TokenService();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = {
        phoneNumber: '9876543210',
        sessionId: 'test-session-id',
      };

      const token = tokenService.generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const payload = {
        phoneNumber: '9876543210',
        sessionId: 'test-session-id',
      };

      const token = tokenService.generateToken(payload);
      const decoded = tokenService.verifyToken(token);

      expect(decoded.phoneNumber).toBe(payload.phoneNumber);
      expect(decoded.sessionId).toBe(payload.sessionId);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => {
        tokenService.verifyToken(invalidToken);
      }).toThrow('Invalid or expired token');
    });

    it('should throw error for tampered token', () => {
      const payload = {
        phoneNumber: '9876543210',
        sessionId: 'test-session-id',
      };

      const token = tokenService.generateToken(payload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      expect(() => {
        tokenService.verifyToken(tamperedToken);
      }).toThrow('Invalid or expired token');
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const payload = {
        phoneNumber: '9876543210',
        sessionId: 'test-session-id',
      };

      const token = tokenService.generateToken(payload);
      const decoded = tokenService.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.phoneNumber).toBe(payload.phoneNumber);
      expect(decoded?.sessionId).toBe(payload.sessionId);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'not-a-valid-token';
      const decoded = tokenService.decodeToken(invalidToken);

      expect(decoded).toBeNull();
    });
  });
});
