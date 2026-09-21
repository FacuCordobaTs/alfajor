import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  AlertCircle,
  Package,
  Truck,
  Store,
} from 'lucide-react';
import {
  etiquetaMetodoPago,
  formatearPrecioRopa,
  ropaApi,
  type RopaEstado,
  type RopaPedido,
} from '../lib/ropa';

/** El local puede cambiar el estado desde el admin; refrescamos para que el comprador lo vea. */
const REFRESCO_MS = 30_000;

const ESTADO_LABEL: Record<RopaEstado, string> = {
  pendiente: 'Recibimos tu pedido',
  preparando: 'En preparación',
  enviado: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const ESTADO_DETALLE: Record<RopaEstado, string> = {
  pendiente: 'Estamos confirmando el pago y preparando todo.',
  preparando: 'Ya estamos armando tu pedido.',
  enviado: 'Tu pedido salió del local.',
  entregado: '¡Listo! Gracias por la compra.',
  cancelado: 'Este pedido fue cancelado. Escribinos si tenés dudas.',
};

const ETAPAS: RopaEstado[] = ['pendiente', 'preparando', 'enviado', 'entregado'];

export default function PedidoRopa() {
  const { id } = useParams<{ id: string }>();
  const pedidoId = Number(id);
  const idValido = Number.isInteger(pedidoId) && pedidoId > 0;

  const [pedido, setPedido] = useState<RopaPedido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pagando, setPagando] = useState(false);

  const cargar = useCallback(async () => {
    if (!idValido) {
      setError('Pedido no encontrado.');
      setCargando(false);
      return;
    }

    try {
      const respuesta = await ropaApi.pedido(pedidoId);
      setPedido(respuesta.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar el pedido.');
    } finally {
      setCargando(false);
    }
  }, [pedidoId, idValido]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!pedido || pedido.pagado || pedido.estado === 'cancelado') return;
    const intervalo = window.setInterval(() => void cargar(), REFRESCO_MS);
    return () => window.clearInterval(intervalo);
  }, [pedido, cargar]);

  const pagarConMercadoPago = async () => {
    if (pagando) return;
    setPagando(true);
    try {
      const preferencia = await ropaApi.crearPreferenciaMp(pedidoId);
      window.location.href = preferencia.url_pago;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos iniciar el pago.');
      setPagando(false);
    }
  };

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard bloqueado (http o permisos): el dato igual queda a la vista.
    }
  };

  if (cargando) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Cargando tu pedido…</p>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
        <AlertCircle className="h-7 w-7 text-muted-foreground" />
        <div>
          <h1 className="font-display text-2xl font-bold">No encontramos el pedido</h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {error ?? 'Puede que el link esté incompleto.'}
          </p>
        </div>
        <Link
          to="/ropa"
          className="rounded-xl bg-foreground px-6 py-3 text-sm font-bold text-background transition-opacity hover:opacity-85"
        >
          Volver a la tienda
        </Link>
      </div>
    );
  }

  const metodo = pedido.metodoPago ?? '';
  const esTransferencia = metodo.includes('transferencia') || metodo.includes('manual');
  const esMercadoPago = metodo.startsWith('mercadopago');
  const aliasDestino = pedido.aliasDinamico || pedido.transferenciaAliasDestino;
  const etapaActual = ETAPAS.indexOf(pedido.estado);

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground antialiased">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/ropa"
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a la tienda
          </Link>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Pedido #{pedido.id}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {ESTADO_LABEL[pedido.estado]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{ESTADO_DETALLE[pedido.estado]}</p>

          {pedido.estado !== 'cancelado' && (
            <div className="mt-6 flex items-center gap-2">
              {ETAPAS.map((etapa, index) => (
                <div
                  key={etapa}
                  className={`h-1.5 flex-1 rounded-full ${
                    index <= etapaActual ? 'bg-foreground' : 'bg-border'
                  }`}
                />
              ))}
            </div>
          )}
        </motion.section>

        {!pedido.pagado && pedido.estado !== 'cancelado' && (
          <section className="rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                {pedido.estadoPago === 'fallido' ? 'Pago rechazado' : 'Pago pendiente'}
              </span>
            </div>

            {esTransferencia && (
              <>
                <p className="mt-4 text-sm text-muted-foreground">
                  Transferí {formatearPrecioRopa(pedido.total)} a estos datos y avisanos por
                  WhatsApp con el número de pedido.
                </p>

                {aliasDestino ? (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          Alias
                        </p>
                        <p className="truncate text-sm font-bold">{aliasDestino}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void copiar(aliasDestino)}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold transition-colors hover:border-foreground"
                      >
                        {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiado ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>

                    {pedido.cvuDinamico && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                            CVU
                          </p>
                          <p className="truncate text-sm font-bold">{pedido.cvuDinamico}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void copiar(pedido.cvuDinamico!)}
                          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold transition-colors hover:border-foreground"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar
                        </button>
                      </div>
                    )}

                    <p className="text-[11px] text-muted-foreground">
                      El alias es único para este pedido. Cuando llegue la transferencia lo
                      marcamos como cobrado.
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Escribinos por WhatsApp y te pasamos los datos para transferir.
                  </p>
                )}
              </>
            )}

            {esMercadoPago && (
              <>
                <p className="mt-4 text-sm text-muted-foreground">
                  Falta completar el pago de {formatearPrecioRopa(pedido.total)}.
                </p>
                <button
                  type="button"
                  onClick={() => void pagarConMercadoPago()}
                  disabled={pagando}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-bold text-background transition-opacity hover:opacity-85 disabled:opacity-60"
                >
                  {pagando && <Loader2 className="h-4 w-4 animate-spin" />}
                  {pagando ? 'Abriendo Mercado Pago…' : 'Pagar ahora'}
                </button>
              </>
            )}
          </section>
        )}

        {pedido.pagado && (
          <section className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <p className="text-sm font-semibold">Pago acreditado</p>
          </section>
        )}

        <section className="rounded-2xl border border-border">
          <div className="space-y-4 p-5">
            {pedido.items.map((item, index) => (
              <div key={`${item.productoId}-${index}`} className="flex items-center gap-4">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                  {item.imagenUrl ? (
                    <img src={item.imagenUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Package className="h-5 w-5" />
                    </div>
                  )}
                  <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-950 px-1 text-[10px] font-bold text-white">
                    {item.cantidad}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.nombreProducto}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {item.colorHex && (
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-black/10"
                        style={{ backgroundColor: item.colorHex }}
                      />
                    )}
                    {[item.talle, item.colorNombre].filter(Boolean).join(' · ')}
                  </p>
                </div>

                <span className="text-sm font-semibold">
                  {formatearPrecioRopa(item.precioUnitario * item.cantidad)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-border p-5">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatearPrecioRopa(pedido.subtotal)}</span>
            </div>
            {pedido.costoEnvio > 0 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Envío</span>
                <span>{formatearPrecioRopa(pedido.costoEnvio)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-bold">Total</span>
              <span className="font-display text-xl font-bold">
                {formatearPrecioRopa(pedido.total)}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border p-5">
          <h2 className="text-sm font-bold">Entrega</h2>
          <div className="mt-3 flex items-start gap-3 text-sm text-muted-foreground">
            {pedido.tipoEntrega === 'envio' ? (
              <Truck className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <Store className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>
              <p className="font-semibold text-foreground">
                {pedido.tipoEntrega === 'envio' ? 'Envío a domicilio' : 'Retiro en el local'}
              </p>
              {pedido.tipoEntrega === 'envio' && (
                <p className="mt-0.5">
                  {[pedido.direccion, pedido.ciudad].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>

          <h2 className="mt-5 text-sm font-bold">Pago</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {etiquetaMetodoPago({ id: metodo, label: metodo, automatico: false })}
          </p>

          {pedido.notas && (
            <>
              <h2 className="mt-5 text-sm font-bold">Notas</h2>
              <p className="mt-2 text-sm text-muted-foreground">{pedido.notas}</p>
            </>
          )}
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Guardá este link para seguir tu pedido.
        </p>
      </main>
    </div>
  );
}
