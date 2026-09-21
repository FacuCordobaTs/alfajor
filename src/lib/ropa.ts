/**
 * Tipos y llamadas a la API de la tienda de indumentaria.
 *
 * El catálogo, los pedidos y los precios salen de la DB: acá no hay constantes de negocio.
 * El backend recalcula el total en cada pedido, así que lo que se muestra acá es sólo
 * referencia para el comprador.
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://api.piru.app/api'

/** Local dueño de la tienda. El backend lo resuelve por username. */
const ROPA_USERNAME = 'alfajor'

export interface RopaColor {
  nombre: string
  hex: string
}

export interface RopaProducto {
  id: number
  nombre: string
  subtitulo: string | null
  descripcion: string | null
  composicion: string | null
  fit: string | null
  precio: number
  precioAnterior: number | null
  categoria: string | null
  imagenes: string[]
  talles: string[]
  colores: RopaColor[]
  stock: number | null
  activo: boolean
  orden: number
}

export interface ItemCarritoRopa {
  producto: RopaProducto
  talle: string
  color: RopaColor
  cantidad: number
  imagenSeleccionada: string
}

export interface RopaMetodoPago {
  id: string
  label: string
  automatico: boolean
}

export interface RopaEnvio {
  habilitado: boolean
  costo: number
}

export interface RopaCatalogo {
  productos: RopaProducto[]
  envio: RopaEnvio
  metodosPago: RopaMetodoPago[]
}

export type RopaEstado = 'pendiente' | 'preparando' | 'enviado' | 'entregado' | 'cancelado'

export interface RopaPedidoItem {
  productoId: number
  nombreProducto: string
  imagenUrl: string | null
  talle: string | null
  colorNombre: string | null
  colorHex: string | null
  cantidad: number
  precioUnitario: number
}

export interface RopaPedido {
  id: number
  estado: RopaEstado
  pagado: boolean
  estadoPago: 'pendiente' | 'pagado' | 'fallido'
  metodoPago: string | null
  tipoEntrega: 'retiro' | 'envio'
  nombreCliente: string
  direccion: string | null
  ciudad: string | null
  notas: string | null
  subtotal: number
  costoEnvio: number
  total: number
  aliasDinamico: string | null
  cvuDinamico: string | null
  transferenciaAliasDestino: string | null
  createdAt: string
  items: RopaPedidoItem[]
}

export interface RopaPedidoCreado {
  id: number
  subtotal: number
  costoEnvio: number
  total: number
  estado: RopaEstado
  pagado: boolean
  metodoPago: string
  tipoEntrega: 'retiro' | 'envio'
  transferenciaAliasDestino: string | null
  aliasDinamico: string | null
  cvuDinamico: string | null
}

export interface RopaPedidoInput {
  nombreCliente: string
  telefono: string
  email?: string | null
  tipoEntrega: 'retiro' | 'envio'
  direccion?: string | null
  ciudad?: string | null
  codigoPostal?: string | null
  notas?: string | null
  metodoPago: string
  items: Array<{
    productoId: number
    talle?: string | null
    colorNombre?: string | null
    cantidad: number
  }>
}

async function pedir<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  let data: any = null
  try {
    data = await response.json()
  } catch {
    // Respuesta sin JSON (por ejemplo un 502 de un proxy): se maneja abajo.
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'No pudimos completar la operación')
  }

  return data as T
}

/**
 * Etiquetas para el comprador. El backend manda etiquetas internas ("Mercado Pago Checkout
 * (redirección)") pensadas para el admin; acá se traducen a algo que se entienda en la tienda.
 */
export function etiquetaMetodoPago(metodo: RopaMetodoPago): string {
  switch (metodo.id) {
    case 'mercadopago_checkout':
    case 'mercadopago_bricks':
    case 'mercadopago':
      return 'Tarjeta o dinero en cuenta'
    case 'transferencia_automatica_cucuru':
    case 'transferencia_automatica_talo':
    case 'transferencia':
      return 'Transferencia bancaria'
    case 'manual_transfer':
      return 'Transferencia bancaria'
    case 'cash':
    case 'efectivo':
      return 'Efectivo al retirar'
    default:
      return metodo.label
  }
}

export const ropaApi = {
  catalogo: () =>
    pedir<{ success: boolean; data: RopaCatalogo }>(`/ropa/public/${ROPA_USERNAME}/productos`),

  producto: (id: number) =>
    pedir<{ success: boolean; data: RopaProducto }>(
      `/ropa/public/${ROPA_USERNAME}/productos/${id}`
    ),

  crearPedido: (input: RopaPedidoInput) =>
    pedir<{ success: boolean; data: RopaPedidoCreado }>(
      `/ropa/public/${ROPA_USERNAME}/pedidos`,
      { method: 'POST', body: JSON.stringify(input) }
    ),

  pedido: (id: number) =>
    pedir<{ success: boolean; data: RopaPedido }>(`/ropa/public/${ROPA_USERNAME}/pedidos/${id}`),

  crearPreferenciaMp: (id: number) =>
    pedir<{ success: boolean; url_pago: string; preference_id: string; total: string }>(
      `/ropa/public/${ROPA_USERNAME}/pedidos/${id}/preferencia-mp`,
      { method: 'POST' }
    ),
}

export const formatearPrecioRopa = (valor: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor)

/**
 * Pre-decodificado de las portadas del catálogo.
 *
 * La vuelta del detalle a la tienda usa una View Transition con las fotos ya decodificadas:
 * si se decodifican durante la transición, el navegador muestra el hueco gris. La tienda
 * registra las portadas cuando carga el catálogo (`registrarImagenesCatalogo`); si el
 * comprador entró directo al detalle no hay catálogo registrado y se usa el `respaldo`.
 */
let imagenesCatalogoRegistradas: string[] = []
let decodificacionEnCurso: Promise<void> | null = null

export function registrarImagenesCatalogo(urls: string[]): void {
  imagenesCatalogoRegistradas = urls.filter(Boolean)
  decodificacionEnCurso = null
}

export function prepararImagenesCatalogo(respaldo: string[] = []): Promise<void> {
  const urls =
    imagenesCatalogoRegistradas.length > 0 ? imagenesCatalogoRegistradas : respaldo.filter(Boolean)

  if (!decodificacionEnCurso) {
    decodificacionEnCurso = Promise.allSettled(
      urls.map((src) => {
        const imagen = new Image()
        imagen.src = src
        return imagen.decode()
      })
    ).then(() => undefined)
  }

  return decodificacionEnCurso
}
