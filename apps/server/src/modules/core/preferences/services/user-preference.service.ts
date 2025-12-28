import { v4 as uuidv4 } from "uuid";

import { UserPreference, UserPreferenceInterface } from "./UserPreference";
import { BaseService } from "../common/BaseService";

/**
 * User preference type definition - can be any JSON-serializable value
 */
export type PreferenceValue = string | number | boolean | object | null;

/**
 * Service for managing user preferences
 */
export class UserPreferenceService extends BaseService {
  /**
   * In-memory store for user preferences
   * @private
   */
  private preferences: Map<string, UserPreference>;

  /**
   * Constructor
   */
  constructor() {
    super();
    this.preferences = new Map<string, UserPreference>();
  }

  /**
   * Get a preference by ID
   * @param id - Preference ID
   */
  async getPreferenceById(id: string): Promise<UserPreference | null> {
    return this.preferences.get(id) || null;
  }

  /**
   * Get a preference by user ID and key
   * @param userId - User ID
   * @param key - Preference key
   */
  async getPreference(
    userId: string,
    key: string
  ): Promise<UserPreference | null> {
    for (const pref of this.preferences.values()) {
      if (pref.userId === userId && pref.key === key) {
        return pref;
      }
    }

    return null;
  }

  /**
   * Get preference value by user ID and key
   * @param userId - User ID
   * @param key - Preference key
   * @param defaultValue - Default value if preference not found
   */
  async getValue<T extends PreferenceValue>(
    userId: string,
    key: string,
    defaultValue?: T
  ): Promise<T | null | undefined> {
    const pref = await this.getPreference(userId, key);
    return pref ? (pref.value as T) : defaultValue;
  }

  /**
   * Get all preferences for a user
   * @param userId - User ID
   */
  async getUserPreferences(userId: string): Promise<UserPreference[]> {
    const userPrefs: UserPreference[] = [];

    for (const pref of this.preferences.values()) {
      if (pref.userId === userId) {
        userPrefs.push(pref);
      }
    }

    return userPrefs;
  }

  /**
   * Set a preference value
   * @param userId - User ID
   * @param key - Preference key
   * @param value - Preference value
   */
  async setPreference(
    userId: string,
    key: string,
    value: PreferenceValue
  ): Promise<UserPreference> {
    let pref = await this.getPreference(userId, key);

    if (pref) {
      // Update existing preference
      pref.updateValue(value);
    } else {
      // Create new preference
      pref = new UserPreference({
        id: uuidv4(),
        userId,
        key,
        value,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Store the preference
    this.preferences.set(pref.id, pref);

    return pref;
  }

  /**
   * Delete a preference
   * @param userId - User ID
   * @param key - Preference key
   */
  async deletePreference(userId: string, key: string): Promise<boolean> {
    const pref = await this.getPreference(userId, key);

    if (!pref) {
      return false;
    }

    // Remove the preference
    this.preferences.delete(pref.id);

    return true;
  }

  /**
   * Delete all preferences for a user
   * @param userId - User ID
   */
  async deleteUserPreferences(userId: string): Promise<number> {
    let count = 0;
    const toDelete: string[] = [];

    // Find preferences to delete
    for (const [id, pref] of this.preferences.entries()) {
      if (pref.userId === userId) {
        toDelete.push(id);
        count++;
      }
    }

    // Delete preferences
    for (const id of toDelete) {
      this.preferences.delete(id);
    }

    return count;
  }

  /**
   * Check if a preference exists
   * @param userId - User ID
   * @param key - Preference key
   */
  async hasPreference(userId: string, key: string): Promise<boolean> {
    const pref = await this.getPreference(userId, key);
    return !!pref;
  }
}
