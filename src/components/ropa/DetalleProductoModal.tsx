import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Heart,
  Plus,
  Minus,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import type { ProductoRopa, ProductoColor, ItemCarritoRopa } from '../../data/ropaMockData';

interface DetalleProductoModalProps {
  producto: ProductoRopa | null;
  onClose: () => void;
  onAgregarAlCarrito: (item: ItemCarritoRopa) => void;
  esFavorito: boolean;
  onToggleFavorito: (id: string) => void;
}

export const DetalleProductoModal: React.FC<DetalleProductoModalProps> = ({
  producto,
  onClose,
  onAgregarAlCarrito,
  esFavorito,
  onToggleFavorito,
}) => {
  if (!producto) return null;

  const [talleSeleccionado, setTalleSeleccionado] = useState<string>(
    producto.talles[0] || 'M'
  );
  const [colorSeleccionado, setColorSeleccionado] = useState<ProductoColor>(
    producto.colores[0] || { id: 'c1', nombre: 'Default', hex: '#000000' }
  );
  const [fotoIndex, setFotoIndex] = useState<number>(0);
  const [cantidad, setCantidad] = useState<number>(1);
  const [agregadoAnim, setAgregadoAnim] = useState<boolean>(false);

  const handleAgregar = () => {
    setAgregadoAnim(true);
    onAgregarAlCarrito({
      producto,
      talle: talleSeleccionado,
      color: colorSeleccionado,
      cantidad,
      imagenSeleccionada: producto.imagenes[fotoIndex] || producto.imagenes[0],
    });

    setTimeout(() => {
      setAgregadoAnim(false);
    }, 1400);
  };

  const formatearPrecio = (valor: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(valor);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        {/* Backdrop con desenfoque de cristal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal / Sheet flotante */}
        <motion.div
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{
            type: 'spring',
            damping: 28,
            stiffness: 280,
          }}
          className="relative z-10 w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] bg-background rounded-t-[36px] sm:rounded-[36px] shadow-floating-lg overflow-hidden flex flex-col"
        >
          {/* Barra de arrastre móvil */}
          <div className="sm:hidden w-full flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
          </div>

          {/* Botones de acción flotantes superiores */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="pointer-events-auto w-11 h-11 rounded-full bg-background/80 backdrop-blur-md shadow-floating flex items-center justify-center text-foreground hover:bg-white transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </motion.button>

            <div className="flex items-center gap-2 pointer-events-auto">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => onToggleFavorito(producto.id)}
                className={`w-11 h-11 rounded-full backdrop-blur-md shadow-floating flex items-center justify-center transition-colors ${
                  esFavorito
                    ? 'bg-rose-500 text-white'
                    : 'bg-background/80 text-foreground hover:text-rose-500'
                }`}
                aria-label="Favorito"
              >
                <Heart
                  className={`w-5 h-5 ${esFavorito ? 'fill-current' : ''}`}
                />
              </motion.button>
            </div>
          </div>

          {/* Contenido scrolleable */}
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {/* Galería de Imagen Principal Flotante */}
            <div className="relative w-full h-[360px] sm:h-[440px] bg-secondary overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img
                  key={fotoIndex}
                  src={producto.imagenes[fotoIndex] || producto.imagenes[0]}
                  alt={producto.nombre}
                  initial={{ opacity: 0.4, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0.4, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="w-full h-full object-cover object-center"
                />
              </AnimatePresence>

              {/* Tag flotante */}
              {producto.tag && (
                <div className="absolute top-16 left-5 z-10">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>{producto.tag}</span>
                  </motion.div>
                </div>
              )}

              {/* Flechas de navegación rápida */}
              {producto.imagenes.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setFotoIndex((prev) =>
                        prev === 0 ? producto.imagenes.length - 1 : prev - 1
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center text-foreground opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setFotoIndex((prev) =>
                        prev === producto.imagenes.length - 1 ? 0 : prev + 1
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center text-foreground opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Miniaturas Flotantes (inspiradas exactamente en el diseño de Pinterest) */}
              {producto.imagenes.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
                  <div className="px-3 py-2 rounded-2xl bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg shadow-floating-sm flex items-center gap-2 border border-white/40 dark:border-white/10">
                    {producto.imagenes.map((img, idx) => (
                      <motion.button
                        key={idx}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setFotoIndex(idx)}
                        className={`relative w-11 h-13 rounded-xl overflow-hidden transition-all ${
                          fotoIndex === idx
                            ? 'ring-2 ring-orange-500 scale-105 shadow-sm'
                            : 'opacity-60 hover:opacity-90'
                        }`}
                      >
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bloque de Información y Configuración Flotante */}
            <div className="p-6 sm:p-7 space-y-6">
              {/* Encabezado: Título y Precios */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">
                    Alfajor Wear Studio
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-display font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
                    {producto.nombre}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {producto.subtitulo}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-2xl sm:text-3xl font-bold font-sans-modern text-foreground">
                    {formatearPrecio(producto.precio)}
                  </div>
                  {producto.precioAnterior && (
                    <div className="text-xs sm:text-sm text-zinc-400 line-through">
                      {formatearPrecio(producto.precioAnterior)}
                    </div>
                  )}
                </div>
              </div>

              {/* Selector de Talles Flotante */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Seleccionar Talle
                  </span>
                  <span className="text-xs text-primary font-medium">
                    Guía de medidas
                  </span>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {producto.talles.map((talle) => {
                    const esActivo = talleSeleccionado === talle;
                    return (
                      <motion.button
                        key={talle}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => setTalleSeleccionado(talle)}
                        className={`relative px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm tracking-wide transition-all ${
                          esActivo
                            ? 'bg-primary text-white shadow-floating-orange font-extrabold'
                            : 'bg-secondary text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {talle}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Color y Composición */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Colores */}
                <div className="p-4 rounded-2xl bg-secondary/60 border border-border/60">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                    Color: <strong className="text-foreground font-semibold">{colorSeleccionado.nombre}</strong>
                  </span>
                  <div className="flex items-center gap-3">
                    {producto.colores.map((color) => {
                      const activo = colorSeleccionado.id === color.id;
                      return (
                        <motion.button
                          key={color.id}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => setColorSeleccionado(color)}
                          className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            activo
                              ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 scale-110'
                              : 'opacity-85 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.nombre}
                        >
                          {activo && (
                            <Check
                              className={`w-4 h-4 ${
                                ['#fafaf9', '#f5f5f0', '#f5f5f4', '#e7e5e4', '#7dd3fc'].includes(
                                  color.hex
                                )
                                  ? 'text-zinc-900'
                                  : 'text-white'
                              }`}
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Composición & Calce */}
                <div className="p-4 rounded-2xl bg-secondary/60 border border-border/60">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Composición & Calce
                  </span>
                  <p className="text-xs font-semibold text-foreground">
                    {producto.composicion}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Fit: {producto.fit}
                  </p>
                </div>
              </div>

              {/* Descripción editorial */}
              <div className="text-sm text-muted-foreground leading-relaxed font-sans-modern">
                {producto.descripcion}
              </div>

              {/* Garantía y envíos pill */}
              <div className="flex flex-wrap gap-3 pt-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/70 px-3 py-1.5 rounded-full">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Envíos a todo el país</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/70 px-3 py-1.5 rounded-full">
                  <RefreshCw className="w-3.5 h-3.5 text-primary" />
                  <span>Primer cambio gratuito</span>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de acción flotante inferior */}
          <div className="p-4 sm:p-5 bg-background/95 backdrop-blur-xl border-t border-border/60 flex items-center gap-4">
            {/* Stepper de Cantidad */}
            <div className="flex items-center bg-secondary rounded-2xl px-2 py-1.5 border border-border">
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={() => setCantidad((prev) => Math.max(1, prev - 1))}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-white dark:hover:bg-zinc-800 transition-colors"
                disabled={cantidad <= 1}
              >
                <Minus className="w-4 h-4" />
              </motion.button>
              <span className="w-9 text-center font-bold text-sm text-foreground">
                {String(cantidad).padStart(2, '0')}
              </span>
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={() => setCantidad((prev) => prev + 1)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-white dark:hover:bg-zinc-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Botón Principal "+ Agregar a la bolsa" */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleAgregar}
              className={`flex-1 h-14 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-300 ${
                agregadoAnim
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-floating'
              }`}
            >
              {agregadoAnim ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  <span className="tracking-wide">¡Agregado a la Bolsa!</span>
                </motion.div>
              ) : (
                <div className="flex items-center justify-between w-full px-5">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-primary-foreground" />
                    <span className="tracking-wide text-sm sm:text-base">
                      Agregar a la bolsa
                    </span>
                  </div>
                  <span className="font-bold text-sm sm:text-base opacity-90 font-sans-modern">
                    {formatearPrecio(producto.precio * cantidad)}
                  </span>
                </div>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
