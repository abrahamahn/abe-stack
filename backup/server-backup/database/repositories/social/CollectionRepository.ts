import { Collection } from "@models/social/Collection";

import { BaseRepository } from "../BaseRepository";

export class CollectionRepository extends BaseRepository<Collection> {
  protected tableName = "collections";
  protected columns = [
    "id",
    "user_id as userId",
    "name",
    "description",
    "is_public as isPublic",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super("Collection");
  }
}
