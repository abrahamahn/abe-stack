import {
  Group,
  GroupStatus,
  GroupMemberRole,
} from "@/server/database/models/community/Group";
import {
  GroupMember,
  MembershipStatus,
} from "@/server/database/models/community/GroupMember";
import { GroupMemberRepository } from "@/server/database/repositories/community/GroupMemberRepository";
import { GroupRepository } from "@/server/database/repositories/community/GroupRepository";
import { PaginatedResult, PaginationOptions } from "@/server/shared/types";
import { BaseService } from "@/server/services/shared/base/BaseService";
import {
  ResourceNotFoundError,
  AccessDeniedError,
  ValidationError,
} from "@/server/services/shared/errors/ServiceError";

/**
 * Data transfer object for updating a group member
 */
export interface GroupMemberUpdateDTO {
  role?: string;
  status?: MembershipStatus;
  notificationSettings?: {
    posts?: boolean;
    events?: boolean;
    announcements?: boolean;
  };
}

/**
 * Service responsible for managing group membership
 * Features:
 * 1. Join/leave group functionality
 * 2. Member role management
 * 3. Member status management (pending, approved, banned)
 * 4. Group invitation handling
 * 5. Notification preferences
 */
export class GroupMemberService extends BaseService {
  /**
   * Creates a new GroupMemberService instance
   * @param groupRepository Repository for group operations
   * @param groupMemberRepository Repository for group member operations
   */
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly groupMemberRepository: GroupMemberRepository
  ) {
    super("GroupMemberService");
  }

  /**
   * Join a group
   * @param groupId ID of the group
   * @param userId ID of the user
   * @returns Created group membership
   */
  async joinGroup(groupId: string, userId: string): Promise<GroupMember> {
    try {
      this.logger.info(`User ${userId} joining group ${groupId}`);

      // Check if group exists
      const group = await this.groupRepository.findById(groupId);
      if (!group) {
        throw new ResourceNotFoundError("Group", groupId);
      }

      // Check if group is active
      if (group.status !== GroupStatus.ACTIVE) {
        throw new ValidationError("Cannot join an inactive group");
      }

      // Check if user is already a member
      const existingMembership =
        await this.groupMemberRepository.findByGroupAndUserId(groupId, userId);
      if (existingMembership) {
        if (existingMembership.status === MembershipStatus.BANNED) {
          throw new AccessDeniedError("You have been banned from this group");
        } else if (existingMembership.status === MembershipStatus.APPROVED) {
          throw new ValidationError("You are already a member of this group");
        } else if (existingMembership.status === MembershipStatus.PENDING) {
          throw new ValidationError(
            "Your membership request is pending approval"
          );
        }
      }

      // Determine initial status based on group visibility
      const initialStatus =
        group.visibility === "public"
          ? MembershipStatus.APPROVED
          : MembershipStatus.PENDING;

      // Create membership
      const membership = await this.groupMemberRepository.create({
        groupId,
        userId,
        role: "member",
        status: initialStatus,
        notificationSettings: {
          posts: true,
          events: true,
          announcements: true,
        },
        lastActivity: new Date(),
      });

      // Update group member count if the user is immediately approved
      if (initialStatus === MembershipStatus.APPROVED) {
        await this.groupRepository.update(groupId, {
          memberCount: group.memberCount + 1,
        });
      }

      return membership;
    } catch (error) {
      this.logger.error(`Failed to join group ${groupId} for user ${userId}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Leave a group
   * @param groupId ID of the group
   * @param userId ID of the user
   * @returns True if successfully left the group
   */
  async leaveGroup(groupId: string, userId: string): Promise<boolean> {
    try {
      this.logger.info(`User ${userId} leaving group ${groupId}`);

      // Check if group exists
      const group = await this.groupRepository.findById(groupId);
      if (!group) {
        throw new ResourceNotFoundError("Group", groupId);
      }

      // Check if user is a member
      const membership = await this.groupMemberRepository.findByGroupAndUserId(
        groupId,
        userId
      );
      if (!membership || membership.status !== MembershipStatus.APPROVED) {
        throw new ResourceNotFoundError("GroupMember", `${groupId}:${userId}`);
      }

      // Cannot leave if you're the owner
      if (group.ownerId === userId) {
        throw new ValidationError(
          "Group owner cannot leave the group. Transfer ownership first."
        );
      }

      // Remove membership
      await this.groupMemberRepository.delete(membership.id);

      // Update member count
      await this.groupRepository.update(groupId, {
        memberCount: Math.max(0, group.memberCount - 1),
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to leave group ${groupId} for user ${userId}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Invite user to join a group
   * @param groupId ID of the group
   * @param invitedUserId ID of the user being invited
   * @param inviterId ID of the user sending the invitation
   * @returns Created group membership (in pending state)
   */
  async inviteUser(
    groupId: string,
    invitedUserId: string,
    inviterId: string
  ): Promise<GroupMember> {
    try {
      this.logger.info(
        `User ${inviterId} inviting user ${invitedUserId} to group ${groupId}`
      );

      // Check if group exists
      const group = await this.groupRepository.findById(groupId);
      if (!group) {
        throw new ResourceNotFoundError("Group", groupId);
      }

      // Check if inviter is a member
      const inviterMembership =
        await this.groupMemberRepository.findByGroupAndUserId(
          groupId,
          inviterId
        );
      if (
        !inviterMembership ||
        inviterMembership.status !== MembershipStatus.APPROVED
      ) {
        throw new AccessDeniedError(
          "Only members can invite others to the group"
        );
      }

      // Check if invited user is already a member
      const existingMembership =
        await this.groupMemberRepository.findByGroupAndUserId(
          groupId,
          invitedUserId
        );
      if (existingMembership) {
        if (existingMembership.status === MembershipStatus.BANNED) {
          throw new ValidationError("This user is banned from the group");
        } else if (existingMembership.status === MembershipStatus.APPROVED) {
          throw new ValidationError("User is already a member of this group");
        } else if (existingMembership.status === MembershipStatus.PENDING) {
          throw new ValidationError(
            "User has already been invited to this group"
          );
        }
      }

      // Create invitation (pending membership)
      const membership = await this.groupMemberRepository.create({
        groupId,
        userId: invitedUserId,
        role: "member",
        status: MembershipStatus.PENDING,
        notificationSettings: {
          posts: true,
          events: true,
          announcements: true,
        },
        lastActivity: new Date(),
      });

      // In a real implementation, would send notification to invited user
      this.logger.info(
        `Invitation created for user ${invitedUserId} to group ${groupId}`
      );

      return membership;
    } catch (error) {
      this.logger.error(
        `Failed to invite user ${invitedUserId} to group ${groupId}`,
        { error }
      );
      throw error;
    }
  }

  /**
   * Respond to group invitation or membership request
   * @param groupId ID of the group
   * @param userId ID of the user
   * @param accept Whether to accept or reject the invitation/request
   * @param responderId ID of the user responding (for admin approval of join requests)
   * @returns Updated group membership
   */
  async respondToInvitation(
    groupId: string,
    userId: string,
    accept: boolean,
    responderId?: string
  ): Promise<GroupMember | null> {
    try {
      const isAdminResponse = !!responderId && responderId !== userId;

      if (isAdminResponse) {
        this.logger.info(
          `Admin ${responderId} ${accept ? "approving" : "rejecting"} membership for user ${userId} in group ${groupId}`
        );
      } else {
        this.logger.info(
          `User ${userId} ${accept ? "accepting" : "declining"} invitation to group ${groupId}`
        );
      }

      // Check if group exists
      const group = await this.groupRepository.findById(groupId);
      if (!group) {
        throw new ResourceNotFoundError("Group", groupId);
      }

      // Check if invitation/request exists
      const membership = await this.groupMemberRepository.findByGroupAndUserId(
        groupId,
        userId
      );
      if (!membership || membership.status !== MembershipStatus.PENDING) {
        throw new ResourceNotFoundError("GroupMember", `${groupId}:${userId}`);
      }

      // If admin is responding, check admin permissions
      if (isAdminResponse) {
        const responderMembership =
          await this.groupMemberRepository.findByGroupAndUserId(
            groupId,
            responderId
          );
        const isOwner = group.ownerId === responderId;
        const isAdmin = responderMembership?.role === "admin";

        if (!isOwner && !isAdmin) {
          throw new AccessDeniedError(
            "Only group admins can approve or reject membership requests"
          );
        }
      }

      if (accept) {
        // Accept invitation/request
        const updatedMembership = await this.groupMemberRepository.updateStatus(
          groupId,
          userId,
          MembershipStatus.APPROVED
        );

        // Update member count
        await this.groupRepository.update(groupId, {
          memberCount: group.memberCount + 1,
        });

        return updatedMembership;
      } else {
        // Reject invitation/request - remove the membership record
        await this.groupMemberRepository.delete(membership.id);
        return null;
      }
    } catch (error) {
      this.logger.error(
        `Failed to respond to group ${groupId} invitation for user ${userId}`,
        { error }
      );
      throw error;
    }
  }

  /**
   * Update group member (role, status, notification settings)
   * @param groupId ID of the group
   * @param userId ID of the user
   * @param updates Updates to apply
   * @param adminId ID of the admin making the changes
   * @returns Updated group membership
   */
  async updateGroupMember(
    groupId: string,
    userId: string,
    updates: GroupMemberUpdateDTO,
    adminId: string
  ): Promise<GroupMember> {
    try {
      this.logger.info(
        `Admin ${adminId} updating member ${userId} in group ${groupId}`,
        { updates }
      );

      // Check if group exists
      const group = await this.groupRepository.findById(groupId);
      if (!group) {
        throw new ResourceNotFoundError("Group", groupId);
      }

      // Check if user is a member
      const membership = await this.groupMemberRepository.findByGroupAndUserId(
        groupId,
        userId
      );
      if (!membership) {
        throw new ResourceNotFoundError("GroupMember", `${groupId}:${userId}`);
      }

      // Check admin permissions
      const adminMembership =
        await this.groupMemberRepository.findByGroupAndUserId(groupId, adminId);
      const isOwner = group.ownerId === adminId;
      const isAdmin = adminMembership?.role === "admin";

      if (!isOwner && !isAdmin) {
        throw new AccessDeniedError("Only group admins can update members");
      }

      // Cannot change owner's role unless you're the owner
      if (userId === group.ownerId && !isOwner) {
        throw new AccessDeniedError(
          "Only the group owner can change their own role"
        );
      }

      // Apply updates
      let updatedMembership = membership;

      // Update role if specified
      if (updates.role && updates.role !== membership.role) {
        const updatedRole = await this.groupMemberRepository.updateRole(
          groupId,
          userId,
          updates.role as GroupMemberRole
        );
        if (!updatedRole) {
          throw new Error("Failed to update member role");
        }
        updatedMembership = updatedRole;
      }

      // Update status if specified
      if (updates.status && updates.status !== membership.status) {
        const updatedStatus = await this.groupMemberRepository.updateStatus(
          groupId,
          userId,
          updates.status
        );
        if (!updatedStatus) {
          throw new Error("Failed to update member status");
        }
        updatedMembership = updatedStatus;

        // Update member count if status changed to/from APPROVED
        if (
          membership.status !== MembershipStatus.APPROVED &&
          updates.status === MembershipStatus.APPROVED
        ) {
          await this.groupRepository.update(groupId, {
            memberCount: group.memberCount + 1,
          });
        } else if (
          membership.status === MembershipStatus.APPROVED &&
          updates.status !== MembershipStatus.APPROVED
        ) {
          await this.groupRepository.update(groupId, {
            memberCount: Math.max(0, group.memberCount - 1),
          });
        }
      }

      // Update notification settings if specified
      if (updates.notificationSettings) {
        const currentSettings = membership.notificationSettings || {
          posts: true,
          events: true,
          announcements: true,
        };

        const updatedSettings =
          await this.groupMemberRepository.updateNotificationSettings(
            membership.id,
            {
              ...currentSettings,
              ...updates.notificationSettings,
            }
          );
        if (!updatedSettings) {
          throw new Error("Failed to update notification settings");
        }
        updatedMembership = updatedSettings;
      }

      return updatedMembership;
    } catch (error) {
      this.logger.error(
        `Failed to update member ${userId} in group ${groupId}`,
        { error }
      );
      throw error;
    }
  }

  /**
   * Remove a member from a group
   * @param groupId ID of the group
   * @param userId ID of the user to remove
   * @param adminId ID of the admin removing the user
   * @param ban Whether to ban the user or just remove them
   * @returns True if member was successfully removed
   */
  async removeMember(
    groupId: string,
    userId: string,
    adminId: string,
    ban = false
  ): Promise<boolean> {
    try {
      this.logger.info(
        `Admin ${adminId} ${ban ? "banning" : "removing"} member ${userId} from group ${groupId}`
      );

      // Check if group exists
      const group = await this.groupRepository.findById(groupId);
      if (!group) {
        throw new ResourceNotFoundError("Group", groupId);
      }

      // Check if user is a member
      const membership = await this.groupMemberRepository.findByGroupAndUserId(
        groupId,
        userId
      );
      if (!membership || membership.status !== MembershipStatus.APPROVED) {
        throw new ResourceNotFoundError("GroupMember", `${groupId}:${userId}`);
      }

      // Check admin permissions
      const adminMembership =
        await this.groupMemberRepository.findByGroupAndUserId(groupId, adminId);
      const isOwner = group.ownerId === adminId;
      const isAdmin = adminMembership?.role === "admin";

      if (!isOwner && !isAdmin) {
        throw new AccessDeniedError("Only group admins can remove members");
      }

      // Cannot remove owner
      if (userId === group.ownerId) {
        throw new AccessDeniedError("Cannot remove the group owner");
      }

      // Regular admins cannot remove other admins
      if (membership.role === "admin" && !isOwner) {
        throw new AccessDeniedError("Only the group owner can remove admins");
      }

      if (ban) {
        // Ban user - update status to banned
        await this.groupMemberRepository.updateStatus(
          groupId,
          userId,
          MembershipStatus.BANNED
        );
      } else {
        // Just remove - delete membership
        await this.groupMemberRepository.delete(membership.id);
      }

      // Update member count
      await this.groupRepository.update(groupId, {
        memberCount: Math.max(0, group.memberCount - 1),
      });

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to remove member ${userId} from group ${groupId}`,
        { error }
      );
      throw error;
    }
  }

  /**
   * Transfer group ownership to another member
   * @param groupId ID of the group
   * @param newOwnerId ID of the user to make the new owner
   * @param currentOwnerId ID of the current owner
   * @returns Updated group
   */
  async transferOwnership(
    groupId: string,
    newOwnerId: string,
    currentOwnerId: string
  ): Promise<Group> {
    try {
      this.logger.info(
        `Transferring ownership of group ${groupId} from ${currentOwnerId} to ${newOwnerId}`
      );

      // Check if group exists
      const group = await this.groupRepository.findById(groupId);
      if (!group) {
        throw new ResourceNotFoundError("Group", groupId);
      }

      // Check if current owner is the actual owner
      if (group.ownerId !== currentOwnerId) {
        throw new AccessDeniedError(
          "Only the group owner can transfer ownership"
        );
      }

      // Check if new owner is a member
      const newOwnerMembership =
        await this.groupMemberRepository.findByGroupAndUserId(
          groupId,
          newOwnerId
        );
      if (
        !newOwnerMembership ||
        newOwnerMembership.status !== MembershipStatus.APPROVED
      ) {
        throw new ValidationError(
          "New owner must be an active member of the group"
        );
      }

      // Update new owner's role to admin if not already
      if (newOwnerMembership.role !== "admin") {
        await this.groupMemberRepository.updateRole(
          groupId,
          newOwnerId,
          "admin" as GroupMemberRole
        );
      }

      // Update group owner
      const updatedGroup = await this.groupRepository.update(groupId, {
        ownerId: newOwnerId,
      });

      if (!updatedGroup) {
        throw new Error("Failed to update group owner");
      }

      return updatedGroup;
    } catch (error) {
      this.logger.error(`Failed to transfer ownership of group ${groupId}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Get pending membership requests
   * @param groupId ID of the group
   * @param options Pagination options
   * @returns Paginated list of pending membership requests
   */
  async getPendingRequests(
    groupId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<GroupMember>> {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      this.logger.info(`Getting pending requests for group ${groupId}`, {
        page,
        limit,
      });

      // Check if group exists
      const group = await this.groupRepository.findById(groupId);
      if (!group) {
        throw new ResourceNotFoundError("Group", groupId);
      }

      // Get pending members
      const pendingMembers = await this.groupMemberRepository.findByGroupId(
        groupId,
        limit,
        offset,
        MembershipStatus.PENDING
      );

      // Count total pending requests
      const total = await this.groupMemberRepository.countByStatus(
        groupId,
        MembershipStatus.PENDING
      );

      return {
        items: pendingMembers,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to get pending requests for group ${groupId}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Update a member's notification settings
   * @param groupId ID of the group
   * @param userId ID of the user
   * @param settings Notification settings to update
   * @returns Updated group membership
   */
  async updateNotificationSettings(
    groupId: string,
    userId: string,
    settings: {
      posts?: boolean;
      events?: boolean;
      announcements?: boolean;
    }
  ): Promise<GroupMember> {
    try {
      this.logger.info(
        `Updating notification settings for user ${userId} in group ${groupId}`,
        { settings }
      );

      // Check if user is a member
      const membership = await this.groupMemberRepository.findByGroupAndUserId(
        groupId,
        userId
      );
      if (!membership || membership.status !== MembershipStatus.APPROVED) {
        throw new ResourceNotFoundError("GroupMember", `${groupId}:${userId}`);
      }

      // Update notification settings
      const currentSettings = membership.notificationSettings || {
        posts: true,
        events: true,
        announcements: true,
      };

      const updatedSettings =
        await this.groupMemberRepository.updateNotificationSettings(
          membership.id,
          {
            ...currentSettings,
            ...settings,
          }
        );
      if (!updatedSettings) {
        throw new Error("Failed to update notification settings");
      }
      return updatedSettings;
    } catch (error) {
      this.logger.error(
        `Failed to update notification settings for user ${userId} in group ${groupId}`,
        { error }
      );
      throw error;
    }
  }

  /**
   * Update a member's last activity timestamp
   * @param groupId ID of the group
   * @param userId ID of the user
   * @returns Updated group membership
   */
  async updateLastActivity(
    groupId: string,
    userId: string
  ): Promise<GroupMember> {
    try {
      // Check if user is a member
      const membership = await this.groupMemberRepository.findByGroupAndUserId(
        groupId,
        userId
      );
      if (!membership || membership.status !== MembershipStatus.APPROVED) {
        throw new ResourceNotFoundError("GroupMember", `${groupId}:${userId}`);
      }

      // Update last activity
      const success = await this.groupMemberRepository.updateLastActivity(
        membership.id,
        new Date().toISOString()
      );
      if (!success) {
        throw new Error("Failed to update last activity");
      }

      // Fetch the updated membership
      const updatedMembership = await this.groupMemberRepository.findById(
        membership.id
      );
      if (!updatedMembership) {
        throw new Error("Failed to retrieve updated membership");
      }

      return updatedMembership;
    } catch (error) {
      this.logger.error(
        `Failed to update last activity for user ${userId} in group ${groupId}`,
        { error }
      );
      throw error;
    }
  }
}
