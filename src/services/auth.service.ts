import { DatabaseConnection } from '../database/connection';
import { FarmerProfile, Location, UserPreferences } from '../types/models';

export class AuthService {
  async registerFarmer(
    phoneNumber: string,
    location: Location,
    preferredLanguage: string,
    primaryCrops: string[],
    name?: string
  ): Promise<FarmerProfile> {
    const defaultPreferences: UserPreferences = {
      communicationChannel: 'voice',
      detailLevel: 'basic',
      followUpEnabled: true,
    };

    const query = `
      INSERT INTO farmers (
        phone_number, name, state, district, block, village,
        latitude, longitude, primary_crops, preferred_language,
        communication_channel, detail_level, follow_up_enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (phone_number) 
      DO UPDATE SET
        name = COALESCE(EXCLUDED.name, farmers.name),
        state = EXCLUDED.state,
        district = EXCLUDED.district,
        block = EXCLUDED.block,
        village = EXCLUDED.village,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        primary_crops = EXCLUDED.primary_crops,
        preferred_language = EXCLUDED.preferred_language,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      phoneNumber,
      name || null,
      location.state,
      location.district,
      location.block || null,
      location.village || null,
      location.coordinates?.latitude || null,
      location.coordinates?.longitude || null,
      primaryCrops,
      preferredLanguage,
      defaultPreferences.communicationChannel,
      defaultPreferences.detailLevel,
      defaultPreferences.followUpEnabled,
    ];

    try {
      const result = await DatabaseConnection.query(query, values);
      return this.mapRowToProfile(result.rows[0]);
    } catch (error) {
      console.error('Error registering farmer:', error);
      throw new Error('Failed to register farmer');
    }
  }

  async getFarmerProfile(phoneNumber: string): Promise<FarmerProfile | null> {
    const query = `
      SELECT * FROM farmers WHERE phone_number = $1;
    `;

    try {
      const result = await DatabaseConnection.query(query, [phoneNumber]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToProfile(result.rows[0]);
    } catch (error) {
      console.error('Error fetching farmer profile:', error);
      throw new Error('Failed to fetch farmer profile');
    }
  }

  async updateFarmerProfile(
    phoneNumber: string,
    updates: Partial<FarmerProfile>
  ): Promise<FarmerProfile> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.location) {
      if (updates.location.state) {
        setClauses.push(`state = $${paramIndex++}`);
        values.push(updates.location.state);
      }
      if (updates.location.district) {
        setClauses.push(`district = $${paramIndex++}`);
        values.push(updates.location.district);
      }
      if (updates.location.block !== undefined) {
        setClauses.push(`block = $${paramIndex++}`);
        values.push(updates.location.block);
      }
      if (updates.location.village !== undefined) {
        setClauses.push(`village = $${paramIndex++}`);
        values.push(updates.location.village);
      }
      if (updates.location.coordinates) {
        setClauses.push(`latitude = $${paramIndex++}`);
        values.push(updates.location.coordinates.latitude);
        setClauses.push(`longitude = $${paramIndex++}`);
        values.push(updates.location.coordinates.longitude);
      }
    }

    if (updates.primaryCrops) {
      setClauses.push(`primary_crops = $${paramIndex++}`);
      values.push(updates.primaryCrops);
    }

    if (updates.preferredLanguage) {
      setClauses.push(`preferred_language = $${paramIndex++}`);
      values.push(updates.preferredLanguage);
    }

    if (updates.farmSize !== undefined) {
      setClauses.push(`farm_size = $${paramIndex++}`);
      values.push(updates.farmSize);
    }

    if (updates.soilType !== undefined) {
      setClauses.push(`soil_type = $${paramIndex++}`);
      values.push(updates.soilType);
    }

    if (updates.irrigationType !== undefined) {
      setClauses.push(`irrigation_type = $${paramIndex++}`);
      values.push(updates.irrigationType);
    }

    if (updates.preferences) {
      if (updates.preferences.communicationChannel) {
        setClauses.push(`communication_channel = $${paramIndex++}`);
        values.push(updates.preferences.communicationChannel);
      }
      if (updates.preferences.callbackTime !== undefined) {
        setClauses.push(`callback_time = $${paramIndex++}`);
        values.push(updates.preferences.callbackTime);
      }
      if (updates.preferences.detailLevel) {
        setClauses.push(`detail_level = $${paramIndex++}`);
        values.push(updates.preferences.detailLevel);
      }
      if (updates.preferences.followUpEnabled !== undefined) {
        setClauses.push(`follow_up_enabled = $${paramIndex++}`);
        values.push(updates.preferences.followUpEnabled);
      }
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(phoneNumber);

    const query = `
      UPDATE farmers
      SET ${setClauses.join(', ')}
      WHERE phone_number = $${paramIndex}
      RETURNING *;
    `;

    try {
      const result = await DatabaseConnection.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Farmer not found');
      }
      return this.mapRowToProfile(result.rows[0]);
    } catch (error) {
      console.error('Error updating farmer profile:', error);
      throw new Error('Failed to update farmer profile');
    }
  }

  async deleteFarmerProfile(phoneNumber: string): Promise<void> {
    const query = `
      DELETE FROM farmers WHERE phone_number = $1;
    `;

    try {
      await DatabaseConnection.query(query, [phoneNumber]);
    } catch (error) {
      console.error('Error deleting farmer profile:', error);
      throw new Error('Failed to delete farmer profile');
    }
  }

  private mapRowToProfile(row: any): FarmerProfile {
    return {
      phoneNumber: row.phone_number,
      name: row.name,
      location: {
        state: row.state,
        district: row.district,
        block: row.block,
        village: row.village,
        coordinates: row.latitude && row.longitude ? {
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
        } : undefined,
      },
      primaryCrops: row.primary_crops || [],
      preferredLanguage: row.preferred_language,
      farmSize: row.farm_size ? parseFloat(row.farm_size) : undefined,
      soilType: row.soil_type,
      irrigationType: row.irrigation_type,
      preferences: {
        communicationChannel: row.communication_channel,
        callbackTime: row.callback_time,
        detailLevel: row.detail_level,
        followUpEnabled: row.follow_up_enabled,
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
