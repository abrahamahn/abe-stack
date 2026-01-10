import { describe, expect, it, beforeEach } from 'vitest';

import { toastStore } from '../toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    // Clear all messages before each test
    const state = toastStore.getState();
    state.messages.forEach((msg) => {
      state.dismiss(msg.id);
    });
  });

  describe('show', () => {
    it('should add a message with generated id', () => {
      const state = toastStore.getState();
      state.show({ title: 'Test Title' });

      const messages = toastStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].title).toBe('Test Title');
      expect(messages[0].id).toBeDefined();
    });

    it('should add a message with title and description', () => {
      const state = toastStore.getState();
      state.show({ title: 'Title', description: 'Description' });

      const messages = toastStore.getState().messages;
      expect(messages[0].title).toBe('Title');
      expect(messages[0].description).toBe('Description');
    });

    it('should add multiple messages', () => {
      const state = toastStore.getState();
      state.show({ title: 'First' });
      state.show({ title: 'Second' });
      state.show({ title: 'Third' });

      const messages = toastStore.getState().messages;
      expect(messages).toHaveLength(3);
      expect(messages[0].title).toBe('First');
      expect(messages[1].title).toBe('Second');
      expect(messages[2].title).toBe('Third');
    });

    it('should generate unique ids for each message', () => {
      const state = toastStore.getState();
      state.show({ title: 'First' });
      state.show({ title: 'Second' });

      const messages = toastStore.getState().messages;
      expect(messages[0].id).not.toBe(messages[1].id);
    });
  });

  describe('dismiss', () => {
    it('should remove a message by id', () => {
      const state = toastStore.getState();
      state.show({ title: 'To Remove' });

      const messageId = toastStore.getState().messages[0].id;
      state.dismiss(messageId);

      expect(toastStore.getState().messages).toHaveLength(0);
    });

    it('should only remove the specified message', () => {
      const state = toastStore.getState();
      state.show({ title: 'First' });
      state.show({ title: 'Second' });
      state.show({ title: 'Third' });

      const messages = toastStore.getState().messages;
      const secondId = messages[1].id;
      state.dismiss(secondId);

      const remaining = toastStore.getState().messages;
      expect(remaining).toHaveLength(2);
      expect(remaining[0].title).toBe('First');
      expect(remaining[1].title).toBe('Third');
    });

    it('should handle dismissing non-existent id gracefully', () => {
      const state = toastStore.getState();
      state.show({ title: 'Existing' });

      expect(() => {
        state.dismiss('non-existent-id');
      }).not.toThrow();

      expect(toastStore.getState().messages).toHaveLength(1);
    });
  });

  describe('initial state', () => {
    it('should start with empty messages array', () => {
      // Note: This test may fail if run after other tests without proper isolation
      // The beforeEach clears messages, so this tests the cleared state
      expect(toastStore.getState().messages).toHaveLength(0);
    });

    it('should have show and dismiss functions', () => {
      const state = toastStore.getState();
      expect(typeof state.show).toBe('function');
      expect(typeof state.dismiss).toBe('function');
    });
  });
});
