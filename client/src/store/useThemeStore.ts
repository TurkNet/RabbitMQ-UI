import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeStore {
    isDarkMode: boolean;
    toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
    persist(
        (set) => ({
            isDarkMode: true,
            toggleTheme: () => set((state) => {
                const newMode = !state.isDarkMode;
                if (newMode) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                return { isDarkMode: newMode };
            }),
        }),
        {
            name: 'theme-storage',
        }
    )
);
