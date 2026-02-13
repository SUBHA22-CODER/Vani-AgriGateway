import { FarmerProfile, ProfileData } from '../models/FarmerProfile';

export class ProfileDatabase {
  private profiles: Map<string, FarmerProfile>;
  private encryptionKey: string;

  constructor(encryptionKey: string) {
    this.profiles = new Map();
    this.encryptionKey = encryptionKey;
  }

  private encrypt(data: string): string {
    return Buffer.from(data).toString('base64');
  }

  private decrypt(data: string): string {
    return Buffer.from(data, 'base64').toString('utf-8');
  }

  async createProfile(phoneNumber: string, data: ProfileData): Promise<FarmerProfile> {
    const profile: FarmerProfile = {
      phoneNumber: this.encrypt(phoneNumber),
      ...data,
      interactionHistory: [],
      preferences: data.preferences || {
        communicationChannel: 'voice',
        detailLevel: 'basic',
        followUpEnabled: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.profiles.set(phoneNumber, profile);
    return profile;
  }

  async getProfile(phoneNumber: string): Promise<FarmerProfile | null> {
    return this.profiles.get(phoneNumber) || null;
  }

  async updateProfile(phoneNumber: string, updates: Partial<ProfileData>): Promise<void> {
    const profile = await this.getProfile(phoneNumber);
    if (profile) {
      Object.assign(profile, updates);
      profile.updatedAt = new Date();
      this.profiles.set(phoneNumber, profile);
    }
  }

  async recordInteraction(phoneNumber: string, interaction: any): Promise<void> {
    const profile = await this.getProfile(phoneNumber);
    if (profile) {
      profile.interactionHistory.push(interaction);
      profile.updatedAt = new Date();
      this.profiles.set(phoneNumber, profile);
    }
  }

  async deleteProfile(phoneNumber: string): Promise<void> {
    this.profiles.delete(phoneNumber);
  }

  async findByLocation(state: string, district: string): Promise<FarmerProfile[]> {
    const results: FarmerProfile[] = [];
    for (const profile of this.profiles.values()) {
      if (profile.location.state === state && profile.location.district === district) {
        results.push(profile);
      }
    }
    return results;
  }

  async getProfileCount(): Promise<number> {
    return this.profiles.size;
  }
}
