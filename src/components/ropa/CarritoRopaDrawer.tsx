import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import type { ItemCarritoRopa } from '../../data/ropaMockData';

interface CarritoRopaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: ItemCarritoRopa[];
  onActualizarCantidad: (index: number, delta: number) => void;
  onEliminarItem: (index: number) => void;
  onVaciarCarrito: () => void;
}

export const CarritoRopaDrawer = ({
  isOpen,
  onClose,
  items,
  onActualizarCantidad,
  onEliminarItem,
  onVaciarCarrito,
}: CarritoRopaDrawerProps) => {
  if (!isOpen) return null;

  const total = items.reduce(
    (acc, item) => acc + item.producto.precio * item.cantidad,
    0
  );

  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);

  const formatearPrecio = (valor: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(valor);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop desenfocado */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Panel lateral flotante */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          className="relative z-10 w-full max-w-md h-full bg-background shadow-2xl flex flex-col justify-between border-l border-border"
        >
          {/* Header del Carrito */}
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display text-foreground">
                  Tu Bolsa de Compras
                </h3>
                <p className="text-xs text-zinc-500">
                  {totalItems} {totalItems === 1 ? 'prenda' : 'prendas'} seleccionadas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  onClick={onVaciarCarrito}
                  className="text-xs text-zinc-400 hover:text-rose-500 font-medium px-2 py-1 transition-colors"
                >
                  Vaciar
                </button>
              )}
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:bg-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lista de productos en bolsa */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 mb-4">
                  <ShoppingBag className="w-8 h-8 opacity-40" />
                </div>
                <h4 className="text-base font-bold font-display text-foreground">
                  Tu bolsa está vacía
                </h4>
                <p className="text-xs text-zinc-500 max-w-[240px] mt-1">
                  Explora las prendas del Drop 01 y selecciona tu talle favorito.
                </p>
              </div>
            ) : (
              items.map((item, index) => (
                <motion.div
                  key={`${item.producto.id}-${item.talle}-${item.color.id}-${index}`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="p-3.5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/80 flex gap-3.5 items-center"
                >
                  {/* Imagen de la prenda */}
                  <img
                    src={item.imagenSeleccionada}
                    alt={item.producto.nombre}
                    className="w-20 h-24 object-cover rounded-2xl shrink-0 bg-zinc-200"
                  />

                  {/* Datos del ítem */}
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold font-display text-sm text-foreground truncate">
                      {item.producto.nombre}
                    </h5>

                    {/* Talle y Color Chips */}
                    <div className="flex items-center gap-2 mt-1 mb-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700">
                        Talle: {item.talle}
                      </span>
                      <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: item.color.hex }}
                        />
                        {item.color.nombre}
                      </span>
                    </div>

                    {/* Precios y Stepper */}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground font-sans-modern">
                        {formatearPrecio(item.producto.precio * item.cantidad)}
                      </span>

                      <div className="flex items-center bg-white dark:bg-zinc-800 rounded-xl px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-700">
                        <button
                          onClick={() => onActualizarCantidad(index, -1)}
                          className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-zinc-900"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => onActualizarCantidad(index, 1)}
                          className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-zinc-900"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Borrar ítem */}
                  <button
                    onClick={() => onEliminarItem(index)}
                    className="text-zinc-400 hover:text-rose-500 p-1.5 transition-colors"
                    title="Eliminar prenda"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))
            )}
          </div>

          {/* Footer con Resumen y Checkout */}
          {items.length > 0 && (
            <div className="p-6 bg-background border-t border-border space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground font-sans-modern">
                    {formatearPrecio(total)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Envío gratuito por lanzamiento
                  </span>
                  <span>$0</span>
                </div>
                <div className="flex items-center justify-between text-base font-bold text-foreground pt-2 border-t border-border">
                  <span>Total estimado</span>
                  <span className="text-xl font-display text-primary">
                    {formatearPrecio(total)}
                  </span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  alert(
                    '¡Maqueta interactiva! Esta orden pasará a la pasarela de pagos al integrar la tienda.'
                  );
                }}
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center justify-center gap-2 shadow-floating transition-colors"
              >
                <span>Iniciar Compra</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
