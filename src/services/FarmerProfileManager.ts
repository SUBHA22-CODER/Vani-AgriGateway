import { ProfileDatabase } from '../database/ProfileDatabase';
import { FarmerProfile, ProfileData } from '../models/FarmerProfile';

export class FarmerProfileManager {
  private database: ProfileDatabase;

  constructor(database: ProfileDatabase) {
    this.database = database;
  }

  async createProfile(phoneNumber: string, initialData: ProfileData): Promise<FarmerProfile> {
    const existingProfile = await this.database.getProfile(phoneNumber);
    if (existingProfile) {
      throw new Error('Profile already exists for this phone number');
    }
    return await this.database.createProfile(phoneNumber, initialData);
  }

  async getProfile(phoneNumber: string): Promise<FarmerProfile | null> {
    return await this.database.getProfile(phoneNumber);
  }

  async getOrCreateProfile(phoneNumber: string, defaultData: ProfileData): Promise<FarmerProfile> {
    let profile = await this.database.getProfile(phoneNumber);
    if (!profile) {
      profile = await this.database.createProfile(phoneNumber, defaultData);
    }
    return profile;
  }

  async updateProfile(phoneNumber: string, updates: Partial<ProfileData>): Promise<void> {
    await this.database.updateProfile(phoneNumber, updates);
  }

  async recordInteraction(phoneNumber: string, interaction: any): Promise<void> {
    await this.database.recordInteraction(phoneNumber, interaction);
  }

  async deleteProfile(phoneNumber: string): Promise<void> {
    await this.database.deleteProfile(phoneNumber);
  }

  async authenticateByPhone(phoneNumber: string): Promise<FarmerProfile | null> {
    return await this.database.getProfile(phoneNumber);
  }

  async updateLastInteraction(phoneNumber: string): Promise<void> {
    await this.database.updateLastInteractionTime(phoneNumber);
  }
}
