// infra/stores/src/toastStore.test.ts
import { describe, expect, it, beforeEach } from 'vitest';

import { toastStore, type ToastMessage } from './toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    // Clear all messages before each test
    const state = toastStore.getState();
    state.messages.forEach((msg: ToastMessage) => {
      state.dismiss(msg.id);
    });
  });

  describe('show', () => {
    it('should add a message with generated id', () => {
      const state = toastStore.getState();
      state.show({ title: 'Test Title' });

      const messages = toastStore.getState().messages;
      expect(messages).toHaveLength(1);
      const firstMessage = messages[0];
      if (firstMessage === undefined) {
        throw new Error('Expected message to exist');
      }
      expect(firstMessage.title).toBe('Test Title');
      expect(firstMessage.id).toBeDefined();
    });

    it('should add a message with title and description', () => {
      const state = toastStore.getState();
      state.show({ title: 'Title', description: 'Description' });

      const messages = toastStore.getState().messages;
      const firstMessage = messages[0];
      if (firstMessage === undefined) {
        throw new Error('Expected message to exist');
      }
      expect(firstMessage.title).toBe('Title');
      expect(firstMessage.description).toBe('Description');
    });

    it('should add multiple messages', () => {
      const state = toastStore.getState();
      state.show({ title: 'First' });
      state.show({ title: 'Second' });
      state.show({ title: 'Third' });

      const messages = toastStore.getState().messages;
      expect(messages).toHaveLength(3);
      const [first, second, third] = messages;
      if (first === undefined || second === undefined || third === undefined) {
        throw new Error('Expected all messages to exist');
      }
      expect(first.title).toBe('First');
      expect(second.title).toBe('Second');
      expect(third.title).toBe('Third');
    });

    it('should generate unique ids for each message', () => {
      const state = toastStore.getState();
      state.show({ title: 'First' });
      state.show({ title: 'Second' });

      const messages = toastStore.getState().messages;
      const [first, second] = messages;
      if (first === undefined || second === undefined) {
        throw new Error('Expected both messages to exist');
      }
      expect(first.id).not.toBe(second.id);
    });
  });

  describe('dismiss', () => {
    it('should remove a message by id', () => {
      const state = toastStore.getState();
      state.show({ title: 'To Remove' });

      const firstMessage = toastStore.getState().messages[0];
      if (firstMessage === undefined) {
        throw new Error('Expected message to exist');
      }
      state.dismiss(firstMessage.id);

      expect(toastStore.getState().messages).toHaveLength(0);
    });

    it('should only remove the specified message', () => {
      const state = toastStore.getState();
      state.show({ title: 'First' });
      state.show({ title: 'Second' });
      state.show({ title: 'Third' });

      const messages = toastStore.getState().messages;
      const secondMessage = messages[1];
      if (secondMessage === undefined) {
        throw new Error('Expected second message to exist');
      }
      state.dismiss(secondMessage.id);

      const remaining = toastStore.getState().messages;
      expect(remaining).toHaveLength(2);
      const [first, third] = remaining;
      if (first === undefined || third === undefined) {
        throw new Error('Expected remaining messages to exist');
      }
      expect(first.title).toBe('First');
      expect(third.title).toBe('Third');
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
