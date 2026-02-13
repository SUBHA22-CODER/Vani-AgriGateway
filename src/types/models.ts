export type Language = 'hindi' | 'tamil' | 'telugu' | 'kannada' | 'bengali' | 'gujarati' | 'english';

export interface Location {
  state: string;
  district: string;
  block?: string;
  village?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface UserPreferences {
  communicationChannel: 'voice' | 'sms' | 'ussd';
  callbackTime?: string;
  detailLevel: 'basic' | 'detailed';
  followUpEnabled: boolean;
}

export interface FarmerProfile {
  phoneNumber: string;
  name?: string;
  location: Location;
  primaryCrops: string[];
  preferredLanguage: Language;
  farmSize?: number;
  soilType?: string;
  irrigationType?: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
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

export interface CallSession {
  sessionId: string;
  callId: string;
  phoneNumber: string;
  farmerProfile?: FarmerProfile;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'dropped' | 'transferred';
  context: SessionContext;
}

export interface SessionContext {
  currentTopic?: string;
  previousQueries: string[];
  detectedCrops?: string[];
}

export interface AuthTokenPayload {
  phoneNumber: string;
  sessionId: string;
}
