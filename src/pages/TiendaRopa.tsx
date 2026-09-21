import { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { flushSync } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ShoppingCart,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import '../styles/ropa-view-transitions.css';
import {
  PRODUCTOS_ROPA,
  type ItemCarritoRopa,
  type ProductoRopa,
} from '../data/ropaMockData';
import { useCarritoRopaStore } from '../store/carritoRopaStore';
import { CarritoRopaDrawer } from '../components/ropa/CarritoRopaDrawer';

type Tema = { primario: string; secundario: string };

const LOGO_ALFAJOR = '/logo.webp';
const IMAGEN_HERO = '/ropa9.jpeg';
const TIENDA_ROPA_SCROLL_KEY = 'alfajor:tienda-ropa-scroll-y';

type TiendaRopaNavigationState = {
  productoRopaTransitionId?: unknown;
  tiendaRopaScrollY?: unknown;
  checkoutRopaAbierto?: unknown;
};

function temaValido(tema: Tema | null): tema is Tema {
  return !!tema && /^#[0-9a-f]{6}$/i.test(tema.primario) && /^#[0-9a-f]{6}$/i.test(tema.secundario);
}

const formatearPrecio = (valor: number) => new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
}).format(valor);

const inputCheckout = 'h-12 w-full rounded-xl border border-border bg-transparent px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground';

type CheckoutRopaProps = {
  items: ItemCarritoRopa[];
  onClose: () => void;
};

function CheckoutRopa({ items, onClose }: CheckoutRopaProps) {
  const [metodoPago, setMetodoPago] = useState<'mercado-pago' | 'transferencia'>('mercado-pago');
  const [confirmado, setConfirmado] = useState(false);
  const total = items.reduce(
    (acumulado, item) => acumulado + item.producto.precio * item.cantidad,
    0
  );

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', cerrarConEscape);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', cerrarConEscape);
    };
  }, [onClose]);

  if (confirmado) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-background px-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-confirmado"
      >
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background">
            <Check className="h-5 w-5" />
          </div>
          <h2 id="checkout-confirmado" className="font-display text-2xl font-bold">
            Pedido confirmado
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Maqueta: no se realizó ningún cobro.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-8 h-12 w-full rounded-xl bg-foreground text-sm font-bold text-background transition-opacity hover:opacity-85"
          >
            Volver a la tienda
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] overflow-y-auto bg-background text-foreground"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-titulo"
    >
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Checkout
          </span>
        </div>
      </header>

      <form
        className="mx-auto grid max-w-5xl gap-12 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-16"
        onSubmit={(event) => {
          event.preventDefault();
          setConfirmado(true);
        }}
      >
        <div className="max-w-xl">
          <h1 id="checkout-titulo" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Finalizar compra
          </h1>

          <div className="mt-10 space-y-8">
            <section>
              <h2 className="mb-4 text-sm font-bold">Contacto</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sr-only" htmlFor="checkout-nombre">Nombre</label>
                <input id="checkout-nombre" name="nombre" autoComplete="name" required placeholder="Nombre" className={inputCheckout} />
                <label className="sr-only" htmlFor="checkout-telefono">Teléfono</label>
                <input id="checkout-telefono" name="telefono" autoComplete="tel" required inputMode="tel" placeholder="Teléfono" className={inputCheckout} />
                <label className="sr-only" htmlFor="checkout-email">Email</label>
                <input id="checkout-email" name="email" autoComplete="email" required type="email" placeholder="Email" className={`${inputCheckout} sm:col-span-2`} />
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-sm font-bold">Envío</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sr-only" htmlFor="checkout-direccion">Dirección</label>
                <input id="checkout-direccion" name="direccion" autoComplete="street-address" required placeholder="Dirección" className={`${inputCheckout} sm:col-span-2`} />
                <label className="sr-only" htmlFor="checkout-ciudad">Ciudad</label>
                <input id="checkout-ciudad" name="ciudad" autoComplete="address-level2" required placeholder="Ciudad" className={inputCheckout} />
                <label className="sr-only" htmlFor="checkout-codigo-postal">Código postal</label>
                <input id="checkout-codigo-postal" name="codigo-postal" autoComplete="postal-code" required placeholder="Código postal" className={inputCheckout} />
              </div>
            </section>

            <fieldset>
              <legend className="mb-4 text-sm font-bold">Pago</legend>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['mercado-pago', 'Mercado Pago'],
                  ['transferencia', 'Transferencia'],
                ] as const).map(([valor, etiqueta]) => (
                  <button
                    key={valor}
                    type="button"
                    aria-pressed={metodoPago === valor}
                    onClick={() => setMetodoPago(valor)}
                    className={`h-12 rounded-xl border text-sm font-semibold transition-colors ${
                      metodoPago === valor
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border hover:border-foreground'
                    }`}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="border-y border-border py-6 lg:border lg:p-6">
            <div className="space-y-5">
              {items.map((item, index) => (
                <div
                  key={`${item.producto.id}-${item.talle}-${item.color.id}-${index}`}
                  className="flex items-center gap-4"
                >
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    <img
                      src={item.imagenSeleccionada}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-950 px-1 text-[10px] font-bold text-white">
                      {item.cantidad}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{item.producto.nombre}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.talle} · {item.color.nombre}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatearPrecio(item.producto.precio * item.cantidad)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
              <span className="text-sm font-bold">Total</span>
              <span className="font-display text-xl font-bold">{formatearPrecio(total)}</span>
            </div>
          </div>

          <button
            type="submit"
            className="mt-4 h-14 w-full rounded-xl bg-foreground text-sm font-bold text-background transition-opacity hover:opacity-85"
          >
            Confirmar · {formatearPrecio(total)}
          </button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Maqueta · no procesa pagos
          </p>
        </aside>
      </form>
    </motion.div>
  );
}

export default function TiendaRopa() {
  const navigate = useNavigate();
  const location = useLocation();

  const [productoEnTransicion, setProductoEnTransicion] = useState<string | null>(() => {
    const locationState = location.state as TiendaRopaNavigationState | null;
    return typeof locationState?.productoRopaTransitionId === 'string'
      ? locationState.productoRopaTransitionId
      : null;
  });
  const [checkoutAbierto, setCheckoutAbierto] = useState(() => {
    const locationState = location.state as TiendaRopaNavigationState | null;
    return locationState?.checkoutRopaAbierto === true;
  });
  const [scrollARestaurar] = useState<number | null>(() => {
    const locationState = location.state as TiendaRopaNavigationState | null;
    if (
      typeof locationState?.tiendaRopaScrollY === 'number'
      && Number.isFinite(locationState.tiendaRopaScrollY)
    ) {
      return Math.max(0, locationState.tiendaRopaScrollY);
    }

    try {
      const scrollGuardado = sessionStorage.getItem(TIENDA_ROPA_SCROLL_KEY);
      if (scrollGuardado === null) return null;

      const scrollY = Number(scrollGuardado);
      return Number.isFinite(scrollY) ? Math.max(0, scrollY) : null;
    } catch {
      return null;
    }
  });
  const regresandoDesdeDetalle = productoEnTransicion !== null;

  useLayoutEffect(() => {
    if (scrollARestaurar === null) return;

    window.scrollTo({ top: scrollARestaurar, behavior: 'auto' });
    try { sessionStorage.removeItem(TIENDA_ROPA_SCROLL_KEY); } catch { /* Storage opcional. */ }
  }, [scrollARestaurar]);

  // Estados de interacción
  // Store global de carrito
  const {
    items: carrito,
    isDrawerOpen,
    setIsDrawerOpen,
    actualizarCantidad,
    totalPrendas,
  } = useCarritoRopaStore();

  const [tema, setTema] = useState<Tema | null>(() => {
    try {
      const cached = JSON.parse(sessionStorage.getItem('theme_alfajor') || 'null');
      return temaValido(cached) ? cached : null;
    } catch { return null; }
  });

  // Resuelve el branding al entrar directamente a /ropa.
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
      } catch { /* Conserva el tema cacheado o el tema base */ }
    };
    void cargarTema();
    return () => controller.abort();
  }, []);

  // División para grilla asimétrica (columna 1 más arriba que columna 2)
  const columnaIzquierda = useMemo(
    () => PRODUCTOS_ROPA.filter((_, idx) => idx % 2 === 0),
    []
  );
  const columnaDerecha = useMemo(
    () => PRODUCTOS_ROPA.filter((_, idx) => idx % 2 !== 0),
    []
  );

  const totalPrendasEnCarrito = totalPrendas();

  const abrirProducto = async (productoId: string) => {
    const tiendaRopaScrollY = window.scrollY;
    try { sessionStorage.setItem(TIENDA_ROPA_SCROLL_KEY, String(tiendaRopaScrollY)); } catch { /* Storage opcional. */ }

    document.documentElement.dataset.ropaTransition = 'detalle';

    // El snapshot inicial debe contener únicamente la prenda pulsada.
    flushSync(() => setProductoEnTransicion(productoId));

    // El botón/gesto Atrás recupera esta entrada del historial, no el state
    // de la pantalla de detalle. Guardamos acá el destino de la foto
    // compartida para que el POP también pueda completar la View Transition.
    const estadoActual = (
      location.state !== null
      && typeof location.state === 'object'
      && !Array.isArray(location.state)
    ) ? location.state : {};

    await navigate(location.pathname, {
      replace: true,
      preventScrollReset: true,
      state: {
        ...estadoActual,
        productoRopaTransitionId: productoId,
        tiendaRopaScrollY,
      },
    });

    void navigate(`/ropa/producto/${productoId}`, {
      state: { productoRopaTransitionId: productoId, tiendaRopaScrollY },
      viewTransition: true,
      flushSync: true,
    });
  };

  const primario = tema?.primario;
  const secundario = tema?.secundario;
  const themeStyles = (primario && secundario) ? (
    <style dangerouslySetInnerHTML={{
      __html: `
        :root {
          --background: ${secundario};
          --foreground: ${primario};
          --card: ${secundario};
          --card-foreground: ${primario};
          --popover: ${secundario};
          --popover-foreground: ${primario};
          --primary: ${primario};
          --primary-foreground: ${secundario};
          --secondary: ${primario}18;
          --secondary-foreground: ${primario};
          --muted: ${primario}15;
          --muted-foreground: ${primario}99;
          --border: ${primario}30;
          --input: ${primario}30;
        }

        .dark {
          --background: ${primario};
          --foreground: ${secundario};
          --card: ${primario};
          --card-foreground: ${secundario};
          --popover: ${primario};
          --popover-foreground: ${secundario};
          --primary: ${secundario};
          --primary-foreground: ${primario};
          --secondary: ${secundario}18;
          --secondary-foreground: ${secundario};
          --muted: ${secundario}15;
          --muted-foreground: ${secundario}b3;
          --border: ${secundario}30;
          --input: ${secundario}30;
        }
      `
    }} />
  ) : null;

  // Render de tarjeta de producto flotante (sin fondo de caja, sin tags, sin estrellas, sin descripción)
  const renderProductCard = (prod: ProductoRopa, animIndex: number) => {
    return (
      <motion.div
        key={prod.id}
        initial={regresandoDesdeDetalle ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.35,
          delay: animIndex * 0.04,
          ease: 'easeOut',
        }}
        whileHover={{ y: -4 }}
        onClick={() => abrirProducto(prod.id)}
        className="group cursor-pointer flex flex-col transition-all bg-transparent"
      >
        {/* Imagen Flotante (sin bordes de tarjeta ni fondo de distinto color) */}
        <div
          style={productoEnTransicion === prod.id
            ? { viewTransitionName: 'ropa-producto-activo' }
            : undefined}
          className="relative aspect-[3/4] w-full rounded-[26px] sm:rounded-[32px] overflow-hidden bg-secondary/30 mb-2.5 shadow-floating-sm group-hover:shadow-floating transition-shadow duration-300"
        >
          <img
            src={prod.imagenes[0]}
            alt={prod.nombre}
            decoding="sync"
            loading="eager"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        </div>

        {/* Datos del Producto: Nombre y Precio (sin descripción) */}
        <div className="px-1 space-y-1">
          <h3 className="font-display font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {prod.nombre}
          </h3>

          <div className="flex items-baseline justify-between pt-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm sm:text-base font-sans-modern text-foreground">
                {formatearPrecio(prod.precio)}
              </span>
              {prod.precioAnterior && (
                <span className="text-[10px] sm:text-xs text-zinc-400 line-through">
                  {formatearPrecio(prod.precioAnterior)}
                </span>
              )}
            </div>

            {/* Micro Pill de Talles Disponibles */}
            <span className="text-[10px] font-bold text-zinc-400 bg-secondary px-1.5 py-0.5 rounded-md hidden sm:inline-block">
              {prod.talles.join(' ')}
            </span>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans-modern antialiased pb-28 selection:bg-primary selection:text-primary-foreground">
      {themeStyles}

      {/* Contenido Principal (Sin Header) */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 pt-5 sm:pt-7 space-y-7">
        {/* Banner Hero Editorial */}
        <section className="relative rounded-[32px] sm:rounded-[40px] overflow-hidden shadow-floating-lg bg-zinc-950 text-white min-h-[340px] sm:min-h-[400px] flex items-end p-7 sm:p-10">
          <img
            src={IMAGEN_HERO}
            alt="Merch oficial de Alfajor con Papas"
            className="absolute inset-0 w-full h-full object-cover object-top opacity-70 scale-105 transition-transform duration-1000 hover:scale-100"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

          <div className="relative z-10 max-w-lg space-y-4">
            <img
              src={LOGO_ALFAJOR}
              alt="Alfajor con Papas"
              className="w-full max-w-[320px] sm:max-w-[440px] h-auto object-contain object-left drop-shadow-lg"
            />

            <p className="text-xs sm:text-sm text-zinc-300 max-w-sm leading-relaxed font-sans-modern">
              El merch oficial para llevar un poco de Alfajor a todos lados.
              Prendas y accesorios hechos para quienes siempre vuelven por otra mordida.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  const el = document.getElementById('catalogo-ropa');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3.5 rounded-2xl bg-white text-zinc-950 font-bold text-xs sm:text-sm tracking-wide shadow-floating hover:bg-primary hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>Ver el merch</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </section>

        {/* Grilla Asimétrica de 2 Columnas (una columna más arriba que la otra) */}
        <div id="catalogo-ropa" className="grid grid-cols-2 gap-4 sm:gap-7 items-start pt-2">
          {/* Columna Izquierda: Inicia normalmente arriba */}
          <div className="flex flex-col gap-6 sm:gap-8">
            {columnaIzquierda.map((prod, index) =>
              renderProductCard(prod, index * 2)
            )}
          </div>

          {/* Columna Derecha: Desplazada más abajo creando el escalonado asimétrico */}
          <div className="flex flex-col gap-6 sm:gap-8 pt-10 sm:pt-16">
            {columnaDerecha.map((prod, index) =>
              renderProductCard(prod, index * 2 + 1)
            )}
          </div>
        </div>
      </main>

      {/* Navbar Flotante Inferior: ÚNICAMENTE Botón de Carrito */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40">
        <motion.button
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 280 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsDrawerOpen(true)}
          className="px-6 py-3 rounded-full bg-zinc-950/90 dark:bg-zinc-900/90 backdrop-blur-2xl text-white shadow-floating-lg border border-white/15 flex items-center gap-3 cursor-pointer"
          title="Carrito de compras"
        >
          <div className="relative flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-white" />
            {totalPrendasEnCarrito > 0 && (
              <span className="absolute -top-2 -right-2.5 w-4.5 h-4.5 rounded-full bg-orange-500 text-white text-[9px] font-extrabold flex items-center justify-center shadow-md">
                {totalPrendasEnCarrito}
              </span>
            )}
          </div>
          <span className="text-xs font-display font-bold tracking-wider uppercase">
            Carrito {totalPrendasEnCarrito > 0 ? `(${totalPrendasEnCarrito})` : ''}
          </span>
        </motion.button>
      </div>

      {/* Drawer Flotante del Carrito de Compras */}
      <CarritoRopaDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCheckout={() => {
          setIsDrawerOpen(false);
          setCheckoutAbierto(true);
        }}
        items={carrito}
        onActualizarCantidad={actualizarCantidad}
      />

      <AnimatePresence>
        {checkoutAbierto && carrito.length > 0 && (
          <CheckoutRopa
            items={carrito}
            onClose={() => setCheckoutAbierto(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
