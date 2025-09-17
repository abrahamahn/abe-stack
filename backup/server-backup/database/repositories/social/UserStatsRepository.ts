import { UserStats } from "@models/social/UserStats";

import { BaseRepository } from "../BaseRepository";

export class UserStatsRepository extends BaseRepository<UserStats> {
  protected tableName = "user_stats";
  protected columns = [
    "id",
    "user_id as userId",
    "post_count as postCount",
    "follower_count as followerCount",
    "following_count as followingCount",
    "like_count as likeCount",
    "comment_count as commentCount",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super("UserStats");
  }
}
