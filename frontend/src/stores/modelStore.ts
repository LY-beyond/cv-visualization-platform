/** 模型状态：列表、模型卡片信息与当前选择。 */

import { create } from "zustand";

import { ApiError, api } from "../api/client";
import type { ModelMeta } from "../api/types";

interface ModelState {
  items: ModelMeta[];
  currentId: string | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  select: (id: string) => void;
}

export const useModelStore = create<ModelState>((set, get) => ({
  items: [],
  currentId: null,
  loading: false,
  error: null,
  load: async () => {
    if (get().loading || get().items.length > 0) return;
    set({ loading: true, error: null });
    try {
      const items = await api.models.list();
      set({
        items,
        loading: false,
        currentId: get().currentId ?? items[0]?.id ?? null,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof ApiError ? error.message : "模型加载失败",
      });
    }
  },
  select: (id) => set({ currentId: id }),
}));
