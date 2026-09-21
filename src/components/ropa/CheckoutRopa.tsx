import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Loader2, Truck, Store, AlertCircle } from 'lucide-react';
import {
  etiquetaMetodoPago,
  formatearPrecioRopa,
  ropaApi,
  type ItemCarritoRopa,
  type RopaEnvio,
  type RopaMetodoPago,
} from '../../lib/ropa';

const inputCheckout = 'h-12 w-full rounded-xl border border-border bg-transparent px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground';

type CheckoutRopaProps = {
  items: ItemCarritoRopa[];
  envio: RopaEnvio;
  metodosPago: RopaMetodoPago[];
  onClose: () => void;
  /** El pedido ya existe en el backend: el padre decide a dónde llevar al comprador. */
  onPedidoCreado: (pedidoId: number) => void;
  /** Se llama después de crear el pedido, para no dejar el carrito lleno. */
  onVaciarCarrito: () => void;
};

export function CheckoutRopa({
  items,
  envio,
  metodosPago,
  onClose,
  onPedidoCreado,
  onVaciarCarrito,
}: CheckoutRopaProps) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<'retiro' | 'envio'>('retiro');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [notas, setNotas] = useState('');
  const [metodoPago, setMetodoPago] = useState<string>(metodosPago[0]?.id ?? '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si el local dejó de ofrecer envío mientras el comprador tenía el checkout abierto,
  // no se puede quedar seleccionado un modo que el backend va a rechazar.
  useEffect(() => {
    if (!envio.habilitado && tipoEntrega === 'envio') setTipoEntrega('retiro');
  }, [envio.habilitado, tipoEntrega]);

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !enviando) onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', cerrarConEscape);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', cerrarConEscape);
    };
  }, [onClose, enviando]);

  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.producto.precio * item.cantidad, 0),
    [items]
  );
  const costoEnvio = tipoEntrega === 'envio' && envio.habilitado ? envio.costo : 0;
  const total = subtotal + costoEnvio;

  const esMercadoPago = metodoPago.startsWith('mercadopago');

  const confirmar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (enviando) return;

    setError(null);

    if (nombre.trim().length < 2) {
      setError('Ingresá tu nombre.');
      return;
    }
    if (telefono.trim().length < 6) {
      setError('Ingresá un teléfono de contacto.');
      return;
    }
    if (tipoEntrega === 'envio' && direccion.trim().length < 5) {
      setError('Ingresá la dirección donde enviamos el pedido.');
      return;
    }
    if (!metodoPago) {
      setError('Elegí un medio de pago.');
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await ropaApi.crearPedido({
        nombreCliente: nombre.trim(),
        telefono: telefono.trim(),
        email: email.trim() || null,
        tipoEntrega,
        direccion: tipoEntrega === 'envio' ? direccion.trim() : null,
        ciudad: tipoEntrega === 'envio' ? ciudad.trim() || null : null,
        codigoPostal: tipoEntrega === 'envio' ? codigoPostal.trim() || null : null,
        notas: notas.trim() || null,
        metodoPago,
        items: items.map((item) => ({
          productoId: item.producto.id,
          talle: item.talle || null,
          colorNombre: item.color.nombre || null,
          cantidad: item.cantidad,
        })),
      });

      const pedidoId = respuesta.data.id;
      onVaciarCarrito();

      if (esMercadoPago) {
        // El pedido ya está creado: si el pago falla queda igual en el admin como impago,
        // y el comprador puede reintentar desde la pantalla de seguimiento.
        const preferencia = await ropaApi.crearPreferenciaMp(pedidoId);
        window.location.href = preferencia.url_pago;
        return;
      }

      onPedidoCreado(pedidoId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos completar el pedido.');
      setEnviando(false);
    }
  };

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
            disabled={enviando}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
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
        onSubmit={confirmar}
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
                <input
                  id="checkout-nombre"
                  name="nombre"
                  autoComplete="name"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre"
                  className={inputCheckout}
                />
                <label className="sr-only" htmlFor="checkout-telefono">Teléfono</label>
                <input
                  id="checkout-telefono"
                  name="telefono"
                  autoComplete="tel"
                  required
                  inputMode="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Teléfono"
                  className={inputCheckout}
                />
                <label className="sr-only" htmlFor="checkout-email">Email</label>
                <input
                  id="checkout-email"
                  name="email"
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (opcional)"
                  className={`${inputCheckout} sm:col-span-2`}
                />
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-sm font-bold">Entrega</h2>
              <div className={`grid gap-3 ${envio.habilitado ? 'sm:grid-cols-2' : ''}`}>
                <button
                  type="button"
                  aria-pressed={tipoEntrega === 'retiro'}
                  onClick={() => setTipoEntrega('retiro')}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition-colors ${
                    tipoEntrega === 'retiro'
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border hover:border-foreground'
                  }`}
                >
                  <Store className="h-4 w-4 shrink-0" />
                  <span>
                    Retiro en el local
                    <span className="block text-xs font-normal opacity-70">Sin costo</span>
                  </span>
                </button>

                {envio.habilitado && (
                  <button
                    type="button"
                    aria-pressed={tipoEntrega === 'envio'}
                    onClick={() => setTipoEntrega('envio')}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition-colors ${
                      tipoEntrega === 'envio'
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border hover:border-foreground'
                    }`}
                  >
                    <Truck className="h-4 w-4 shrink-0" />
                    <span>
                      Envío a domicilio
                      <span className="block text-xs font-normal opacity-70">
                        {envio.costo > 0 ? formatearPrecioRopa(envio.costo) : 'Sin costo'}
                      </span>
                    </span>
                  </button>
                )}
              </div>

              {tipoEntrega === 'envio' && envio.habilitado && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="sr-only" htmlFor="checkout-direccion">Dirección</label>
                  <input
                    id="checkout-direccion"
                    name="direccion"
                    autoComplete="street-address"
                    required
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Dirección"
                    className={`${inputCheckout} sm:col-span-2`}
                  />
                  <label className="sr-only" htmlFor="checkout-ciudad">Ciudad</label>
                  <input
                    id="checkout-ciudad"
                    name="ciudad"
                    autoComplete="address-level2"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    placeholder="Ciudad"
                    className={inputCheckout}
                  />
                  <label className="sr-only" htmlFor="checkout-codigo-postal">Código postal</label>
                  <input
                    id="checkout-codigo-postal"
                    name="codigo-postal"
                    autoComplete="postal-code"
                    value={codigoPostal}
                    onChange={(e) => setCodigoPostal(e.target.value)}
                    placeholder="Código postal"
                    className={inputCheckout}
                  />
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-4 text-sm font-bold">Pago</h2>
              <div className="grid gap-3">
                {metodosPago.map((metodo) => (
                  <button
                    key={metodo.id}
                    type="button"
                    aria-pressed={metodoPago === metodo.id}
                    onClick={() => setMetodoPago(metodo.id)}
                    className={`h-12 rounded-xl border px-4 text-sm font-semibold transition-colors ${
                      metodoPago === metodo.id
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border hover:border-foreground'
                    }`}
                  >
                    {etiquetaMetodoPago(metodo)}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <label htmlFor="checkout-notas" className="mb-2 block text-sm font-bold">
                Notas (opcional)
              </label>
              <textarea
                id="checkout-notas"
                name="notas"
                rows={3}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Algo que tengamos que saber sobre tu pedido"
                className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
              />
            </section>
          </div>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="border-y border-border py-6 lg:border lg:p-6">
            <div className="space-y-5">
              {items.map((item, index) => (
                <div
                  key={`${item.producto.id}-${item.talle}-${item.color.nombre}-${index}`}
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
                      {[item.talle, item.color.nombre].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatearPrecioRopa(item.producto.precio * item.cantidad)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-2 border-t border-border pt-5">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatearPrecioRopa(subtotal)}</span>
              </div>
              {costoEnvio > 0 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Envío</span>
                  <span>{formatearPrecioRopa(costoEnvio)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-bold">Total</span>
                <span className="font-display text-xl font-bold">{formatearPrecioRopa(total)}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={enviando || items.length === 0}
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-bold text-background transition-opacity hover:opacity-85 disabled:opacity-60"
          >
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
            {enviando
              ? 'Procesando…'
              : esMercadoPago
                ? `Pagar · ${formatearPrecioRopa(total)}`
                : `Confirmar · ${formatearPrecioRopa(total)}`}
          </button>

          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            {esMercadoPago
              ? 'Te llevamos a Mercado Pago para completar el pago.'
              : 'Te mostramos los datos para transferir al confirmar.'}
          </p>
        </aside>
      </form>
    </motion.div>
  );
}
