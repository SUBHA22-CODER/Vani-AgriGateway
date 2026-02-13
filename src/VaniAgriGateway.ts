import { ProfileDatabase } from './database/ProfileDatabase';
import { SessionDatabase } from './database/SessionDatabase';
import { FarmerProfileManager } from './services/FarmerProfileManager';
import { SessionManager } from './services/SessionManager';
import { AuthenticationService } from './services/AuthenticationService';
import { SessionMiddleware } from './middleware/SessionMiddleware';
import { ProfileData } from './models/FarmerProfile';

export class VaniAgriGateway {
  private profileDB: ProfileDatabase;
  private sessionDB: SessionDatabase;
  private profileManager: FarmerProfileManager;
  private sessionManager: SessionManager;
  private authService: AuthenticationService;
  private sessionMiddleware: SessionMiddleware;

  constructor(encryptionKey: string, sessionTTLMinutes: number = 10) {
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters long');
    }
    this.profileDB = new ProfileDatabase(encryptionKey);
    this.sessionDB = new SessionDatabase(sessionTTLMinutes);
    this.profileManager = new FarmerProfileManager(this.profileDB);
    this.sessionManager = new SessionManager(this.sessionDB);
    this.authService = new AuthenticationService(this.profileManager, this.sessionManager);
    this.sessionMiddleware = new SessionMiddleware(this.sessionManager);
  }

  async handleIncomingCall(phoneNumber: string, callId: string) {
    const loginResult = await this.authService.loginFarmer(phoneNumber, callId);
    
    if (loginResult.isNewUser) {
      return {
        type: 'new_user_registration',
        session: loginResult.session,
        message: 'Welcome to Vani-Agri Gateway. Please provide your location and crop information.'
      };
    } else {
      return {
        type: 'returning_user',
        session: loginResult.session,
        profile: loginResult.profile,
        message: `Welcome back! How can I help you today?`
      };
    }
  }

  async completeRegistration(phoneNumber: string, profileData: ProfileData) {
    await this.profileManager.updateProfile(phoneNumber, profileData);
    const profile = await this.profileManager.getProfile(phoneNumber);
    return {
      success: true,
      profile,
      message: 'Registration completed successfully'
    };
  }

  async handleCallEnd(sessionId: string) {
    await this.authService.logout(sessionId);
    return { success: true, message: 'Call session ended' };
  }

  async getActiveSession(phoneNumber: string) {
    return await this.authService.getCurrentSession(phoneNumber);
  }

  getProfileManager() {
    return this.profileManager;
  }

  getSessionManager() {
    return this.sessionManager;
  }

  getAuthService() {
    return this.authService;
  }

  dispose(): void {
    this.sessionDB.dispose();
  }
}
