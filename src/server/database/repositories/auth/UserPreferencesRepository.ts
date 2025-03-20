import {
  UserPreferences,
  UserPreferencesAttributes,
} from "../../models/auth/UserPreferences";
import { BaseRepository } from "../BaseRepository";

export class UserPreferencesRepository extends BaseRepository<UserPreferences> {
  protected tableName = "user_preferences";
  protected columns = [
    "userId",
    "notifications",
    "privacy",
    "theme",
    "accessibility",
    "language",
    "timezone",
  ];

  constructor() {
    super();
  }

  protected mapResultToModel(
    data: Partial<UserPreferencesAttributes>,
  ): UserPreferences {
    return new UserPreferences(data);
  }

  async findByUserId(userId: string): Promise<UserPreferences | null> {
    return this.findById(userId);
  }

  async update(
    userId: string,
    data: Partial<UserPreferences>,
  ): Promise<UserPreferences | null> {
    return super.update(userId, data);
  }

  async delete(userId: string): Promise<boolean> {
    const result = await this.findById(userId);
    if (!result) {
      return false;
    }
    await super.update(userId, { deleted: true } as Partial<UserPreferences>);
    return true;
  }
}
