interface Location {
  state: string;
  district: string;
  block?: string;
  village?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface UserPreferences {
  communicationChannel: 'voice' | 'sms' | 'ussd';
  callbackTime?: string;
  detailLevel: 'basic' | 'detailed';
  followUpEnabled: boolean;
}

export interface InteractionRecord {
  sessionId: string;
  timestamp: Date;
  channel: 'voice' | 'sms' | 'ussd';
  query: string;
  response: string;
  satisfaction?: number;
  duration?: number;
}

export interface FarmerProfile {
  phoneNumber: string;
  name?: string;
  location: Location;
  primaryCrops: string[];
  preferredLanguage: string;
  farmSize?: number;
  soilType?: string;
  irrigationType?: string;
  interactionHistory: InteractionRecord[];
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileData {
  name?: string;
  location: Location;
  primaryCrops: string[];
  preferredLanguage: string;
  farmSize?: number;
  soilType?: string;
  irrigationType?: string;
}
