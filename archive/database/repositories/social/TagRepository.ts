import { Tag } from "@models/social/Tag";

import { BaseRepository } from "../BaseRepository";

export class TagRepository extends BaseRepository<Tag> {
  protected tableName = "tags";
  protected columns = [
    "id",
    "name",
    "type",
    "usage_count as usageCount",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super("Tag");
  }
}
