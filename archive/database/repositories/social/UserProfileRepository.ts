import { UserProfile } from "@models/social/UserProfile";

import { BaseRepository } from "../BaseRepository";

export class UserProfileRepository extends BaseRepository<UserProfile> {
  protected tableName = "user_profiles";
  protected columns = [
    "id",
    "user_id as userId",
    "display_name as displayName",
    "bio",
    "avatar_url as avatarUrl",
    "cover_url as coverUrl",
    "location",
    "website",
    "social_links as socialLinks",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super("UserProfile");
  }
}
