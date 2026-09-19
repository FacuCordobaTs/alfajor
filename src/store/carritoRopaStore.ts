import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ItemCarritoRopa } from '../data/ropaMockData';

interface CarritoRopaState {
  items: ItemCarritoRopa[];
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  agregarItem: (nuevoItem: ItemCarritoRopa) => void;
  actualizarCantidad: (index: number, delta: number) => void;
  eliminarItem: (index: number) => void;
  vaciarCarrito: () => void;
  totalPrendas: () => number;
}

export const useCarritoRopaStore = create<CarritoRopaState>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,

      setIsDrawerOpen: (open) => set({ isDrawerOpen: open }),

      agregarItem: (nuevoItem) => {
        set((state) => {
          const indexExistente = state.items.findIndex(
            (i) =>
              i.producto.id === nuevoItem.producto.id &&
              i.talle === nuevoItem.talle &&
              i.color.id === nuevoItem.color.id
          );

          if (indexExistente > -1) {
            const copia = [...state.items];
            copia[indexExistente].cantidad += nuevoItem.cantidad;
            return { items: copia };
          }
          return { items: [...state.items, nuevoItem] };
        });
      },

      actualizarCantidad: (index, delta) => {
        set((state) => {
          const copia = [...state.items];
          if (!copia[index]) return state;
          const nuevaCantidad = copia[index].cantidad + delta;
          if (nuevaCantidad <= 0) {
            return { items: copia.filter((_, i) => i !== index) };
          }
          copia[index].cantidad = nuevaCantidad;
          return { items: copia };
        });
      },

      eliminarItem: (index) => {
        set((state) => ({
          items: state.items.filter((_, i) => i !== index),
        }));
      },

      vaciarCarrito: () => set({ items: [] }),

      totalPrendas: () => {
        return get().items.reduce((sum, item) => sum + item.cantidad, 0);
      },
    }),
    {
      name: 'piru-ropa-carrito-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
