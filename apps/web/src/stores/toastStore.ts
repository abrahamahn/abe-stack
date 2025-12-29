import { nanoid } from 'nanoid';
import { create } from 'zustand';

type ToastMessage = {
  id: string;
  title?: string;
  description?: string;
};

type ToastState = {
  messages: ToastMessage[];
  show: (msg: Omit<ToastMessage, 'id'>) => void;
  dismiss: (id: string) => void;
};

export const toastStore = create<ToastState>((set) => ({
  messages: [],
  show: (msg): void => {
    set((state) => ({
      messages: [...state.messages, { id: nanoid(), ...msg }],
    }));
  },
  dismiss: (id): void => {
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    }));
  },
}));
