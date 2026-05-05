import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@/types';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;

  initAuth: () => Promise<void>;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const SESSION_KEY = 'user_session';

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isAuthenticated: false,

  initAuth: async () => {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (raw) {
      const user: User = JSON.parse(raw);
      set({ currentUser: user, isAuthenticated: true });
    }
  },

  login: async (user: User) => {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
    set({ currentUser: user, isAuthenticated: true });
  },

  logout: async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    set({ currentUser: null, isAuthenticated: false });
  },
}));
