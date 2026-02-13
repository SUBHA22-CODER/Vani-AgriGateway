import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { TokenService } from '../utils/token.service';

export class AuthController {
  private authService: AuthService;
  private sessionService: SessionService;
  private tokenService: TokenService;

  constructor() {
    this.authService = new AuthService();
    this.sessionService = new SessionService();
    this.tokenService = new TokenService();
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const {
        phoneNumber,
        name,
        location,
        preferredLanguage,
        primaryCrops,
      } = req.body;

      if (!phoneNumber || !location || !preferredLanguage || !primaryCrops) {
        res.status(400).json({
          error: 'Missing required fields: phoneNumber, location, preferredLanguage, primaryCrops',
        });
        return;
      }

      if (!location.state || !location.district) {
        res.status(400).json({
          error: 'Location must include state and district',
        });
        return;
      }

      const profile = await this.authService.registerFarmer(
        phoneNumber,
        location,
        preferredLanguage,
        primaryCrops,
        name
      );

      res.status(201).json({
        message: 'Farmer registered successfully',
        profile,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber, callId } = req.body;

      if (!phoneNumber || !callId) {
        res.status(400).json({
          error: 'Missing required fields: phoneNumber, callId',
        });
        return;
      }

      const profile = await this.authService.getFarmerProfile(phoneNumber);
      if (!profile) {
        res.status(404).json({
          error: 'Farmer profile not found. Please register first.',
        });
        return;
      }

      const session = await this.sessionService.createSession(
        phoneNumber,
        callId,
        profile
      );

      const token = this.tokenService.generateToken({
        phoneNumber,
        sessionId: session.sessionId,
      });

      res.status(200).json({
        message: 'Login successful',
        token,
        session,
        profile,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.params;

      const profile = await this.authService.getFarmerProfile(phoneNumber);
      if (!profile) {
        res.status(404).json({ error: 'Farmer profile not found' });
        return;
      }

      res.status(200).json({ profile });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.params;
      const updates = req.body;

      const profile = await this.authService.updateFarmerProfile(
        phoneNumber,
        updates
      );

      res.status(200).json({
        message: 'Profile updated successfully',
        profile,
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteProfile(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.params;

      await this.authService.deleteFarmerProfile(phoneNumber);

      res.status(200).json({
        message: 'Profile deleted successfully',
      });
    } catch (error) {
      console.error('Delete profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
