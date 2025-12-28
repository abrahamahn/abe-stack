import { BaseModel } from "../common/BaseModel";

/**
 * Interface for user preferences
 */
export interface UserPreferenceInterface {
  /**
   * Unique preference ID
   */
  id: string;

  /**
   * User ID associated with the preference
   */
  userId: string;

  /**
   * The key/name of the preference
   */
  key: string;

  /**
   * The value of the preference
   */
  value: any;

  /**
   * Date when the preference was created
   */
  createdAt: Date;

  /**
   * Date when the preference was last updated
   */
  updatedAt: Date;
}

/**
 * User preference model class
 */
export class UserPreference
  extends BaseModel
  implements UserPreferenceInterface
{
  /**
   * Unique preference ID
   */
  id: string;

  /**
   * User ID associated with the preference
   */
  userId: string;

  /**
   * The key/name of the preference
   */
  key: string;

  /**
   * The value of the preference
   */
  value: any;

  /**
   * Date when the preference was created
   */
  createdAt: Date;

  /**
   * Date when the preference was last updated
   */
  updatedAt: Date;

  /**
   * Constructor
   */
  constructor(data: Partial<UserPreferenceInterface> = {}) {
    super();

    this.id = data.id || "";
    this.userId = data.userId || "";
    this.key = data.key || "";
    this.value = data.value !== undefined ? data.value : null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();

    this.validate();
  }

  /**
   * Validate the preference data
   */
  validate(): void {
    if (!this.id) {
      throw new Error("Preference ID is required");
    }

    if (!this.userId) {
      throw new Error("User ID is required");
    }

    if (!this.key) {
      throw new Error("Preference key is required");
    }
  }

  /**
   * Update the preference value
   * @param value - New value
   */
  updateValue(value: any): void {
    this.value = value;
    this.updatedAt = new Date();
  }

  /**
   * Convert the preference to JSON
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      userId: this.userId,
      key: this.key,
      value: this.value,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
