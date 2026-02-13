import { FarmerProfile, InteractionRecord } from './FarmerProfile';

interface WeatherConditions {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  conditions: string;
}

interface WeatherForecast {
  date: Date;
  minTemp: number;
  maxTemp: number;
  rainfall: number;
  conditions: string;
  advisory?: string;
}

interface WeatherAlert {
  type: string;
  severity: string;
  description: string;
  startTime: Date;
  endTime: Date;
}

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

interface WeatherData {
  location: Location;
  current: WeatherConditions;
  forecast: WeatherForecast[];
  alerts: WeatherAlert[];
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

export interface SessionContext {
  currentTopic?: string;
  previousQueries: string[];
  weatherData?: WeatherData;
  marketData?: MarketPrice[];
  detectedCrops?: string[];
  lastActivity?: Date;
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
