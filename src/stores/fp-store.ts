import { create } from "zustand";

export type FPType = "ILF" | "EIF" | "EQ" | "EI" | "EO";

export interface FPItem {
  id: string;
  appName: string;
  businessName: string;
  processName: string;
  description: string;
  fpType: FPType;
  weight: number;
  remark: string;
}

interface FPStore {
  items: FPItem[];
  editId: string | null;
  bizName: string;
  addItem: (item: FPItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, key: keyof FPItem, value: string | number) => void;
  setEditId: (id: string | null) => void;
  setBizName: (name: string) => void;
  clearAll: () => void;
  loadFromExcel: (items: FPItem[]) => void;
}

export const useFPStore = create<FPStore>()((set) => ({
  items: [],
  editId: null,
  bizName: "",
  addItem: (item: FPItem) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (id: string) =>
    set((prev) => ({
      items: prev.items.filter((i: FPItem) => i.id !== id),
      editId: prev.editId === id ? null : prev.editId,
    })),
  updateItem: (id: string, key: keyof FPItem, value: string | number) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, [key]: value } : i)),
    })),
  setEditId: (id: string | null) => set({ editId: id }),
  setBizName: (name: string) => set({ bizName: name }),
  clearAll: () => set({ items: [], editId: null, bizName: "" }),
  loadFromExcel: (items: FPItem[]) => set({ items }),
}));
