/** 界面偏好：浅色/深色主题与布局状态。 */

import { create } from "zustand";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "cv-platform-theme";

function readInitialTheme(): ThemeMode {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ThemeMode): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

interface UiState {
  theme: ThemeMode;
  sidebarOpen: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
}

const initialTheme = readInitialTheme();
applyTheme(initialTheme);

export const useUiStore = create<UiState>((set, get) => ({
  theme: initialTheme,
  // 小屏默认收起导航，避免首屏被侧边栏遮挡
  sidebarOpen: window.innerWidth >= 1024,
  toggleTheme: () => {
    const next: ThemeMode = get().theme === "dark" ? "light" : "dark";
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    set({ theme: next });
  },
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
}));
