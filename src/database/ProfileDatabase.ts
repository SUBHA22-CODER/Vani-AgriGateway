import { FarmerProfile, ProfileData } from '../models/FarmerProfile';

export class ProfileDatabase {
  private profiles: Map<string, FarmerProfile>;
  private encryptionKey: string;

  constructor(encryptionKey: string) {
    this.profiles = new Map();
    this.encryptionKey = encryptionKey;
  }

  private encrypt(data: string): string {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(this.encryptionKey).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(data: string): string {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(this.encryptionKey).digest();
    const parts = data.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async createProfile(phoneNumber: string, data: ProfileData): Promise<FarmerProfile> {
    const profile: FarmerProfile = {
      phoneNumber: this.encrypt(phoneNumber),
      ...data,
      interactionHistory: [],
      preferences: {
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
