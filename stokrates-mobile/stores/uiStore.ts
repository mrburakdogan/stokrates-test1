import { create } from 'zustand';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, type ColorPalette } from '@/constants/theme';

type ThemeMode = 'light' | 'dark';

interface UIState {
  theme: ThemeMode;
  colors: ColorPalette;
  isLoading: boolean;

  initTheme: () => Promise<void>;
  toggleTheme: () => void;
  setLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  colors: Appearance.getColorScheme() === 'dark' ? COLORS.dark : COLORS.light,
  isLoading: true,

  initTheme: async () => {
    const stored = await AsyncStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') {
      set({ theme: stored, colors: COLORS[stored] });
    }
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: next, colors: COLORS[next] });
    AsyncStorage.setItem('theme', next);
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
