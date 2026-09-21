import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ItemCarritoRopa } from '../lib/ropa';

/**
 * v2: el carrito pasó de la maqueta (`ropaMockData`, ids string y colores con id) al catálogo
 * real de la API (ids numéricos, colores por nombre). Los carritos guardados con la forma
 * vieja no se pueden migrar sin ambigüedad, así que se descartan.
 */
const VERSION_CARRITO = 2;

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
              i.color.nombre === nuevoItem.color.nombre
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
      version: VERSION_CARRITO,
      partialize: (state) => ({ items: state.items }),
      // Cualquier carrito de una versión anterior viene de la maqueta: se arranca vacío.
      migrate: () => ({ items: [] }),
    }
  )
);
