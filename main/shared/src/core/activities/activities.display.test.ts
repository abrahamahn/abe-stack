// main/shared/src/core/activities/activities.display.test.ts

import { describe, expect, it } from 'vitest';

import { getActorTypeTone } from './activities.display';
import { ACTOR_TYPES } from './activities.schemas';

describe('activities.display', () => {
  describe('getActorTypeTone', () => {
    it('returns info for user', () => {
      expect(getActorTypeTone('user')).toBe('info');
    });

    it('returns warning for system', () => {
      expect(getActorTypeTone('system')).toBe('warning');
    });

    it('returns success for api_key', () => {
      expect(getActorTypeTone('api_key')).toBe('success');
    });

    it('returns a tone for every actor type', () => {
      for (const actorType of ACTOR_TYPES) {
        const tone = getActorTypeTone(actorType);
        expect(tone).toBeTruthy();
      }
    });

    it('defaults to info for unknown types', () => {
      expect(getActorTypeTone('unknown')).toBe('info');
    });
  });
});
