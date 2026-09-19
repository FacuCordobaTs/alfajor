import { useState, useMemo, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { motion } from 'motion/react';
import {
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import '../styles/ropa-view-transitions.css';
import {
  PRODUCTOS_ROPA,
  type ProductoRopa,
} from '../data/ropaMockData';
import { useCarritoRopaStore } from '../store/carritoRopaStore';
import { CarritoRopaDrawer } from '../components/ropa/CarritoRopaDrawer';

type Tema = { primario: string; secundario: string };

const LOGO_ALFAJOR = '/alfajor.jpeg';
const IMAGEN_HERO = '/ropa9.jpeg';

function temaValido(tema: Tema | null): tema is Tema {
  return !!tema && /^#[0-9a-f]{6}$/i.test(tema.primario) && /^#[0-9a-f]{6}$/i.test(tema.secundario);
}

export default function TiendaRopa() {
  const navigate = useNavigate();
  const location = useLocation();

  const [productoEnTransicion, setProductoEnTransicion] = useState<string | null>(() => {
    const locationState = location.state as { productoRopaTransitionId?: unknown } | null;
    return typeof locationState?.productoRopaTransitionId === 'string'
      ? locationState.productoRopaTransitionId
      : null;
  });
  const regresandoDesdeDetalle = productoEnTransicion !== null;

  // Estados de interacción
  // Store global de carrito
  const {
    items: carrito,
    isDrawerOpen,
    setIsDrawerOpen,
    actualizarCantidad,
    eliminarItem,
    vaciarCarrito,
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

  const formatearPrecio = (valor: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(valor);
  };

  const abrirProducto = (productoId: string) => {
    document.documentElement.dataset.ropaTransition = 'detalle';

    // El snapshot inicial debe contener únicamente la prenda pulsada.
    flushSync(() => setProductoEnTransicion(productoId));

    void navigate(`/ropa/producto/${productoId}`, {
      state: { productoRopaTransitionId: productoId },
      viewTransition: true,
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

          <div className="absolute top-6 left-6 z-10 overflow-hidden rounded-2xl border border-white/20 shadow-floating backdrop-blur-md">
            <img
              src={LOGO_ALFAJOR}
              alt="Alfajor con Papas"
              className="h-14 w-14 sm:h-16 sm:w-16 object-cover"
            />
          </div>

          <div className="relative z-10 max-w-lg space-y-4">
            <h1 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight leading-[0.95] text-white">
              ALFAJOR <br />
              <span className="font-serif-editorial italic font-normal text-primary">
                con Papas.
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 max-w-sm leading-relaxed font-sans-modern">
              El merch oficial para llevar un poco de Alfajor con Papas a todos lados.
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

      {/* Navbar Flotante Inferior: ÚNICAMENTE Botón de Bolsa */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40">
        <motion.button
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 280 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsDrawerOpen(true)}
          className="px-6 py-3 rounded-full bg-zinc-950/90 dark:bg-zinc-900/90 backdrop-blur-2xl text-white shadow-floating-lg border border-white/15 flex items-center gap-3 cursor-pointer"
          title="Bolsa de compras"
        >
          <div className="relative flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
            {totalPrendasEnCarrito > 0 && (
              <span className="absolute -top-2 -right-2.5 w-4.5 h-4.5 rounded-full bg-orange-500 text-white text-[9px] font-extrabold flex items-center justify-center shadow-md">
                {totalPrendasEnCarrito}
              </span>
            )}
          </div>
          <span className="text-xs font-display font-bold tracking-wider uppercase">
            Bolsa {totalPrendasEnCarrito > 0 ? `(${totalPrendasEnCarrito})` : ''}
          </span>
        </motion.button>
      </div>

      {/* Drawer Flotante de Bolsa de Compras */}
      <CarritoRopaDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        items={carrito}
        onActualizarCantidad={actualizarCantidad}
        onEliminarItem={eliminarItem}
        onVaciarCarrito={vaciarCarrito}
      />
    </div>
  );
}
