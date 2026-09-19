import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  ChevronsDown,
} from 'lucide-react';
import {
  PRODUCTOS_ROPA,
  type ProductoColor,
} from '../data/ropaMockData';
import { useCarritoRopaStore } from '../store/carritoRopaStore';
import { CarritoRopaDrawer } from '../components/ropa/CarritoRopaDrawer';

type Tema = { primario: string; secundario: string };

function temaValido(tema: Tema | null): tema is Tema {
  return !!tema && /^#[0-9a-f]{6}$/i.test(tema.primario) && /^#[0-9a-f]{6}$/i.test(tema.secundario);
}

export default function ProductoRopaDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    items,
    isDrawerOpen,
    setIsDrawerOpen,
    agregarItem,
    actualizarCantidad,
    eliminarItem,
    vaciarCarrito,
    totalPrendas,
  } = useCarritoRopaStore();

  const producto = PRODUCTOS_ROPA.find((p) => p.id === id);

  const [talleSeleccionado, setTalleSeleccionado] = useState<string>(
    producto?.talles[0] || 'M'
  );
  const [colorSeleccionado, setColorSeleccionado] = useState<ProductoColor>(
    producto?.colores[0] || { id: 'c1', nombre: 'Default', hex: '#000000' }
  );
  const [fotoIndex, setFotoIndex] = useState<number>(0);
  const [cantidad, setCantidad] = useState<number>(1);
  const [notificacionToast, setNotificacionToast] = useState<string | null>(null);
  const [mostrarIndicadorScroll, setMostrarIndicadorScroll] = useState(true);

  const [tema, setTema] = useState<Tema | null>(() => {
    try {
      const cached = JSON.parse(sessionStorage.getItem('theme_alfajor') || 'null');
      return temaValido(cached) ? cached : null;
    } catch { return null; }
  });

  useEffect(() => {
    const controller = new AbortController();
    const cargarTema = async () => {
      try {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const res = await fetch(`${base}/public/restaurante/alfajor`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        const local = data.data?.restaurante;
        const nuevo = { primario: local?.colorPrimario, secundario: local?.colorSecundario };
        if (temaValido(nuevo)) {
          setTema(nuevo);
          try { sessionStorage.setItem('theme_alfajor', JSON.stringify(nuevo)); } catch { /* Storage opcional. */ }
        }
      } catch { /* Conserva el tema base */ }
    };
    void cargarTema();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [id]);

  useEffect(() => {
    const actualizarIndicador = () => setMostrarIndicadorScroll(window.scrollY < 48);

    actualizarIndicador();
    window.addEventListener('scroll', actualizarIndicador, { passive: true });
    return () => window.removeEventListener('scroll', actualizarIndicador);
  }, []);

  const totalPrendasEnCarrito = totalPrendas();

  const formatearPrecio = (valor: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(valor);
  };

  const handleAgregar = () => {
    if (!producto) return;

    agregarItem({
      producto,
      talle: talleSeleccionado,
      color: colorSeleccionado,
      cantidad,
      imagenSeleccionada: producto.imagenes[fotoIndex] || producto.imagenes[0],
    });

    setNotificacionToast(`Agregaste ${producto.nombre} (${talleSeleccionado})`);
    setTimeout(() => {
      setNotificacionToast(null);
    }, 2800);
  };

  if (!producto) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold font-display mb-2">Prenda no encontrada</h2>
        <p className="text-sm text-zinc-400 mb-6 max-w-xs">
          La prenda que buscas no está disponible o ha sido retirada del drop.
        </p>
        <button
          onClick={() => navigate('/ropa')}
          className="px-6 py-3 rounded-2xl bg-white text-zinc-950 font-bold text-sm hover:bg-zinc-200 transition-colors"
        >
          Volver a la tienda
        </button>
      </div>
    );
  }

  const primario = tema?.primario;
  const secundario = tema?.secundario;
  const themeStyles = (primario && secundario) ? (
    <style dangerouslySetInnerHTML={{
      __html: `
        :root {
          --background: ${secundario};
          --foreground: ${primario};
          --primary: ${primario};
          --primary-foreground: ${secundario};
        }
      `
    }} />
  ) : null;

  return (
    <div className="relative min-h-[100dvh] w-full bg-zinc-950 text-foreground selection:bg-primary selection:text-primary-foreground">
      {themeStyles}

      {/* Imagen de Fondo Completa */}
      <div className="fixed inset-0 z-0 bg-zinc-950">
        <img
          src={producto.imagenes[fotoIndex] || producto.imagenes[0]}
          alt={producto.nombre}
          className="h-full w-full object-cover object-top sm:object-center"
        />

        {/* Gradiente sutil para garantizar legibilidad de la botonera y la tarjeta */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40 pointer-events-none" />
      </div>

      {/* Volver es el único control de la página por encima del panel. */}
      <div className="fixed left-5 top-5 z-[60] sm:left-8 sm:top-7">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/ropa')}
          className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white transition-all shadow-floating"
          title="Volver a la tienda"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="fixed right-5 top-5 z-30 sm:right-8 sm:top-7">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsDrawerOpen(true)}
          className="relative w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white transition-all shadow-floating"
          title="Ver bolsa de compras"
        >
          <ShoppingBag className="w-5 h-5" />
          {totalPrendasEnCarrito > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold flex items-center justify-center shadow-md">
              {totalPrendasEnCarrito}
            </span>
          )}
        </motion.button>
      </div>

      {/* Miniaturas Verticales a la derecha (Inspiradas en Screen 3) */}
      {producto.imagenes.length > 1 && (
        <div className="fixed right-4 top-24 z-30 flex flex-col gap-2.5 sm:right-7 sm:top-28">
          {producto.imagenes.map((img, idx) => {
            const isSelected = fotoIndex === idx;
            return (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.92 }}
                onClick={() => setFotoIndex(idx)}
                className={`relative w-12 h-16 sm:w-14 sm:h-18 rounded-2xl overflow-hidden backdrop-blur-md transition-all ${
                  isSelected
                    ? 'ring-2 ring-primary scale-105 shadow-floating border border-white/80'
                    : 'opacity-70 hover:opacity-100 border border-white/30'
                }`}
              >
                <img
                  src={img}
                  alt={`Vista ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </motion.button>
            );
          })}
        </div>
      )}

      {/* El documento hace el scroll; la imagen permanece fija detrás del panel. */}
      <main className="relative z-50 mx-auto w-[calc(100%-2rem)] max-w-xl pt-[75dvh] sm:w-[calc(100%-3rem)] sm:pt-[70dvh]">
        <AnimatePresence>
          {mostrarIndicadorScroll && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, y: [0, 6, 0] }}
              exit={{ opacity: 0, y: 8 }}
              transition={{
                opacity: { duration: 0.18 },
                y: { duration: 1.25, repeat: Infinity, ease: 'easeInOut' },
              }}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 -top-12 z-10 mx-auto flex w-fit items-center justify-center text-white drop-shadow-[0_3px_5px_rgba(0,0,0,0.9)]"
            >
              <ChevronsDown className="h-8 w-8" strokeWidth={2.25} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {notificacionToast && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="fixed left-1/2 top-5 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/15 bg-zinc-950/90 px-5 py-3 text-white shadow-floating backdrop-blur-md"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span className="text-xs font-semibold tracking-wide sm:text-sm">
                {notificacionToast}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className="space-y-5 rounded-t-[32px] border-x border-t border-primary/20 bg-background/95 px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-foreground shadow-floating-lg backdrop-blur-2xl sm:rounded-t-[38px] sm:px-6 sm:pt-6 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          {/* Fila Superior: Nombre del producto y Precio */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-primary/15">
            <div>
              <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/65">
                Alfajor Wear Studio
              </p>
              <h1 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight text-foreground">
                {producto.nombre}
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-foreground/65">
                {producto.subtitulo}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xl sm:text-2xl font-sans-modern font-extrabold text-foreground">
                {formatearPrecio(producto.precio)}
              </span>
              {producto.precioAnterior && (
                <div className="text-[11px] text-foreground/45 line-through">
                  {formatearPrecio(producto.precioAnterior)}
                </div>
              )}
            </div>
          </div>

          {/* Opciones apiladas, cada una ocupando todo el ancho disponible */}
          <div className="flex flex-col gap-3">
            <section className="w-full rounded-2xl border border-primary/15 bg-primary/[0.07] p-3.5 sm:p-4">
              <span className="mb-2.5 block text-[10px] font-extrabold uppercase tracking-wider text-foreground/60">
                Elegí tu talle
              </span>
              <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-4">
                {producto.talles.map((talle) => {
                  const isSel = talleSeleccionado === talle;
                  return (
                    <button
                      key={talle}
                      onClick={() => setTalleSeleccionado(talle)}
                      className={`h-10 w-full rounded-xl text-xs font-extrabold transition-all ${
                        isSel
                          ? 'bg-primary text-primary-foreground shadow-floating-sm'
                          : 'border border-primary/15 bg-background/70 text-foreground hover:bg-primary/10'
                      }`}
                    >
                      {talle}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="w-full rounded-2xl border border-primary/15 bg-primary/[0.07] p-3.5 sm:p-4">
              <span className="mb-2.5 block text-[10px] font-extrabold uppercase tracking-wider text-foreground/60">
                Color: <strong className="text-foreground">{colorSeleccionado.nombre}</strong>
              </span>
              <div className="grid w-full grid-cols-2 gap-2">
                {producto.colores.map((color) => {
                  const isSel = colorSeleccionado.id === color.id;
                  return (
                    <button
                      key={color.id}
                      onClick={() => setColorSeleccionado(color)}
                      className={`flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs font-bold transition-all ${
                        isSel
                          ? 'bg-primary text-primary-foreground shadow-floating-sm'
                          : 'border border-primary/15 bg-background/70 text-foreground hover:bg-primary/10'
                      }`}
                    >
                      <span
                        className="h-5 w-5 shrink-0 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="truncate">{color.nombre}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="flex w-full items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-primary/[0.07] p-3.5 sm:p-4">
              <div>
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-foreground/60">
                  Cantidad
                </span>
                <span className="text-xs font-semibold text-foreground/70">Unidades para agregar</span>
              </div>
              <div className="flex min-w-32 items-center justify-between rounded-xl border border-primary/15 bg-background/70 p-1">
                <button
                  onClick={() => setCantidad((prev) => Math.max(1, prev - 1))}
                  disabled={cantidad <= 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-primary/10 disabled:opacity-30"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-sans-modern text-sm font-extrabold text-foreground">
                  {String(cantidad).padStart(2, '0')}
                </span>
                <button
                  onClick={() => setCantidad((prev) => prev + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </section>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAgregar}
              className="flex h-14 w-full items-center justify-between rounded-2xl bg-primary px-5 font-display font-bold text-primary-foreground shadow-floating transition-opacity hover:opacity-90 cursor-pointer"
            >
              <span className="flex items-center gap-2.5 text-sm font-extrabold uppercase tracking-wider">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-current/40">
                  <Plus className="h-4 w-4" />
                </span>
                Agregar
              </span>
              <span className="font-sans-modern text-sm font-extrabold">
                {formatearPrecio(producto.precio * cantidad)}
              </span>
            </motion.button>
          </div>
        </div>
      </main>

      {/* Drawer Flotante de Bolsa de Compras */}
      <CarritoRopaDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        items={items}
        onActualizarCantidad={actualizarCantidad}
        onEliminarItem={eliminarItem}
        onVaciarCarrito={vaciarCarrito}
      />
    </div>
  );
}
