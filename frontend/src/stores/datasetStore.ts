/** 数据集状态：列表、当前选择与加载状态。 */

import { create } from "zustand";

import { ApiError, api } from "../api/client";
import type { DatasetMeta } from "../api/types";

interface DatasetState {
  items: DatasetMeta[];
  currentId: string | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  select: (id: string) => void;
}

export const useDatasetStore = create<DatasetState>((set, get) => ({
  items: [],
  currentId: null,
  loading: false,
  error: null,
  load: async () => {
    if (get().loading || get().items.length > 0) return;
    set({ loading: true, error: null });
    try {
      const items = await api.datasets.list();
      set({
        items,
        loading: false,
        currentId: get().currentId ?? items[0]?.id ?? null,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof ApiError ? error.message : "数据集加载失败",
      });
    }
  },
  select: (id) => set({ currentId: id }),
}));
