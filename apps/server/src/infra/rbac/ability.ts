// apps/server/src/infra/rbac/ability.ts
/**
 * Custom RBAC Ability System
 *
 * A lightweight, framework-agnostic permission system.
 * Similar to CASL but without external dependencies.
 *
 * Features:
 * - Action-based permissions (create, read, update, delete, manage)
 * - Subject-based permissions (Post, User, Comment, etc.)
 * - Attribute-based access control (ABAC) via conditions
 * - Wildcard support ('all' for any subject, 'manage' for any action)
 */

// ============================================================================
// Types
// ============================================================================

/** Standard CRUD actions plus 'manage' (all actions) */
export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage';

/** Subject can be a string (entity name) or 'all' for any entity */
export type Subject = string;

/** Condition for attribute-based access control */
export type Condition = Record<string, unknown>;

/** A single permission rule */
export interface Rule {
  action: Action;
  subject: Subject;
  conditions?: Condition;
  /** If true, this is a deny rule (inverted) */
  inverted?: boolean;
}

/** Builder interface for defining abilities fluently */
export interface AbilityBuilder {
  can(action: Action, subject: Subject, conditions?: Condition): void;
  cannot(action: Action, subject: Subject, conditions?: Condition): void;
}

/** Function that defines abilities for a user */
export type AbilityDefiner = (builder: AbilityBuilder) => void;

// ============================================================================
// Ability Class
// ============================================================================

export class Ability {
  private rules: Rule[] = [];

  constructor(rules: Rule[] = []) {
    this.rules = rules;
  }

  /**
   * Check if an action is allowed on a subject
   *
   * @param action - The action to check (create, read, update, delete, manage)
   * @param subject - The subject/entity type (Post, User, etc.)
   * @param instance - Optional instance for attribute-based checks
   * @returns true if the action is allowed
   *
   * @example
   * ability.can('read', 'Post') // Can read any post?
   * ability.can('update', 'Post', { authorId: 'user-123' }) // Can update this specific post?
   */
  can(action: Action, subject: Subject, instance?: Record<string, unknown>): boolean {
    // Find applicable rules (most specific first)
    const applicableRules = this.findApplicableRules(action, subject);

    // No rules = no permission
    if (applicableRules.length === 0) {
      return false;
    }

    // Check rules in order (last matching rule wins)
    let allowed = false;

    for (const rule of applicableRules) {
      // Check if conditions match the instance
      if (rule.conditions && instance) {
        if (!this.matchesConditions(rule.conditions, instance)) {
          continue; // Conditions don't match, skip this rule
        }
      }

      // If rule has conditions but no instance provided, skip
      if (rule.conditions && !instance) {
        continue;
      }

      // Apply the rule
      allowed = !rule.inverted;
    }

    return allowed;
  }

  /**
   * Check if an action is NOT allowed (inverse of can)
   */
  cannot(action: Action, subject: Subject, instance?: Record<string, unknown>): boolean {
    return !this.can(action, subject, instance);
  }

  /**
   * Get all rules
   */
  getRules(): readonly Rule[] {
    return this.rules;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private findApplicableRules(action: Action, subject: Subject): Rule[] {
    return this.rules.filter((rule) => {
      // Check action match
      const actionMatch = rule.action === action || rule.action === 'manage';

      // Check subject match
      const subjectMatch = rule.subject === subject || rule.subject === 'all';

      return actionMatch && subjectMatch;
    });
  }

  private matchesConditions(conditions: Condition, instance: Record<string, unknown>): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (instance[key] !== value) {
        return false;
      }
    }
    return true;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Define abilities using a builder pattern
 *
 * @example
 * const ability = defineAbility((builder) => {
 *   if (user.role === 'admin') {
 *     builder.can('manage', 'all');
 *   }
 *
 *   builder.can('read', 'Post');
 *   builder.can('update', 'Post', { authorId: user.id });
 *   builder.cannot('delete', 'Post');
 * });
 */
export function defineAbility(definer: AbilityDefiner): Ability {
  const rules: Rule[] = [];

  const builder: AbilityBuilder = {
    can(action: Action, subject: Subject, conditions?: Condition): void {
      rules.push({ action, subject, conditions, inverted: false });
    },
    cannot(action: Action, subject: Subject, conditions?: Condition): void {
      rules.push({ action, subject, conditions, inverted: true });
    },
  };

  definer(builder);

  return new Ability(rules);
}

/**
 * Create an empty ability (no permissions)
 */
export function createEmptyAbility(): Ability {
  return new Ability([]);
}

/**
 * Create an admin ability (all permissions)
 */
export function createAdminAbility(): Ability {
  return defineAbility((builder) => {
    builder.can('manage', 'all');
  });
}
