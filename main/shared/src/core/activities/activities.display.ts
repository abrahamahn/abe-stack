// main/shared/src/core/activities/activities.display.ts

// ============================================================================
// Actor Type Display
// ============================================================================

const ACTOR_TYPE_TONES: Record<string, 'info' | 'success' | 'warning'> = {
  user: 'info',
  system: 'warning',
  api_key: 'success',
};

/**
 * Get the badge tone for an activity actor type.
 */
export function getActorTypeTone(actorType: string): 'info' | 'success' | 'warning' {
  return ACTOR_TYPE_TONES[actorType] ?? 'info';
}
