import { FarmerProfileManager } from './FarmerProfileManager';
import { SessionManager } from './SessionManager';
import { FarmerProfile, ProfileData } from '../models/FarmerProfile';
import { CallSession } from '../models/CallSession';

export class AuthenticationService {
  private profileManager: FarmerProfileManager;
  private sessionManager: SessionManager;

  constructor(profileManager: FarmerProfileManager, sessionManager: SessionManager) {
    this.profileManager = profileManager;
    this.sessionManager = sessionManager;
  }

  async registerFarmer(phoneNumber: string, profileData: ProfileData): Promise<FarmerProfile> {
    const profile = await this.profileManager.createProfile(phoneNumber, profileData);
    return profile;
  }

  async loginFarmer(phoneNumber: string, callId: string): Promise<{
    profile: FarmerProfile;
    session: CallSession;
    isNewUser: boolean;
  }> {
    let profile = await this.profileManager.getProfile(phoneNumber);
    let isNewUser = false;

    if (!profile) {
      isNewUser = true;
      const defaultData: ProfileData = {
        location: { state: '', district: '' },
        primaryCrops: [],
        preferredLanguage: 'hindi'
      };
      profile = await this.profileManager.createProfile(phoneNumber, defaultData);
    }

    await this.profileManager.updateLastInteraction(phoneNumber);

    let session = await this.sessionManager.resumeSession(phoneNumber, callId);
    if (!session) {
      session = await this.sessionManager.startSession(callId, phoneNumber, profile);
    }

    return { profile, session, isNewUser };
  }

  async authenticateCall(phoneNumber: string, callId: string): Promise<CallSession> {
    const result = await this.loginFarmer(phoneNumber, callId);
    return result.session;
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionManager.endSession(sessionId);
  }

  async isAuthenticated(phoneNumber: string): Promise<boolean> {
    const session = await this.sessionManager.getActiveSessionByPhone(phoneNumber);
    return session !== null && session.status === 'active';
  }

  async getCurrentSession(phoneNumber: string): Promise<CallSession | null> {
    return await this.sessionManager.getActiveSessionByPhone(phoneNumber);
  }
}
