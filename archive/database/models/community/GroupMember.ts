import { ValidationErrorDetail } from "@/server/infrastructure/errors/infrastructure/ValidationError";

import { BaseModel } from "../BaseModel";
import { GroupMemberRole } from "./Group";

/**
 * Defines the status of a group membership
 */
export enum MembershipStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  BANNED = "banned",
}

/**
 * Interface defining the structure of a GroupMember
 */
export interface GroupMemberAttributes extends BaseModel {
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  status: MembershipStatus;
  notificationSettings: Record<string, boolean> | null;
  lastActivity: Date | null;
}

/**
 * GroupMember model representing a user's membership in a group.
 * This class handles:
 * 1. GroupMember data structure
 * 2. Validation of membership data
 * 3. Business logic related to group memberships
 * 4. NOT database operations - those belong in GroupMemberRepository
 */
export class GroupMember
  extends BaseModel
  implements Omit<GroupMemberAttributes, keyof BaseModel>
{
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  status: MembershipStatus;
  notificationSettings: Record<string, boolean> | null;
  lastActivity: Date | null;

  constructor(
    data: Partial<GroupMemberAttributes> & { groupId: string; userId: string }
  ) {
    super();
    this.id = data.id || this.generateId();
    this.groupId = data.groupId;
    this.userId = data.userId;
    this.role = data.role || GroupMemberRole.MEMBER;
    this.status = data.status || MembershipStatus.APPROVED;
    this.notificationSettings = data.notificationSettings || {
      posts: true,
      events: true,
      announcements: true,
    };
    this.lastActivity = data.lastActivity || new Date();
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  toJSON(): Omit<GroupMemberAttributes, "generateId"> {
    return {
      id: this.id,
      groupId: this.groupId,
      userId: this.userId,
      role: this.role,
      status: this.status,
      notificationSettings: this.notificationSettings,
      lastActivity: this.lastActivity,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Validates the group member data
   * @returns Array of validation error details
   */
  validate(): ValidationErrorDetail[] {
    const errors: ValidationErrorDetail[] = [];

    if (!this.groupId) {
      errors.push({
        field: "groupId",
        message: "Group ID is required",
      });
    }

    if (!this.userId) {
      errors.push({
        field: "userId",
        message: "User ID is required",
      });
    }

    if (!Object.values(GroupMemberRole).includes(this.role)) {
      errors.push({
        field: "role",
        message: "Invalid role",
      });
    }

    if (!Object.values(MembershipStatus).includes(this.status)) {
      errors.push({
        field: "status",
        message: "Invalid status",
      });
    }

    return errors;
  }

  /**
   * Update the member's role
   */
  updateRole(role: GroupMemberRole): void {
    this.role = role;
    this.updatedAt = new Date();
  }

  /**
   * Update the membership status
   */
  updateStatus(status: MembershipStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  /**
   * Update notification settings
   */
  updateNotificationSettings(settings: Record<string, boolean>): void {
    this.notificationSettings = {
      ...this.notificationSettings,
      ...settings,
    };
    this.updatedAt = new Date();
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity(): void {
    this.lastActivity = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Check if member is an admin
   */
  isAdmin(): boolean {
    return this.role === GroupMemberRole.ADMIN;
  }

  /**
   * Check if member is a moderator
   */
  isModerator(): boolean {
    return this.role === GroupMemberRole.MODERATOR;
  }

  /**
   * Check if the member has moderation privileges
   */
  hasModeratorPrivileges(): boolean {
    return this.isModerator() || this.isAdmin();
  }

  /**
   * Check if membership is approved
   */
  isApproved(): boolean {
    return this.status === MembershipStatus.APPROVED;
  }

  /**
   * Check if membership is pending
   */
  isPending(): boolean {
    return this.status === MembershipStatus.PENDING;
  }

  /**
   * Check if user is banned from the group
   */
  isBanned(): boolean {
    return this.status === MembershipStatus.BANNED;
  }

  /**
   * Check if user is rejected from the group
   */
  isRejected(): boolean {
    return this.status === MembershipStatus.REJECTED;
  }

  /**
   * Check if the membership is active (not banned or rejected)
   */
  isActive(): boolean {
    return !this.isBanned() && !this.isRejected();
  }

  /**
   * String representation of the group member
   */
  toString(): string {
    return `GroupMember(id=${this.id}, groupId=${this.groupId}, userId=${this.userId}, role=${this.role}, status=${this.status})`;
  }
}
