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

export function validateEncryptionKey(key: string): void {
  if (!key || key.length < 32) {
    throw new Error('Encryption key must be at least 32 characters long');
  }
}
