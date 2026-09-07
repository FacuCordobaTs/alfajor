const API_URL = (import.meta.env.VITE_API_URL || 'https://api.piru.app/api').replace(/\/$/, '')
export const DURACION_SESION_TRACKING_MS = 30 * 60 * 1000

export type TipoEventoTracking = 'session_start' | 'product_view' | 'add_to_cart' | 'checkout_start' | 'purchase'
export interface ContextoTracking { username: string; campaniaSlug?: string; recetaToken?: string; actualizadoAt: number }
interface SesionLocal { sesionUuid: string; ultimaActividadAt: number }
interface EventoEnCola { restauranteId: number; evento: Record<string, unknown>; intentos: number; reintentarAt: number }

type EventoDataLayer = Record<string, unknown>
type ItemGtm = { item_id: string; item_name?: string; price?: number; quantity?: number }

const VISITOR_KEY = 'piru_marketing_visitor_v1'
const SESSION_PREFIX = 'piru_marketing_session_v1:'
const CONTEXT_PREFIX = 'piru_marketing_context_v1:'
const EVENTO_UNICO_PREFIX = 'piru_marketing_evento_unico_v1:'
const QUEUE_KEY = 'piru_marketing_queue_v1'
const MAX_COLA = 100
const MAX_INTENTOS = 5
let flushEnCurso = false
let contenedorGtmActivo: string | null = null

declare global {
  interface Window {
    dataLayer?: EventoDataLayer[]
  }
}

function storageSeguro(storage: Storage): Storage | null { try { const k = '__piru_tracking__'; storage.setItem(k, '1'); storage.removeItem(k); return storage } catch { return null } }
function local(): Storage | null { return typeof window === 'undefined' ? null : storageSeguro(window.localStorage) }
function sesion(): Storage | null { return typeof window === 'undefined' ? null : storageSeguro(window.sessionStorage) ?? local() }
function uuid() { return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}` }
function leer<T>(storage: Storage | null, key: string): T | null { try { const value = storage?.getItem(key); return value ? JSON.parse(value) as T : null } catch { return null } }
function guardar(storage: Storage | null, key: string, value: unknown) { try { storage?.setItem(key, JSON.stringify(value)) } catch { /* best-effort */ } }
function nombre(username: string) { return username.trim().toLocaleLowerCase('es').slice(0, 255) }
function numero(value: unknown): number | undefined { const n = Number(value); return Number.isFinite(n) ? n : undefined }

/** Carga el contenedor propio sólo cuando el perfil público lo configuró.
 * No hay Pixel global de Piru y volver a configurar el mismo ID es inocuo. */
export function configurarGtm(containerId: string | null | undefined) {
  const id = containerId?.trim().toUpperCase()
  if (typeof window === 'undefined' || !id || !/^GTM-[A-Z0-9]{4,32}$/.test(id) || contenedorGtmActivo === id) return
  contenedorGtmActivo = id
  window.dataLayer ??= []
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  const existente = document.querySelector(`script[data-piru-gtm="${id}"]`)
  if (existente) return
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`
  script.dataset.piruGtm = id
  document.head.appendChild(script)
}

function itemGtm(extras: Record<string, unknown>): ItemGtm[] | undefined {
  const productoId = extras.productoId
  if (productoId == null) return undefined
  const item: ItemGtm = { item_id: String(productoId) }
  const nombreProducto = extras.nombreProducto
  if (typeof nombreProducto === 'string' && nombreProducto) item.item_name = nombreProducto
  const precio = numero(extras.valor)
  if (precio != null) item.price = precio
  const cantidad = numero(extras.cantidad)
  if (cantidad != null) item.quantity = cantidad
  return [item]
}

function itemsGtm(extras: Record<string, unknown>): ItemGtm[] | undefined {
  if (!Array.isArray(extras.items)) return itemGtm(extras)
  const items = extras.items.flatMap((item): ItemGtm[] => {
    if (!item || typeof item !== 'object') return []
    const source = item as Record<string, unknown>
    const id = source.productoId ?? source.productId ?? source.id
    if (id == null) return []
    const resultado: ItemGtm = { item_id: String(id) }
    const nombreProducto = source.nombreProducto ?? source.nombre
    if (typeof nombreProducto === 'string' && nombreProducto) resultado.item_name = nombreProducto
    const precio = numero(source.precio ?? source.valor)
    if (precio != null) resultado.price = precio
    const cantidad = numero(source.cantidad)
    if (cantidad != null) resultado.quantity = cantidad
    return [resultado]
  })
  return items.length ? items : undefined
}

/** Espeja el evento de Growth en la semántica Ecommerce de GTM/GA4.
 * El mismo punto de deduplicación usado por tracking protege especialmente purchase. */
function publicarEnDataLayer(tipo: TipoEventoTracking, extras: Record<string, unknown>) {
  if (typeof window === 'undefined' || !contenedorGtmActivo) return
  const metadata = extras.metadata as Record<string, unknown> | undefined
  const valor = numero(extras.valor)
  const ecommerce: Record<string, unknown> = {}
  const items = itemsGtm(extras)
  if (items) ecommerce.items = items
  if (valor != null) ecommerce.value = valor
  ecommerce.currency = typeof extras.moneda === 'string' ? extras.moneda : 'ARS'

  const evento = tipo === 'product_view' ? 'view_item' : tipo === 'checkout_start' ? 'begin_checkout' : tipo
  if (tipo === 'purchase') {
    const pedidoId = extras.pedidoUnificadoId
    if (pedidoId == null) return
    ecommerce.transaction_id = String(pedidoId)
    ecommerce.items = items ?? [{ item_id: 'pedido', quantity: numero(metadata?.cantidadItems) ?? 1 }]
  }
  if (tipo === 'session_start') {
    window.dataLayer!.push({ event: 'session_start' })
    return
  }
  // GA4 recomienda limpiar el objeto ecommerce previo para evitar que un tag
  // herede ítems o valores de la interacción anterior.
  window.dataLayer!.push({ ecommerce: null })
  window.dataLayer!.push({ event: evento, ecommerce })
}

export function obtenerVisitorId(): string {
  const storage = local(); const actual = storage?.getItem(VISITOR_KEY)
  if (actual && actual.length <= 64) return actual
  const id = uuid(); try { storage?.setItem(VISITOR_KEY, id) } catch { /* navegación privada */ }; return id
}

/** Una sesión se mantiene por restaurante y vence tras 30 minutos inactiva. */
export function obtenerSesionTracking(username: string, ahora = Date.now()): SesionLocal {
  const storage = sesion(); const key = `${SESSION_PREFIX}${nombre(username)}`; const actual = leer<SesionLocal>(storage, key)
  const vigente = actual && typeof actual.sesionUuid === 'string' && typeof actual.ultimaActividadAt === 'number' && ahora - actual.ultimaActividadAt <= DURACION_SESION_TRACKING_MS
  const resultado = vigente ? actual : { sesionUuid: uuid(), ultimaActividadAt: ahora }
  resultado.ultimaActividadAt = ahora; guardar(storage, key, resultado); return resultado
}

export function guardarContextoTracking(contexto: Omit<ContextoTracking, 'actualizadoAt'>) {
  const username = nombre(contexto.username); if (!username) return
  guardar(sesion(), `${CONTEXT_PREFIX}${username}`, { ...contexto, username, actualizadoAt: Date.now() } satisfies ContextoTracking)
}

/** Contexto de Smart Link transitorio: vive sólo durante la sesión del navegador. */
export function obtenerContextoTracking(username: string): ContextoTracking | null {
  const contexto = leer<ContextoTracking>(sesion(), `${CONTEXT_PREFIX}${nombre(username)}`)
  return contexto && Date.now() - contexto.actualizadoAt <= DURACION_SESION_TRACKING_MS ? contexto : null
}

export function contextoParaResolverMarketing(username: string) {
  return { visitorId: obtenerVisitorId(), sesionUuid: obtenerSesionTracking(username).sesionUuid, eventoUuid: uuid() }
}

/** Contexto aditivo para crear pedidos. El token de receta viaja sólo al checkout,
 * donde el backend lo hashea para atribuir; nunca se envía como evento analítico. */
export function contextoParaPedidoMarketing(username: string) {
  const contexto = obtenerContextoTracking(username)
  return {
    visitorId: obtenerVisitorId(),
    sesionUuid: obtenerSesionTracking(username).sesionUuid,
    ...(contexto?.campaniaSlug ? { campaniaSlug: contexto.campaniaSlug } : {}),
    ...(contexto?.recetaToken ? { recetaToken: contexto.recetaToken } : {}),
  }
}

function cola() { const value = leer<EventoEnCola[]>(local(), QUEUE_KEY); return Array.isArray(value) ? value : [] }
function guardarCola(value: EventoEnCola[]) { guardar(local(), QUEUE_KEY, value.slice(-MAX_COLA)) }
function reintento(intentos: number) { return Math.min(60_000, 1_000 * 2 ** Math.max(0, intentos - 1)) }

function enviarEventoInmediato(restauranteId: number, evento: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const payload = JSON.stringify({ restauranteId, eventos: [evento] })
  const body = new Blob([payload], { type: 'text/plain;charset=UTF-8' })
  try {
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(`${API_URL}/public/marketing/events`, body)) return
  } catch { /* cae al fetch keepalive */ }
  void fetch(`${API_URL}/public/marketing/events`, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: payload, keepalive: true }).catch(() => {})
}

/** Persiste cada interacción inmediatamente en el backend. */
export function registrarEventoTracking(restauranteId: number, username: string, tipo: TipoEventoTracking, extras: Record<string, unknown> = {}) {
  if (!Number.isInteger(restauranteId) || restauranteId <= 0) return
  publicarEnDataLayer(tipo, extras)
  const contexto = obtenerContextoTracking(username)
  // El token de receta sólo vive en el contexto transitorio. Nunca se incluye
  // en eventos: el backend persiste exclusivamente su hash en marketing_enlace.
  const metadata = { ...(extras.metadata as Record<string, unknown> | undefined), ...(contexto?.campaniaSlug ? { campaniaSlug: contexto.campaniaSlug } : {}) }
  const evento = { eventoUuid: uuid(), sesionUuid: obtenerSesionTracking(username).sesionUuid, visitorId: obtenerVisitorId(), tipo, ocurridoAt: new Date().toISOString(), ...extras, ...(Object.keys(metadata).length ? { metadata } : {}) }
  enviarEventoInmediato(restauranteId, evento)
}

/** Evita duplicados semánticos por montaje doble, navegación o reintentos de UI.
 * La clave vive junto a la sesión actual; para `purchase` usar el ID del pedido. */
export function registrarEventoTrackingUnaVez(restauranteId: number, username: string, tipo: TipoEventoTracking, clave: string, extras: Record<string, unknown> = {}) {
  const sesionUuid = obtenerSesionTracking(username).sesionUuid
  const storage = sesion()
  const key = `${EVENTO_UNICO_PREFIX}${restauranteId}:${sesionUuid}:${tipo}:${clave}`
  if (storage?.getItem(key)) return false
  try { storage?.setItem(key, '1') } catch { /* el servidor mantiene idempotencia por eventoUuid */ }
  registrarEventoTracking(restauranteId, username, tipo, extras)
  return true
}

/** Reintentos acotados; los UUIDs hacen seguro repetir un lote luego de timeout. */
export async function enviarEventosPendientes(): Promise<void> {
  if (flushEnCurso || typeof window === 'undefined' || !navigator.onLine) return
  flushEnCurso = true
  try {
    const ahora = Date.now(); const original = cola(); const primero = original.find((x) => x.reintentarAt <= ahora)
    if (!primero) return
    const lote = original.filter((x) => x.restauranteId === primero.restauranteId && x.reintentarAt <= ahora).slice(0, 20)
    const ids = new Set(lote.map((x) => x.evento.eventoUuid as string))
    try {
      const response = await fetch(`${API_URL}/public/marketing/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restauranteId: primero.restauranteId, eventos: lote.map((x) => x.evento) }), keepalive: true })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      guardarCola(original.filter((x) => !ids.has(x.evento.eventoUuid as string)))
    } catch {
      guardarCola(original.map((x) => {
        if (!ids.has(x.evento.eventoUuid as string)) return x
        const intentos = x.intentos + 1
        return intentos >= MAX_INTENTOS ? null : { ...x, intentos, reintentarAt: ahora + reintento(intentos) }
      }).filter((x): x is EventoEnCola => x !== null))
    }
  } finally { flushEnCurso = false }
}
