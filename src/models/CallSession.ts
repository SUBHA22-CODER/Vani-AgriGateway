import { FarmerProfile } from './FarmerProfile';

interface WeatherData {
  location: any;
  current: any;
  forecast: any[];
  alerts: any[];
  timestamp: Date;
}

interface MarketPrice {
  commodity: string;
  variety?: string;
  market: string;
  price: number;
  unit: string;
  date: Date;
  trend: 'up' | 'down' | 'stable';
}

interface SessionContext {
  currentTopic?: string;
  previousQueries: string[];
  weatherData?: WeatherData;
  marketData?: MarketPrice[];
  detectedCrops?: string[];
}

interface InteractionRecord {
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
  interactions: InteractionRecord[];
  context: SessionContext;
}
