import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { toast } from 'sonner'
import {
    Trash2, Maximize2, Minimize2, Loader2,
    Package, UtensilsCrossed, Utensils, Clock, Share2, User, Plus,
    BadgePercent, Users, Sparkles, Check, ArrowRight
} from 'lucide-react'
import { BotonPedido, BotonTicket, Cinta, EstadoLocal, FooterMarca, HeaderMarca, NavCategorias, AlfajorEnElToldo, Puntillado, Tachado, TituloSeccion, Toldo } from '@/components/marca/MarcaAlfajor'
import { sabores, textoEstado } from '@/lib/marcaAlfajor'
import { ProductDetailDrawer, etiquetaVarianteMedallon } from '@/components/ProductDetailDrawer'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { CheckoutDeliveryGrupal } from '@/components/CheckoutDeliveryGrupal'
import { guardarDireccionCliente, sincronizarDireccionesCliente, buscarDomicilioCliente, datosDomicilio, notasConDomicilio } from '@/lib/direccionesCliente'
import { codigoPromocionalMarketing, configurarGtm, configurarMetaPixel, contextoParaPedidoMarketing, guardarContextoTracking, registrarEventoPixel, registrarEventoPixelUnaVez, registrarEventoTrackingUnaVez } from '@/lib/tracking'
import { formatPrecio } from '@/lib/formatPrecio'

type PedidoHistorico = {
    id: number
    tipo: 'delivery' | 'takeaway'
    estado: string
    nombreCliente: string | null
    direccion: string | null
    notas?: string | null
    latitud: string | null
    longitud: string | null
    sucursalId: number | null
    metodoPago: string | null
    items: {
        productoId: number
        cantidad: number | null
        varianteId: number | null
        varianteSecundariaId: number | null
        ingredientesExcluidos: unknown
        agregados: unknown
        esCanjePuntos: boolean | null
    }[]
}

const firmaPedido = (pedido: PedidoHistorico) => pedido.items
    .map(item => JSON.stringify({
        productoId: item.productoId,
        cantidad: item.cantidad ?? 1,
        varianteId: item.varianteId ?? null,
        varianteSecundariaId: item.varianteSecundariaId ?? null,
        ingredientesExcluidos: Array.isArray(item.ingredientesExcluidos) ? [...item.ingredientesExcluidos].map(Number).sort((a, b) => a - b) : [],
        agregados: Array.isArray(item.agregados) ? item.agregados.map((a: any) => Number(a?.id)).filter(Number.isFinite).sort((a: number, b: number) => a - b) : [],
        esCanjePuntos: !!item.esCanjePuntos,
    }))
    .sort()
    .join('|')

const nombreMetodoPago = (metodo: string) => ({
    cash: 'efectivo',
    manual_transfer: 'transferencia',
    transferencia_automatica_cucuru: 'transferencia',
    transferencia_automatica_talo: 'transferencia',
    mercadopago_checkout: 'Mercado Pago',
    mercadopago_bricks: 'tarjeta',
}[metodo] || metodo.replace(/_/g, ' '))

type HorarioTurno = { diaSemana: number; horaApertura: string; horaCierre: string }

function formatTimeLeft(fechaFin: string | Date | null): string | null {
    if (!fechaFin) return null
    const now = Date.now()
    const end = new Date(fechaFin).getTime()
    const diff = end - now
    if (diff <= 0) return null
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return 'menos de 1h'
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
}

function checkIsOpen(horarios: HorarioTurno[]): { abierto: boolean; proximaApertura: string | null } {
    if (!horarios || horarios.length === 0) return { abierto: true, proximaApertura: null }
    const now = new Date()
    const diaHoy = now.getDay()
    const diaAyer = (diaHoy + 6) % 7
    const hhmm = now.getHours() * 60 + now.getMinutes()

    for (const h of horarios) {
        const apertura = parseInt(h.horaApertura.split(':')[0]) * 60 + parseInt(h.horaApertura.split(':')[1])
        const cierre = parseInt(h.horaCierre.split(':')[0]) * 60 + parseInt(h.horaCierre.split(':')[1])

        if (cierre > apertura) {
            if (h.diaSemana === diaHoy && hhmm >= apertura && hhmm < cierre) {
                return { abierto: true, proximaApertura: null }
            }
        } else {
            if (h.diaSemana === diaHoy && hhmm >= apertura) {
                return { abierto: true, proximaApertura: null }
            }
            if (h.diaSemana === diaAyer && hhmm < cierre) {
                return { abierto: true, proximaApertura: null }
            }
        }
    }

    const DIAS_NOMBRE = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    let mejor: { minutos: number; texto: string } | null = null

    for (const h of horarios) {
        const apertura = parseInt(h.horaApertura.split(':')[0]) * 60 + parseInt(h.horaApertura.split(':')[1])
        let diasHasta = (h.diaSemana - diaHoy + 7) % 7
        let minutosHasta = diasHasta * 1440 + (apertura - hhmm)
        if (minutosHasta <= 0) minutosHasta += 7 * 1440

        if (!mejor || minutosHasta < mejor.minutos) {
            const esHoy = diasHasta === 0 && apertura > hhmm
            mejor = {
                minutos: minutosHasta,
                texto: esHoy ? `hoy a las ${h.horaApertura}` : `${DIAS_NOMBRE[h.diaSemana]} ${h.horaApertura}`
            }
        }
    }

    return { abierto: false, proximaApertura: mejor?.texto || null }
}

/** Contexto público de un Smart Link. Una campaña normal no tiene producto ni
 * oferta, pero conserva el mismo touch para atribuir visitas y pedidos. */
export interface CampanaPublica {
    campanaId: number
    nombre: string
    slug: string
    tipo?: 'adquisicion' | 'recompra' | 'retencion' | 'lo_mismo' | 'reactivacion'
    destinoTipo?: 'tienda' | 'producto' | 'carrito'
    productoId: number | null
    carritoRep?: string | null
    descuentoPorcentaje: number
    limiteUsos: number | null
    usosActuales: number
    usosRestantes: number | null
    fechaInicio: string | null
    fechaFin: string | null
}

export type CampanaProductoPublica = CampanaPublica

type ItemCarritoPrearmado = {
    productoId: number
    cantidad: number
    varianteId?: number
    varianteSecundariaId?: number
    agregadoIds: number[]
}

/** Acepta los links históricos `12x2-15x1` y el formato v2 de campañas. */
function parseCarritoPrearmado(rep: string): ItemCarritoPrearmado[] {
    if (/^\d+x\d+(?:-\d+x\d+)*$/.test(rep)) {
        return rep.split('-').map((parte) => {
            const [productoId, cantidad] = parte.split('x').map(Number)
            return { productoId, cantidad, agregadoIds: [] }
        })
    }
    if (!rep.startsWith('v2:')) return []
    try {
        const bruto: unknown = JSON.parse(rep.slice(3))
        if (!Array.isArray(bruto)) return []
        return bruto.flatMap((item): ItemCarritoPrearmado[] => {
            if (!item || typeof item !== 'object') return []
            const raw = item as Record<string, unknown>
            if (!Number.isInteger(raw.p) || !Number.isInteger(raw.q) || (raw.q as number) < 1) return []
            if (raw.v !== undefined && !Number.isInteger(raw.v)) return []
            if (raw.s !== undefined && !Number.isInteger(raw.s)) return []
            if (raw.a !== undefined && (!Array.isArray(raw.a) || raw.a.some((id) => !Number.isInteger(id)))) return []
            return [{
                productoId: raw.p as number,
                cantidad: Math.min(99, raw.q as number),
                ...(raw.v === undefined ? {} : { varianteId: raw.v as number }),
                ...(raw.s === undefined ? {} : { varianteSecundariaId: raw.s as number }),
                agregadoIds: (raw.a ?? []) as number[],
            }]
        })
    } catch { return [] }
}

const extrasTrackingCampana = (campana: CampanaPublica | null, metadata: Record<string, unknown> = {}) => ({
    ...(campana ? { touch: { tipo: 'campana' as const, campanaId: campana.campanaId } } : {}),
    ...((campana || Object.keys(metadata).length) ? {
        metadata: { ...metadata, ...(campana ? { campaniaSlug: campana.slug } : {}) },
    } : {}),
})

/** El aviso de descuento de la parte alta de la carta: una línea, un título y la cifra que se
 * aplica de verdad. El del 20% o más es la oferta exclusiva de 48 horas; el resto, el de recompra. */
type AvisoDescuento = { titulo: string; detalle: string }

const avisoDescuento = (porcentaje: number, exclusivo = false): AvisoDescuento => exclusivo
    ? { titulo: 'Oferta exclusiva', detalle: `${porcentaje}% OFF por 48 horas, aplicado a tu pedido` }
    : { titulo: '¡Te extrañamos!', detalle: `${porcentaje}% OFF aplicado a tu pedido` }

// Los accesos secundarios del hero (pedido en grupo, puntos): texto subrayado en naranja, sin caja.
const ACCESO_HERO = 'font-alfajor inline-flex max-w-full items-center gap-2 py-1 text-[15px] text-[#f2eee2] underline decoration-[#eb623a] decoration-2 underline-offset-[6px] transition-colors hover:text-[#eb623a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb623a] rounded-sm'

// Riel horizontal sin barra de scroll (`scrollbar-hide` no existe en este Tailwind).
const RIEL_SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

// La grilla de la carta, la misma en "Todas" y en una categoría: una columna en el celular y una
// más cada vez que la pantalla se ensancha. Sin rieles ni scroll horizontal en ningún ancho.
// `auto-rows-fr`: todas las filas miden como la más alta, así las tarjetas de una sección son iguales.
const GRILLA_PRODUCTOS = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr gap-4 px-1'

const MenuDelivery = ({ campana = null }: { campana?: CampanaPublica | null }) => {
    const navigate = useNavigate()
    const username = 'alfajor'
    const [searchParams, setSearchParams] = useSearchParams()
    const productoAplicadoRef = useRef(false)
    const repAplicadoRef = useRef(false)
    const tkAplicadoRef = useRef<string | null>(null)
    const [bannerGrowth, setBannerGrowth] = useState<AvisoDescuento | null>(null)
    const [descuentoGrowthCodigo, setDescuentoGrowthCodigo] = useState<string | null>(null)

    const [carritoAbierto, setCarritoAbierto] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<any>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<string>('All')
    const [cartAnimation, setCartAnimation] = useState(false)
    const [scrollDir, setScrollDir] = useState<'up' | 'down' | null>(null)
    const scrollTimerRef = useRef<number | null>(null)
    // La sección "Canje de puntos": el acceso de puntos de arriba lleva hasta ahí.
    const canjeRef = useRef<HTMLElement | null>(null)
    // El arranque de la carta: "Elegí tu alfajor" del hero y el footer llevan hasta acá.
    const cartaRef = useRef<HTMLDivElement | null>(null)

    // El botón "Ver Pedido" reacciona a la dirección del scroll (efecto contra-scroll):
    // mientras scrollés hacia arriba baja un poco, mientras scrollés hacia abajo sube un
    // poco, y al dejar de scrollear (~150ms sin movimiento) vuelve a su posición.
    useEffect(() => {
        let lastY = window.scrollY
        const handleScroll = () => {
            const y = window.scrollY
            const delta = y - lastY
            lastY = y
            if (Math.abs(delta) < 2) return
            setScrollDir(delta > 0 ? 'down' : 'up')
            if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current)
            scrollTimerRef.current = window.setTimeout(() => setScrollDir(null), 150)
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => {
            window.removeEventListener('scroll', handleScroll)
            if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current)
        }
    }, [])

    const [restaurante, setRestaurante] = useState<any>(null)
    const [productos, setProductos] = useState<any[]>([])
    const [sucursales, setSucursales] = useState<{ id: number }[]>([])
    const [loading, setLoading] = useState(true)
    const [horarios, setHorarios] = useState<HorarioTurno[]>([])
    const [estadoAbierto, setEstadoAbierto] = useState<{ abierto: boolean; proximaApertura: string | null }>({ abierto: true, proximaApertura: null })

    const [modalSalaOpen, setModalSalaOpen] = useState(false)
    const [nombreSala, setNombreSala] = useState('')
    const [creandoSala, setCreandoSala] = useState(false)

    const [mostrarCheckoutEnCarrito, setMostrarCheckoutEnCarrito] = useState(false)
    const [expandido, setExpandido] = useState(false)
    const [checkoutDeliveryData, setCheckoutDeliveryData] = useState<any>(null)
    const [editSemaphoreLocal, setEditSemaphoreLocal] = useState<{ clienteId: string; clienteNombre: string } | null>(null)
    const [tituloCheckout, setTituloCheckout] = useState('¿Cómo lo querés?')
    const [submittingOrder, setSubmittingOrder] = useState(false)
    const checkoutDataRef = useRef<any>(null)
    const isSubmittingRef = useRef(false)
    const recomendacionIntentadaRef = useRef(false)
    const sessionStartRef = useRef<string | null>(null)
    const [esPedidoHabitual, setEsPedidoHabitual] = useState(false)

    const [cartItems, setCartItems] = useState<any[]>(() => {
        const saved = localStorage.getItem(`deliveryCart_${username}`)
        if (saved) {
            try { return JSON.parse(saved).items || [] } catch { return [] }
        }
        return []
    })

    useEffect(() => {
        if (restaurante) {
            localStorage.setItem(`deliveryCart_${username}`, JSON.stringify({
                items: cartItems,
                restauranteId: restaurante.id,
                deliveryFee: restaurante.deliveryFee
            }))
        }
    }, [cartItems, restaurante, username])

    const [telefonoCliente, setTelefonoCliente] = useState(localStorage.getItem('cliente_telefono') || '')
    const [puntosCliente, setPuntosCliente] = useState<number | null>(null)
    const [loadingPuntos, setLoadingPuntos] = useState(false)
    const [modalPuntosOpen, setModalPuntosOpen] = useState(false)

    useEffect(() => {
        const telefono = telefonoCliente.replace(/\D/g, '')
        if (!restaurante?.id || telefono.length < 8) return
        void sincronizarDireccionesCliente(restaurante.id, telefono).catch(() => {})
    }, [restaurante?.id, telefonoCliente])

    const fetchPuntos = useCallback(async (telefono: string, restauranteId: number) => {
        if (!telefono || !restauranteId) return
        setLoadingPuntos(true)
        try {
            const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
            const res = await fetch(`${url}/public/restaurante/${restauranteId}/cliente/${encodeURIComponent(telefono)}`)
            if (res.ok) {
                const data = await res.json()
                if (data.success) {
                    setPuntosCliente(data.data.puntos)
                } else {
                    setPuntosCliente(0)
                }
            } else {
                setPuntosCliente(0)
            }
        } catch (error) {
            console.error('Error fetching puntos:', error)
            setPuntosCliente(0)
        } finally {
            setLoadingPuntos(false)
        }
    }, [])

    useEffect(() => {
        const fetchRestaurante = async () => {
            try {
                const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
                const res = await fetch(`${url}/public/restaurante/${username}`)
                if (!res.ok) {
                    throw new Error('Restaurante no encontrado')
                }
                const data = await res.json()
                if (data.success) {
                    setRestaurante(data.data.restaurante)
                    setProductos(data.data.productos)
                    configurarGtm(data.data.restaurante?.gtmContainerId)
                    configurarMetaPixel(data.data.restaurante?.metaPixelId)
                    const sessionKey = `${data.data.restaurante?.id}:${username}`
                    if (data.data.restaurante?.id && sessionStartRef.current !== sessionKey) {
                        sessionStartRef.current = sessionKey
                        registrarEventoTrackingUnaVez(data.data.restaurante.id, username, 'session_start', 'storefront')
                    }
                    setSucursales(Array.isArray(data.data.sucursales) ? data.data.sucursales : [])
                    if (data.data.horarios) {
                        setHorarios(data.data.horarios)
                        setEstadoAbierto(checkIsOpen(data.data.horarios))
                        // setEstadoAbierto({ abierto: true, proximaApertura: null })
                    }
                    if (data.data.restaurante.colorPrimario && data.data.restaurante.colorSecundario) {
                        sessionStorage.setItem(`theme_${username}`, JSON.stringify({
                            primario: data.data.restaurante.colorPrimario,
                            secundario: data.data.restaurante.colorSecundario
                        }))
                    }
                    if (data.data.restaurante.sistemaPuntos && telefonoCliente) {
                        fetchPuntos(telefonoCliente, data.data.restaurante.id)
                    }
                } else {
                    toast.error(data.message)
                }
            } catch (error) {
                toast.error('Error al cargar restaurante')
            } finally {
                setLoading(false)
            }
        }
        if (username) {
            fetchRestaurante()
        }
    }, [username])

    // El link de recompra histórico usa `12x2-15x1`; una campaña de carrito
    // usa `v2:` y conserva variantes (incluso dobles) y extras. En ambos casos
    // se vuelve a resolver todo contra el menú actual: ningún precio, nombre u
    // opción desactualizada viaja confiada en el link.
    useEffect(() => {
        if (repAplicadoRef.current || productos.length === 0) return
        const rep = searchParams.get('rep') || campana?.carritoRep
        if (!rep) return
        repAplicadoRef.current = true

        const pares = parseCarritoPrearmado(rep)

        const nuevos: any[] = []
        for (const par of pares) {
            const producto = productos.find(p => p.id === par.productoId)
            if (!producto) continue
            if (producto.disponible === false) continue
            if (producto.puntosNecesarios > 0) continue // el canje por puntos no se precarga
            const variante = par.varianteId == null ? undefined : producto.variantes?.find((item: any) => item.id === par.varianteId)
            const varianteSecundaria = par.varianteSecundariaId == null ? undefined : producto.variantesSecundarias?.find((item: any) => item.id === par.varianteSecundariaId)
            // Una campaña v2 siempre guarda las variantes requeridas. Si el menú
            // cambió, omitimos sólo ese item antes que crear una orden inválida.
            if (rep.startsWith('v2:') && ((producto.variantes?.length && !variante) || (producto.variantesSecundarias?.length && !varianteSecundaria))) continue
            const agregados = (producto.agregados ?? []).filter((item: any) => par.agregadoIds.includes(item.id))
            const basePrecio = variante ? parseFloat(variante.precio) : parseFloat(producto.precio)
            const baseConSecundaria = basePrecio + (varianteSecundaria ? parseFloat(varianteSecundaria.precio) : 0)
            const precioConDescuento = producto.descuento && producto.descuento > 0
                ? baseConSecundaria * (1 - producto.descuento / 100)
                : baseConSecundaria
            const precioFinal = precioConDescuento + agregados.reduce((total: number, agregado: any) => total + parseFloat(agregado.precio || 0), 0)
            const variantesNombre = [variante?.nombre, varianteSecundaria?.nombre].filter(Boolean).join(' · ')
            nuevos.push({
                id: Math.random().toString(36).substr(2, 9),
                productoId: producto.id,
                categoria: producto.categoria,
                nombre: variantesNombre ? `${producto.nombre} - ${variantesNombre}` : producto.nombre,
                precio: precioFinal.toFixed(2),
                precioOriginal: variante ? variante.precio : producto.precio,
                descuento: producto.descuento || 0,
                imagenUrl: producto.imagenUrl,
                cantidad: par.cantidad,
                varianteId: variante?.id,
                varianteNombre: variante?.nombre,
                varianteSecundariaId: varianteSecundaria?.id,
                varianteSecundariaNombre: varianteSecundaria?.nombre,
                ingredientesExcluidos: [],
                ingredientesExcluidosNombres: [],
                agregados,
                esCanjePuntos: false,
                puntosNecesarios: 0,
                puntosGanados: producto.puntosGanados
            })
        }

        // Limpiamos el query param para que no se reaplique al navegar / recargar.
        if (searchParams.has('rep')) {
            const nuevosParams = new URLSearchParams(searchParams)
            nuevosParams.delete('rep')
            setSearchParams(nuevosParams, { replace: true })
        }

        if (nuevos.length > 0) {
            setCartItems(nuevos)
            toast.success('Te dejamos el carrito listo 🛒')
            setTimeout(() => abrirCarrito(), 500)
        }
    }, [productos, restaurante?.id, searchParams, setSearchParams, campana])

    useEffect(() => {
        if (productoAplicadoRef.current || productos.length === 0) return
        const productoId = Number(searchParams.get('producto'))
        if (!Number.isInteger(productoId) || productoId <= 0) return
        productoAplicadoRef.current = true
        const producto = productos.find((item) => item.id === productoId && item.disponible !== false && !item.soloCanjePuntos)
        const params = new URLSearchParams(searchParams); params.delete('producto'); setSearchParams(params, { replace: true })
        if (producto) { setSelectedProduct(producto); setDrawerOpen(true) }
    }, [productos, searchParams, setSearchParams])

    // Resuelve micro-campañas persistentes seguras cifradas con AES-256-GCM (?tk=v1... o ?c=v1...)
    useEffect(() => {
        const tk = searchParams.get('tk') || searchParams.get('c')
        if (!tk || tkAplicadoRef.current === tk) return
        if (loading || !restaurante || productos.length === 0) return

        tkAplicadoRef.current = tk

        const resolverToken = async () => {
            try {
                const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
                const res = await fetch(`${url}/public/growth/resolver-enlace`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: tk, restauranteSlug: username }),
                })

                if (res.status === 410) {
                    toast.info('Este beneficio exclusivo ha expirado, pero podés disfrutar de toda nuestra carta.')
                    return
                }

                if (!res.ok) {
                    const errorData = await res.json().catch(() => null)
                    console.error('Error resolviendo growth token:', res.status, errorData)
                    toast.error(errorData?.message || 'El enlace no es válido o ha expirado.')
                    return
                }

                const response = await res.json()
                if (!response.success || !response.data) return
                const data = response.data

                // Sincronizar datos de cliente en localStorage
                if (data.cliente?.nombre) localStorage.setItem('cliente_nombre', data.cliente.nombre)
                if (data.cliente?.telefono) {
                    localStorage.setItem('cliente_telefono', data.cliente.telefono)
                    setTelefonoCliente(data.cliente.telefono)
                }
                if (data.cliente?.direccionHabitual?.direccion) {
                    localStorage.setItem('cliente_direccion', data.cliente.direccionHabitual.direccion)
                    if (data.cliente.direccionHabitual.lat != null) localStorage.setItem('cliente_lat', String(data.cliente.direccionHabitual.lat))
                    if (data.cliente.direccionHabitual.lng != null) localStorage.setItem('cliente_lng', String(data.cliente.direccionHabitual.lng))
                }

                // Registrar contexto atribuible en la sesión para el checkout
                guardarContextoTracking({
                    username,
                    campaniaSlug: data.campanaSlug,
                    campanaId: data.campanaId ?? undefined,
                    recetaToken: tk,
                    codigoPromocional: data.descuento?.codigoCupon ?? undefined,
                })

                // Configurar beneficio de descuento si está presente
                if (data.descuento?.activo && data.descuento?.porcentaje > 0) {
                    const pct = data.descuento.porcentaje
                    const exp = data.descuento.expiraAt ? new Date(data.descuento.expiraAt).toISOString() : null
                    setBannerGrowth(avisoDescuento(pct, pct >= 20))
                    if (data.descuento.codigoCupon) {
                        setDescuentoGrowthCodigo(data.descuento.codigoCupon)
                    }

                    // Reflejar el porcentaje de descuento en todos los productos de la carta
                    setProductos(prev => prev.map((prod: any) => {
                        const descActual = Number(prod.descuento || 0)
                        return {
                            ...prod,
                            descuento: Math.max(descActual, pct),
                            descuentoFechaFin: pct >= descActual ? (exp || prod.descuentoFechaFin) : prod.descuentoFechaFin,
                        }
                    }))

                    // Actualizar selectedProduct si el drawer de producto está abierto
                    setSelectedProduct((prev: any) => {
                        if (!prev) return null
                        const descActual = Number(prev.descuento || 0)
                        return {
                            ...prev,
                            descuento: Math.max(descActual, pct),
                            descuentoFechaFin: pct >= descActual ? (exp || prev.descuentoFechaFin) : prev.descuentoFechaFin,
                        }
                    })
                }

                // Caso 1: Campaña "¿Lo Mismo de Siempre?" (Drawer 1-Click Buy)
                if (data.modalidad === 'drawer_habitual') {
                    const items = Array.isArray(data.carrito) ? data.carrito : []
                    if (items.length > 0) {
                        const dir = data.cliente?.direccionHabitual
                        const tipoPedido = (dir?.tipoPedido === 'delivery' || dir?.tipoPedido === 'takeaway')
                            ? dir.tipoPedido
                            : (restaurante.deliveryEnabled !== false ? 'delivery' : 'takeaway')

                        const fee = dir?.deliveryFee != null ? Number(dir.deliveryFee) : (tipoPedido === 'delivery' ? Number(restaurante.deliveryFee || 0) : 0)
                        const itemsTotalNum = items.reduce((sum: number, it: any) => sum + (parseFloat(it.precio) * it.cantidad), 0)

                        const metodosDisponibles = new Set((restaurante.metodosPago || []).map((m: any) => m.id))
                        const metodoPago = dir?.metodoPago && metodosDisponibles.has(dir.metodoPago)
                            ? dir.metodoPago
                            : (restaurante.metodosPago?.[0]?.id || 'efectivo')

                        const checkout = {
                            tipoPedido,
                            nombre: data.cliente?.nombre || '',
                            telefono: data.cliente?.telefono || '',
                            direccion: tipoPedido === 'delivery' ? (dir?.direccion || '') : '',
                            lat: dir?.lat ?? null,
                            lng: dir?.lng ?? null,
                            notas: '',
                            ...buscarDomicilioCliente(restaurante.id, data.cliente?.telefono || '', dir?.direccion || ''),
                            deliveryFee: fee,
                            zonaNombre: null,
                            itemsTotal: itemsTotalNum.toFixed(2),
                            total: (itemsTotalNum + fee).toFixed(2),
                            codigoDescuentoId: data.descuento?.codigoDescuentoId ?? null,
                            montoDescuento: 0,
                            metodoPago,
                            horarioProgramado: '',
                            sucursalId: dir?.sucursalId ?? null,
                        }

                        setCartItems(items)
                        checkoutDataRef.current = checkout
                        setCheckoutDeliveryData(checkout)
                        setEditSemaphoreLocal(null)
                        setMostrarCheckoutEnCarrito(true)
                        setExpandido(false)
                        setEsPedidoHabitual(true)
                        window.history.pushState({ drawer: 'carrito' }, '')
                        setCarritoAbierto(true)
                    }
                } else if (data.modalidad === 'descuento_banner') {
                    // Caso 2: Campaña "Reactivación con Descuento"
                    const items = Array.isArray(data.carrito) ? data.carrito : []
                    const pct = data.descuento?.porcentaje ?? 0
                    if (items.length > 0 && cartItems.length === 0) {
                        const itemsConDescuento = items.map((it: any) => {
                            const descActual = Number(it.descuento || 0)
                            const nuevoDesc = Math.max(descActual, pct)
                            const precioOrig = parseFloat(it.precioOriginal || it.precio || 0)
                            return {
                                ...it,
                                descuento: nuevoDesc,
                                precioOriginal: (it.precioOriginal || it.precio).toString(),
                                precio: nuevoDesc > 0 ? (precioOrig * (1 - nuevoDesc / 100)).toFixed(2) : it.precio,
                            }
                        })
                        setCartItems(itemsConDescuento)
                        // El toast promete lo que el resolver pudo verificar: si el cupón del toque ya
                        // se usó o venció, el carrito se arma igual pero sin descuento que anunciar.
                        if (data.descuento?.activo && pct > 0) {
                            toast.success('Te dejamos tu pedido listo con descuento 🛒')
                        } else {
                            toast.success('Te dejamos tu pedido listo 🛒')
                        }
                    } else if (data.descuento?.activo) {
                        toast.success(`Beneficio aplicado: ${data.descuento.porcentaje}% OFF 🎉`)
                    }
                }
            } catch (err) {
                console.error('Error resolviendo token de micro-campaña:', err)
            }
        }

        void resolverToken()
    }, [searchParams, loading, restaurante, productos.length])

    // Soporte para micro-campañas independientes sin token individual (?c=reactivacion)
    useEffect(() => {
        if (!campana || searchParams.has('tk') || searchParams.has('c') || tkAplicadoRef.current) return

        if (campana.tipo === 'reactivacion' || campana.slug === 'reactivacion') {
            const pct = campana.descuentoPorcentaje > 0 ? campana.descuentoPorcentaje : 10
            setBannerGrowth(avisoDescuento(pct))
            setProductos(prev => prev.map((prod: any) => {
                const descActual = Number(prod.descuento || 0)
                return {
                    ...prod,
                    descuento: Math.max(descActual, pct),
                    descuentoFechaFin: prod.descuentoFechaFin || null,
                }
            }))
        }
    }, [campana, searchParams])

    useEffect(() => {
        if (loading || !restaurante?.id || productos.length === 0 || recomendacionIntentadaRef.current) return
        const esCampanaLoMismo = campana?.tipo === 'lo_mismo' || campana?.slug === 'lo-mismo'
        // Un Smart Link tiene prioridad sobre la recomendación histórica, excepto si es la campaña "Lo Mismo de Siempre".
        if ((campana && !esCampanaLoMismo) || repAplicadoRef.current || productoAplicadoRef.current || searchParams.has('rep') || searchParams.has('producto') || searchParams.has('tk') || searchParams.has('c') || tkAplicadoRef.current) return
        if (!estadoAbierto.abierto || restaurante.soloPedidosProgramados) return
        recomendacionIntentadaRef.current = true

        const telefono = localStorage.getItem('cliente_telefono')?.trim()
        // En producción nunca pisamos un carrito iniciado. En desarrollo se permite
        // reemplazarlo para probar el flujo con el cliente guardado en el navegador.
        if (!telefono || (!import.meta.env.DEV && cartItems.length > 0)) return

        const cargarPedidoHabitual = async () => {
            try {
                const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
                const res = await fetch(`${url}/public/restaurante/${restaurante.id}/mis-pedidos/${encodeURIComponent(telefono)}`)
                if (!res.ok) return
                const response = await res.json()
                const pedidos: PedidoHistorico[] = Array.isArray(response.data)
                    ? response.data.filter((p: PedidoHistorico) => p.estado !== 'cancelled' && p.items?.length > 0)
                    : []
                if (pedidos.length === 0 || (!esCampanaLoMismo && !import.meta.env.DEV && pedidos.length < 2)) return

                const grupos = new Map<string, PedidoHistorico[]>()
                pedidos.forEach(pedido => {
                    const firma = firmaPedido(pedido)
                    if (!firma) return
                    grupos.set(firma, [...(grupos.get(firma) || []), pedido])
                })
                const grupoHabitual = [...grupos.values()].sort((a, b) => b.length - a.length)[0]
                // En producción sólo recomendamos un patrón repetido. En DEV el pedido
                // más reciente alcanza para poder probar visualmente todo el flujo.
                if (!grupoHabitual || (!esCampanaLoMismo && !import.meta.env.DEV && grupoHabitual.length < 2)) return

                const pedido = grupoHabitual[0]
                const metodosDisponibles = new Set((restaurante.metodosPago || []).map((m: any) => m.id))
                if (!pedido.nombreCliente?.trim() || !pedido.metodoPago || !metodosDisponibles.has(pedido.metodoPago)) return
                if (pedido.tipo === 'delivery' && restaurante.deliveryEnabled === false) return
                if (pedido.tipo === 'takeaway' && restaurante.takeawayEnabled === false) return

                let deliveryFee = 0
                let zonaNombre: string | null = null
                let sucursalId = pedido.sucursalId ?? null
                const lat = pedido.latitud == null ? null : Number(pedido.latitud)
                const lng = pedido.longitud == null ? null : Number(pedido.longitud)
                if (pedido.tipo === 'delivery') {
                    if (!pedido.direccion?.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) return
                    const zonaRes = await fetch(`${url}/public/restaurante/${restaurante.id}/check-zona?lat=${lat}&lng=${lng}`)
                    const zona = await zonaRes.json()
                    if (!zonaRes.ok || !zona.success || zona.code === 'FUERA_DE_ZONA') return
                    deliveryFee = Number(zona.deliveryFee || 0)
                    zonaNombre = zona.zonaNombre || null
                    sucursalId = zona.sucursalId ?? null
                } else if (sucursales.length > 0) {
                    const sucursal = sucursales.find(s => s.id === pedido.sucursalId) || (sucursales.length === 1 ? sucursales[0] : null)
                    if (!sucursal) return
                    sucursalId = sucursal.id
                }

                const itemsReconstruidos = pedido.items.map((item, index) => {
                    const producto = productos.find((p: any) => p.id === item.productoId)
                    if (!producto || item.esCanjePuntos) return null
                    const variante = item.varianteId ? producto.variantes?.find((v: any) => v.id === item.varianteId) : null
                    const varianteSecundaria = item.varianteSecundariaId ? producto.variantesSecundarias?.find((v: any) => v.id === item.varianteSecundariaId) : null
                    if ((producto.variantes?.length && !variante) || (producto.variantesSecundarias?.length && !varianteSecundaria)) return null

                    const idsAgregados = Array.isArray(item.agregados) ? item.agregados.map((a: any) => Number(a?.id)) : []
                    const agregados = idsAgregados.map(id => producto.agregados?.find((a: any) => a.id === id)).filter(Boolean)
                    if (agregados.length !== idsAgregados.length) return null
                    const excluidos = Array.isArray(item.ingredientesExcluidos) ? item.ingredientesExcluidos.map(Number) : []
                    const ingredientesExcluidosNombres = excluidos.map(id => producto.ingredientes?.find((i: any) => i.id === id)?.nombre).filter(Boolean)
                    if (ingredientesExcluidosNombres.length !== excluidos.length) return null

                    let precio = variante ? Number(variante.precio) : Number(producto.precio)
                    precio += varianteSecundaria ? Number(varianteSecundaria.precio) : 0
                    if (producto.descuento > 0) precio *= (1 - producto.descuento / 100)
                    precio += agregados.reduce((sum: number, a: any) => sum + Number(a.precio || 0), 0)
                    const variantesNombre = [variante?.nombre, varianteSecundaria?.nombre].filter(Boolean).join(' · ')
                    return {
                        id: `habitual-${pedido.id}-${index}`,
                        productoId: producto.id,
                        productoNombre: producto.nombre,
                        tieneSelectorMedallon: producto.agregados?.some((agregado: any) => etiquetaVarianteMedallon(agregado.nombre) !== null) ?? false,
                        nombre: variantesNombre ? `${producto.nombre} - ${variantesNombre}` : producto.nombre,
                        precio: precio.toFixed(2),
                        precioOriginal: variante?.precio || producto.precio,
                        descuento: producto.descuento || 0,
                        imagenUrl: producto.imagenUrl,
                        cantidad: item.cantidad ?? 1,
                        varianteId: variante?.id,
                        varianteNombre: variante?.nombre,
                        varianteSecundariaId: varianteSecundaria?.id,
                        varianteSecundariaNombre: varianteSecundaria?.nombre,
                        ingredientesExcluidos: excluidos,
                        ingredientesExcluidosNombres,
                        agregados,
                        esCanjePuntos: false,
                        puntosNecesarios: 0,
                        puntosGanados: producto.puntosGanados,
                    }
                })
                if (itemsReconstruidos.some(Boolean) && itemsReconstruidos.some(item => item === null)) return
                const items = itemsReconstruidos.filter(Boolean) as any[]
                if (items.length === 0) return

                const itemsTotal = items.reduce((sum, item) => sum + Number(item.precio) * item.cantidad, 0)
                const checkout = {
                    tipoPedido: pedido.tipo,
                    nombre: pedido.nombreCliente.trim(),
                    telefono,
                    direccion: pedido.tipo === 'delivery' ? pedido.direccion!.trim() : '',
                    lat: pedido.tipo === 'delivery' ? lat : null,
                    lng: pedido.tipo === 'delivery' ? lng : null,
                    notas: '',
                    ...(buscarDomicilioCliente(restaurante.id, telefono, pedido.direccion || '').tipoDomicilio
                        ? buscarDomicilioCliente(restaurante.id, telefono, pedido.direccion || '')
                        : datosDomicilio({ notas: pedido.notas || '' })),
                    deliveryFee,
                    zonaNombre,
                    itemsTotal: itemsTotal.toFixed(2),
                    total: (itemsTotal + deliveryFee).toFixed(2),
                    codigoDescuentoId: null,
                    montoDescuento: 0,
                    metodoPago: pedido.metodoPago,
                    horarioProgramado: '',
                    sucursalId,
                }
                setCartItems(items)
                checkoutDataRef.current = checkout
                setCheckoutDeliveryData(checkout)
                setEditSemaphoreLocal(null)
                setMostrarCheckoutEnCarrito(true)
                setExpandido(false)
                setEsPedidoHabitual(true)
                window.history.pushState({ drawer: 'carrito' }, '')
                setCarritoAbierto(true)
            } catch (error) {
                console.error('Error preparando el pedido habitual:', error)
            }
        }

        cargarPedidoHabitual()
    }, [loading, restaurante, productos, sucursales, cartItems.length, estadoAbierto.abierto, campana, searchParams])

    useEffect(() => {
        if (horarios.length === 0) return
        const interval = setInterval(() => {
            setEstadoAbierto(checkIsOpen(horarios))
        }, 60_000)
        return () => clearInterval(interval)
    }, [horarios])

    const submitOrder = useCallback(async (data: any) => {
        if (!data || !restaurante) return

        const estadoActual = checkIsOpen(horarios)
        if (!estadoActual.abierto && !restaurante?.permitirPedidosProgramados) {
            toast.error('El restaurante está cerrado', {
                description: estadoActual.proximaApertura
                    ? `Abre ${estadoActual.proximaApertura}`
                    : 'El restaurante no está disponible en este momento.',
                duration: 5000
            })
            isSubmittingRef.current = false
            return
        }

        setSubmittingOrder(true)
        try {
            const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
            const tipoPedido = data.tipoPedido as 'delivery' | 'takeaway'
            const endpoint = tipoPedido === 'delivery' ? '/public/delivery/create' : '/public/takeaway/create'
            const payload: any = {
                restauranteId: restaurante.id,
                nombreCliente: data.nombre,
                telefono: data.telefono,
                notas: data.tipoPedido === 'delivery' ? notasConDomicilio(data.notas || '', datosDomicilio(data)) : (data.notas || ''),
                items: cartItems.map((i: any) => ({
                    productoId: i.productoId,
                    varianteId: i.varianteId,
                    varianteSecundariaId: i.varianteSecundariaId,
                    cantidad: i.cantidad,
                    ingredientesExcluidos: i.ingredientesExcluidos,
                    agregados: i.agregados || [],
                    esCanjePuntos: i.esCanjePuntos || false
                })),
                metodoPago: data.metodoPago,
                ...contextoParaPedidoMarketing(username),
            }
            if (data.codigoDescuentoId) payload.codigoDescuentoId = data.codigoDescuentoId
            if (tipoPedido === 'delivery') {
                payload.direccion = data.direccion
                payload.lat = data.lat
                payload.lng = data.lng
                if (data.sucursalId) payload.sucursalId = data.sucursalId
            }
            if (tipoPedido === 'takeaway' && data.sucursalId) payload.sucursalId = data.sucursalId
            if (data.horarioProgramado) payload.horarioProgramado = data.horarioProgramado
            const res = await fetch(`${url}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const result = await res.json()
            if (result.success) {
                registrarEventoTrackingUnaVez(restaurante.id, username, 'purchase', `pedido-${result.data.id}`, {
                    pedidoUnificadoId: result.data.id,
                    valor: result.data.total ? parseFloat(result.data.total) : parseFloat(data.total || '0'),
                    items: cartItems,
                    ...extrasTrackingCampana(campana, { tipoPedido, cantidadItems: cartItems.length }),
                })
                localStorage.setItem('cliente_nombre', data.nombre)
                localStorage.setItem('cliente_telefono', data.telefono)
                setTelefonoCliente(data.telefono)
                if (tipoPedido === 'delivery') {
                    localStorage.setItem('cliente_direccion', data.direccion || '')
                    if (data.lat != null) localStorage.setItem('cliente_lat', String(data.lat))
                    if (data.lng != null) localStorage.setItem('cliente_lng', String(data.lng))
                    guardarDireccionCliente(
                        restaurante.id,
                        data.telefono,
                        data.direccion || '',
                        data.lat ?? null,
                        data.lng ?? null,
                        datosDomicilio(data),
                    )
                }
                localStorage.removeItem(`deliveryCart_${username}`)
                sessionStorage.setItem('deliveryOrderInfo', JSON.stringify({
                    pedidoId: result.data.id,
                    tipoPedido,
                    total: result.data.total ? parseFloat(result.data.total) : parseFloat(data.total || '0'),
                    items: cartItems,
                    metodoPago: data.metodoPago,
                    nombreCliente: data.nombre,
                    aliasDinamico: result.data.aliasDinamico,
                    cvuDinamico: result.data.cvuDinamico,
                    deliveryFee: result.data.deliveryFee,
                    zonaNombre: result.data.zonaNombre,
                    direccion: tipoPedido === 'delivery' ? data.direccion : null,
                    montoDescuento: data.montoDescuento > 0 ? data.montoDescuento : undefined,
                    horarioProgramado: data.horarioProgramado || undefined,
                    notas: data.notas || undefined,
                }))
                navigate(`/success`)
            } else {
                if (result.code === 'FUERA_DE_ZONA') {
                    toast.error('Fuera de zona', { description: 'Tu dirección está fuera del área de delivery. Probá con otra dirección o elegí Take Away.', duration: 6000 })
                } else {
                    toast.error(result.message || 'Error al crear el pedido')
                }
            }
        } catch {
            toast.error('Ocurrió un error al enviar el pedido')
        } finally {
            setSubmittingOrder(false)
            isSubmittingRef.current = false
        }
    }, [restaurante, username, cartItems, navigate, horarios])

    const handleCheckoutMessage = useCallback((msg: any) => {
        if (msg.type === 'INICIAR_EDICION_CHECKOUT') {
            setEditSemaphoreLocal({ clienteId: 'solo', clienteNombre: msg.payload.clienteNombre })
        } else if (msg.type === 'CANCELAR_EDICION_CHECKOUT') {
            setEditSemaphoreLocal(null)
        } else if (msg.type === 'MODIFICAR_CHECKOUT') {
            checkoutDataRef.current = msg.payload.updates
            setCheckoutDeliveryData(msg.payload.updates)
        } else if (msg.type === 'ACEPTAR_EDICION_CHECKOUT') {
            if (isSubmittingRef.current) return
            isSubmittingRef.current = true
            submitOrder(checkoutDataRef.current)
        }
    }, [submitOrder])

    const abrirCarrito = useCallback(() => {
        window.history.pushState({ drawer: 'carrito' }, '')
        setCarritoAbierto(true)
        if (!mostrarCheckoutEnCarrito) setExpandido(true)
    }, [mostrarCheckoutEnCarrito])

    const cerrarCarrito = useCallback(() => {
        setCarritoAbierto(false)
        setMostrarCheckoutEnCarrito(false)
        setExpandido(false)
        setEditSemaphoreLocal(null)
        setCheckoutDeliveryData(null)
        checkoutDataRef.current = null
        setEsPedidoHabitual(false)
        if (window.history.state?.drawer === 'carrito') {
            window.history.back()
        }
    }, [])

    const abrirProductoDrawer = useCallback(() => {
        window.history.pushState({ drawer: 'producto' }, '')
        setDrawerOpen(true)
    }, [])

    const cerrarProductoDrawer = useCallback(() => {
        setDrawerOpen(false)
        setTimeout(() => setSelectedProduct(null), 300)
        if (window.history.state?.drawer === 'producto') {
            window.history.back()
        }
    }, [])

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (carritoAbierto) {
                setCarritoAbierto(false)
                setMostrarCheckoutEnCarrito(false)
                setExpandido(false)
                setEditSemaphoreLocal(null)
                setCheckoutDeliveryData(null)
                checkoutDataRef.current = null
                event.preventDefault()
                return
            }
            if (drawerOpen) {
                setDrawerOpen(false)
                setTimeout(() => setSelectedProduct(null), 300)
                event.preventDefault()
                return
            }
        }
        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    }, [carritoAbierto, drawerOpen])

    const handleLoginPuntos = (e: any) => {
        e.preventDefault()
        const tel = new FormData(e.target).get('telefono') as string
        if (tel) {
            localStorage.setItem('cliente_telefono', tel)
            setTelefonoCliente(tel)
            setModalPuntosOpen(false)
            fetchPuntos(tel, restaurante?.id)
        }
    }

    const ordenCategoria = (nombre: string) =>
        productos.find(p => p.categoria === nombre)?.categoriaOrden ?? 0
    const compararCategorias = (a: string, b: string) => {
        if (a === 'Sin categoría') return 1
        if (b === 'Sin categoría') return -1
        return ordenCategoria(a) - ordenCategoria(b) || a.localeCompare(b)
    }
    const productosVenta = productos.filter(p => !p.soloCanjePuntos)
    const categoriasBase = Array.from(new Set<string>(productosVenta.map(p => p.categoria).filter(Boolean))).sort(compararCategorias)
    const categorias = ['All', ...categoriasBase]

    const productosPorCategoria = productosVenta.reduce((acc, producto) => {
        const categoria = producto.categoria || 'Sin categoría'
        if (!acc[categoria]) {
            acc[categoria] = []
        }
        acc[categoria].push(producto)
        return acc
    }, {} as Record<string, typeof productos>)

    const productosFiltrados = selectedCategory === 'All'
        ? productosVenta
        : productosVenta.filter(p => p.categoria === selectedCategory)

    const categoriasOrdenadas = Object.keys(productosPorCategoria).sort(compararCategorias)
    const productoCampana = campana?.productoId != null ? productosVenta.find((producto) => producto.id === campana.productoId) ?? null : null
    // La landing de una campaña con producto va en lugar del pedido en grupo: la oferta antes que la carta.
    const mostrarPedidoGrupal = !(productoCampana && campana) && restaurante?.orderGroupEnabled !== false

    const abrirDetalleProducto = (producto: any) => {
        setSelectedProduct(producto)
        abrirProductoDrawer()
    }

    // El alfajor que se apoya en la cinta del hero es el Cheese (la foto recortada /cheese-hero-v2.webp):
    // tocarlo abre ese producto. La cinta muestra los sabores de la primera categoría.
    const productoCheese = productosVenta.find(p => /cheese/i.test(p.nombre) && /con papas/i.test(p.nombre))
        ?? productosVenta.find(p => /cheese/i.test(p.nombre)) ?? null
    const palabrasCinta = sabores((productosPorCategoria[categoriasOrdenadas[0]] || []).map((p: any) => String(p.nombre)))

    const irACarta = () => {
        const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        cartaRef.current?.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'start' })
    }

    // Cambiar de categoría desde la barra pegada: si la carta ya quedó arriba, vuelve a su inicio.
    const elegirCategoria = (categoria: string) => {
        setSelectedCategory(categoria || 'All')
        if (cartaRef.current && cartaRef.current.getBoundingClientRect().top < 0) {
            cartaRef.current.scrollIntoView({ block: 'start' })
        }
    }

    useEffect(() => {
        if (!drawerOpen || !selectedProduct?.id || !restaurante?.id) return
        registrarEventoTrackingUnaVez(restaurante.id, username, 'product_view', `producto-${selectedProduct.id}`, {
            productoId: selectedProduct.id, nombreProducto: selectedProduct.nombre, valor: selectedProduct.precio,
            ...extrasTrackingCampana(campana),
        })
        registrarEventoPixelUnaVez('ViewContent', `producto-${selectedProduct.id}`, {
            productoId: selectedProduct.id, nombreProducto: selectedProduct.nombre, valor: selectedProduct.precio,
        })
    }, [drawerOpen, restaurante?.id, selectedProduct?.id, selectedProduct?.precio, username, campana])

    // Lista ordenada de productos "hermanos" para poder saltar de uno a otro dentro
    // del drawer (mismo orden en que se ven en pantalla). El canje por puntos queda
    // fuera: es un flujo aparte (`intentandoCanjear`) que no se navega.
    const productosNavegables: any[] = selectedProduct?.intentandoCanjear
        ? []
        : selectedCategory === 'All'
            ? categoriasOrdenadas.flatMap(c => productosPorCategoria[c] || [])
            : productosFiltrados

    const agregarAlPedido = (producto: any, cantidad: number = 1, ingredientesExcluidos?: number[], agregados?: any[], varianteSeleccionada?: any, varianteSecundariaSeleccionada?: any) => {
        let ingExNombres: string[] = []
        if (ingredientesExcluidos && ingredientesExcluidos.length > 0) {
            ingExNombres = producto.ingredientes
                .filter((i: any) => ingredientesExcluidos.includes(i.id))
                .map((i: any) => i.nombre)
        }

        const esCanje = !!producto.intentandoCanjear;
        if (producto.soloCanjePuntos && !esCanje) {
            toast.error('Este producto sólo se puede canjear por puntos.');
            return false;
        }
        if (esCanje) {
            const puntosRestantes = (puntosCliente || 0) - puntosEnCarrito() - (producto.puntosNecesarios * cantidad);
            if (puntosRestantes < 0) {
                toast.error('No tienes suficientes puntos para agregar este producto.');
                return;
            }
        }

        let basePrecio = varianteSeleccionada ? parseFloat(varianteSeleccionada.precio) : parseFloat(producto.precio)
        basePrecio += varianteSecundariaSeleccionada ? parseFloat(varianteSecundariaSeleccionada.precio) : 0
        let precioFinal = basePrecio
        if (!esCanje && producto.descuento && producto.descuento > 0) {
            precioFinal = basePrecio * (1 - producto.descuento / 100)
        }

        const precioAgregados = agregados ? agregados.reduce((sum: number, ag: any) => sum + parseFloat(ag.precio || 0), 0) : 0;
        const precioFinalNumber = esCanje ? 0 : precioFinal + precioAgregados;

        const nombresVariantes = [varianteSeleccionada?.nombre, varianteSecundariaSeleccionada?.nombre].filter(Boolean).join(' · ')
        const baseNombre = nombresVariantes ? `${producto.nombre} - ${nombresVariantes}` : producto.nombre;

        const newItem = {
            id: Math.random().toString(36).substr(2, 9),
            productoId: producto.id,
            productoNombre: producto.nombre,
            tieneSelectorMedallon: producto.agregados?.some((agregado: any) => etiquetaVarianteMedallon(agregado.nombre) !== null) ?? false,
            nombre: esCanje ? `${baseNombre} (Canje)` : baseNombre,
            precio: precioFinalNumber.toFixed(2),
            precioOriginal: varianteSeleccionada ? varianteSeleccionada.precio : producto.precio,
            descuento: producto.descuento || 0,
            imagenUrl: producto.imagenUrl,
            cantidad,
            varianteId: varianteSeleccionada?.id,
            varianteNombre: varianteSeleccionada?.nombre,
            varianteSecundariaId: varianteSecundariaSeleccionada?.id,
            varianteSecundariaNombre: varianteSecundariaSeleccionada?.nombre,
            ingredientesExcluidos: ingredientesExcluidos || [],
            ingredientesExcluidosNombres: ingExNombres,
            agregados: agregados || [],
            esCanjePuntos: esCanje,
            puntosNecesarios: esCanje ? producto.puntosNecesarios : 0,
            puntosGanados: esCanje ? 0 : producto.puntosGanados
        }

        setCartItems(prev => [...prev, newItem])
        registrarEventoPixel('AddToCart', {
            productoId: producto.id, nombreProducto: producto.nombre, cantidad, valor: (precioFinalNumber * cantidad).toFixed(2),
        })

        setTimeout(() => {
            setCartAnimation(true)
            setTimeout(() => setCartAnimation(false), 300)
        }, 850)
    }

    const handleEliminarItem = (itemId: string) => {
        setCartItems(prev => prev.filter(item => item.id !== itemId))
    }

    const totalPedido = cartItems.reduce((sum, item) => sum + (parseFloat(item.precio) * item.cantidad), 0).toFixed(2)
    const tieneCodigoCampana = Boolean(descuentoGrowthCodigo || codigoPromocionalMarketing(username))
    // El cupón se valida contra el precio de lista: si el carrito ya viene rebajado
    // por la campaña, medir el mínimo sobre el total rebajado lo rechazaría y
    // descontaría dos veces el mismo porcentaje.
    const subtotalBaseOriginal = cartItems.reduce((sum, item) => sum + (parseFloat(item.precioOriginal || item.precio || 0) * item.cantidad), 0).toFixed(2)
    const itemsTotalCheckout = tieneCodigoCampana ? subtotalBaseOriginal : totalPedido
    const puntosEnCarrito = () => cartItems.reduce((sum, item) => sum + (item.esCanjePuntos ? item.puntosNecesarios * item.cantidad : 0), 0)
    const puntosGanadosCarrito = () => cartItems.reduce((sum, item) => sum + (!item.esCanjePuntos && item.puntosGanados ? item.puntosGanados * item.cantidad : 0), 0)

    const productosCanje = productos.filter(p => Number(p.puntosNecesarios) > 0)
    const tieneOpcionesCanje = productosCanje.length > 0
    // Lo que puede gastar ahora, y lo que va a tener con este pedido (menos los canjes, más lo que
    // suma al cobrarse).
    const puntosDisponibles = puntosCliente === null
        ? null
        : Math.max(0, puntosCliente - puntosEnCarrito())
    const puntosConPedido = puntosCliente === null
        ? null
        : Math.max(0, puntosCliente - puntosEnCarrito() + puntosGanadosCarrito())

    // El acceso de puntos de arriba: sin identificar abre la consulta; identificado lleva a los
    // canjes de producto y, si el local no tiene, cuenta cómo se suman.
    const verPuntos = () => {
        if (puntosCliente === null) {
            setModalPuntosOpen(true)
            return
        }
        if (tieneOpcionesCanje && canjeRef.current) {
            const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            canjeRef.current.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'start' })
            return
        }
        toast.info('Sumás puntos con cada pedido')
    }

    // En desarrollo se puede entrar al checkout con el local cerrado, para probarlo a cualquier hora.
    // Mandar el pedido sigue bloqueado (submitOrder): la API de desarrollo es la de producción.
    const checkoutCerrado = !import.meta.env.DEV && !estadoAbierto.abierto && !restaurante?.permitirPedidosProgramados

    const alturaCarrito = (() => {
        const n = cartItems.length
        if (n >= 4) return '85vh'
        return ['28vh', '42vh', '57vh', '71vh'][n]
    })()

    const crearSala = async (nombreParaSala: string) => {
        if (!nombreParaSala.trim() || !restaurante?.id) return
        setCreandoSala(true)
        try {
            const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
            const res = await fetch(`${url}/public/sala/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restauranteId: restaurante.id, nombreCliente: nombreParaSala.trim() })
            })
            const data = await res.json()
            if (data.success && data.data?.token) {
                localStorage.setItem('cliente_nombre', nombreParaSala.trim())
                navigate(`/sala/${data.data.token}/nombre`)
            } else {
                toast.error('Error al crear el pedido entre amigos')
            }
        } catch (e) {
            toast.error('Error al conectar con el servidor')
        } finally {
            setCreandoSala(false)
            setModalSalaOpen(false)
        }
    }

    const handleCrearSala = async (e: React.FormEvent) => {
        e.preventDefault()
        await crearSala(nombreSala)
    }

    const onArmarPedidoClick = () => {
        if (creandoSala) return
        const storedName = localStorage.getItem('cliente_nombre')
        if (storedName) {
            crearSala(storedName)
        } else {
            setModalSalaOpen(true)
        }
    }

    // Paleta oficial de Alfajor (verde #083821, crema #f2eee2), fija como en Menu.tsx: no depende
    // de los colores cargados en el panel.
    const primario = '#083821'
    const secundario = '#f2eee2'

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
        `}} />
    ) : null;

    if (loading) {
        return (
            <div className="menu-delivery flex min-h-screen items-center justify-center bg-[#083821] text-[#f2eee2]">
                {themeStyles}
                <div className="flex flex-col items-center gap-5 px-6 text-center">
                    <img
                        src="/logo.webp"
                        alt="Alfajor"
                        className="w-44 h-auto object-contain animate-pulse"
                    />
                    <span className="font-alfajor text-2xl uppercase tracking-wide animate-pulse">
                        Armando los alfajores
                    </span>
                </div>
            </div>
        )
    }

    if (!restaurante) {
        return <div className="min-h-screen flex justify-center items-center">Restaurante no encontrado</div>
    }

    return (
        <div className="menu-delivery min-h-screen overflow-x-clip bg-background selection:bg-primary/20">
            {themeStyles}

            {!estadoAbierto.abierto && (
                <div className={restaurante?.permitirPedidosProgramados ? "bg-[#eb623a] text-[#083821]" : "bg-[#f2eee2] text-[#083821]"}>
                    <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-5 py-2.5 flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4 shrink-0" />
                        <p className="text-sm text-center">
                            {restaurante?.permitirPedidosProgramados
                                ? 'Arma tu pedido y programa el horario al que quieres recibirlo.'
                                : `Estamos cerrados${estadoAbierto.proximaApertura ? `. Abrimos ${estadoAbierto.proximaApertura}` : ''}`
                            }
                        </p>
                    </div>
                </div>
            )}

            <HeaderMarca enlaceInicio>
                <EstadoLocal abierto={estadoAbierto.abierto} texto={textoEstado(horarios, estadoAbierto)} corto={estadoAbierto.abierto ? 'Abierto' : 'Cerrado'} />
            </HeaderMarca>

            {/* HERO: el toldo verde del local, el titular y la comanda con la polaroid. */}
            <section className="relative bg-[#083821] text-[#f2eee2] dark:bg-[#052a18]">
                <Puntillado />
                <div className="relative mx-auto grid max-w-2xl items-center gap-10 px-5 pb-44 pt-4 sm:pb-56 lg:max-w-5xl lg:grid-cols-[1.1fr_1fr] lg:pb-20 lg:pt-8 xl:max-w-6xl">
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <h1 className="font-alfajor mt-2 text-[42px] uppercase leading-[0.95] sm:text-[64px] lg:text-[78px]">
                            El alfajor
                            <br />
                            que no es
                            <br />
                            <span className="relative inline-block text-[#f2eee2]/90">
                                dulce.
                                <Tachado />
                            </span>
                        </h1>
                        <p className="mt-5">
                            <span className="font-alfajor inline-block origin-left -rotate-2 bg-[#eb623a] px-2.5 pb-1 pt-1.5 text-[17px] uppercase leading-tight text-[#083821] sm:text-[24px]">
                                Es salado. Y se come con papas.
                            </span>
                        </p>

                        {bannerGrowth && (
                            <p className="animate-in fade-in duration-300 mt-6 inline-flex max-w-full items-center gap-2 rounded-2xl bg-[#eb623a] px-3.5 py-2 text-[13px] leading-snug text-[#083821]">
                                <BadgePercent className="size-4 shrink-0" aria-hidden />
                                <span>
                                    <strong className="font-extrabold">{bannerGrowth.titulo}</strong> {bannerGrowth.detalle}
                                </span>
                            </p>
                        )}

                        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                            <BotonTicket onClick={irACarta}>Elegí tu alfajor</BotonTicket>
                            {mostrarPedidoGrupal && (
                                <button type="button" onClick={onArmarPedidoClick} aria-busy={creandoSala} className={ACCESO_HERO}>
                                    {creandoSala
                                        ? <Loader2 className="size-4 shrink-0 animate-spin" />
                                        : <Users className="size-4 shrink-0 text-[#eb623a]" />}
                                    <span className="truncate">{creandoSala ? 'Creando link…' : 'Pedir entre varios'}</span>
                                </button>
                            )}
                            {restaurante?.sistemaPuntos && (
                                <button
                                    type="button"
                                    onClick={verPuntos}
                                    aria-label={puntosConPedido === null ? undefined : `Tus puntos: ${puntosConPedido.toLocaleString('es-AR')} pts`}
                                    className={ACCESO_HERO}
                                >
                                    {loadingPuntos
                                        ? <Loader2 className="size-4 shrink-0 animate-spin" />
                                        : <Sparkles className="size-4 shrink-0 text-[#eb623a]" />}
                                    {puntosConPedido === null ? 'Ver mis puntos' : (
                                        <span className="tabular-nums">{puntosConPedido.toLocaleString('es-AR')} pts</span>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {productoCheese && (
                        <AlfajorEnElToldo
                            src="/cheese-hero-v2.webp"
                            srcSet="/cheese-hero-v2-1200.webp 1200w, /cheese-hero-v2.webp 1600w"
                            sizes="(min-width: 1024px) 57vw, (min-width: 640px) 62vw, 88vw"
                            nombre={sabores([productoCheese.nombre])[0]}
                            onClick={() => abrirDetalleProducto(productoCheese)}
                            className="right-[-10%] bottom-[-62px] w-[88%] sm:right-[-4%] sm:w-[62%] lg:right-[-4%] lg:bottom-[-78px] lg:w-[57%]"
                          />
                    )}
                </div>
            </section>
            <Toldo />
            <Cinta palabras={palabrasCinta} />

            <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-5 pt-6 space-y-8">
                {productoCampana && campana && (
                    <CampanaProductoHero campana={campana} producto={productoCampana} onClick={() => abrirDetalleProducto(productoCampana)} />
                )}

                {restaurante?.sistemaPuntos && tieneOpcionesCanje && (
                    <section ref={canjeRef} aria-label="Canje de puntos" className="scroll-mt-20 space-y-3">
                        <div className="flex items-baseline justify-between gap-3 px-1">
                            <h2 className="font-alfajor flex items-center gap-1.5 text-2xl uppercase leading-none text-foreground">
                                <Sparkles className="size-5 text-[#eb623a]" />
                                Canje de puntos
                            </h2>
                            {puntosDisponibles !== null ? (
                                <span className="text-xs text-muted-foreground">
                                    Disponibles: <strong className="font-bold tabular-nums text-foreground">{puntosDisponibles.toLocaleString('es-AR')} pts</strong>
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setModalPuntosOpen(true)}
                                    className="text-xs font-semibold text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded-sm"
                                >
                                    Identificate para canjear
                                </button>
                            )}
                        </div>

                        <div className={`-mx-5 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 py-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 xl:grid-cols-3 ${RIEL_SIN_BARRA}`}>
                            {productosCanje.map((producto: any) => {
                                const enCarrito = cartItems.find(it => it.productoId === producto.id && it.esCanjePuntos)
                                return (
                                    <ProductoCanjeCard
                                        key={producto.id}
                                        producto={producto}
                                        cantidadEnCarrito={enCarrito?.cantidad}
                                        onClick={() => abrirDetalleProducto({ ...producto, intentandoCanjear: true })}
                                    />
                                )
                            })}
                        </div>
                    </section>
                )}

                <div ref={cartaRef} className="scroll-mt-4">
                    {categorias.length > 1 && (
                        <NavCategorias categorias={categorias} activa={selectedCategory} onChange={elegirCategoria} />
                    )}

                    <section className="mt-6 space-y-14 min-h-[50vh]">
                        {selectedCategory === 'All' ? (
                            categoriasOrdenadas.length > 0 ? (
                                categoriasOrdenadas.map((categoriaNombre, indice) => {
                                    const productosDeCategoria = productosPorCategoria[categoriaNombre]
                                    if (!productosDeCategoria || productosDeCategoria.length === 0) return null

                                    return (
                                        <div key={categoriaNombre} className="space-y-5">
                                            <TituloSeccion
                                                indice={indice + 1}
                                                titulo={categoriaNombre}
                                                detalle={`${productosDeCategoria.length} ${productosDeCategoria.length === 1 ? 'opción' : 'opciones'}`}
                                            />
                                            <div className={GRILLA_PRODUCTOS}>
                                                {productosDeCategoria.map((producto: any) => (
                                                    <ProductoCard
                                                        key={producto.id}
                                                        producto={producto}
                                                        onClick={() => abrirDetalleProducto(producto)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <EmptyState />
                            )
                        ) : (
                            productosFiltrados.length > 0 ? (
                                <div className="space-y-5">
                                    <TituloSeccion
                                        indice={categoriasOrdenadas.indexOf(selectedCategory) + 1}
                                        titulo={selectedCategory}
                                        detalle={`${productosFiltrados.length} ${productosFiltrados.length === 1 ? 'opción' : 'opciones'}`}
                                    />
                                    <div className={GRILLA_PRODUCTOS}>
                                        {productosFiltrados.map((producto: any) => (
                                            <ProductoCard
                                                key={producto.id}
                                                producto={producto}
                                                onClick={() => abrirDetalleProducto(producto)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <EmptyState />
                            )
                        )}
                    </section>
                </div>
            </div>

            <FooterMarca
                horarios={horarios}
                direccion={restaurante.direccion}
                onPedir={() => (cartItems.length > 0 ? abrirCarrito() : irACarta())}
            />

            {/* VER PEDIDO: reacciona a la dirección del scroll (contra-scroll) y late al sumar algo. */}
            <BotonPedido
                cantidad={cartItems.length}
                total={formatPrecio(totalPedido)}
                visible={cartItems.length > 0}
                onClick={abrirCarrito}
                pulso={cartAnimation}
                className={scrollDir === 'down' ? '-translate-y-1.5' : scrollDir === 'up' ? 'translate-y-1.5' : 'translate-y-0'}
            />

            {/* CARRITO OVERLAY */}
            {carritoAbierto && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
                    onClick={cerrarCarrito}
                />
            )}

            {/* CARRITO DRAWER (bottom sheet) */}
            <div
                className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${carritoAbierto ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}
            >
                <div
                    className={`mx-auto max-w-2xl lg:max-w-lg bg-background rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.28)] border-t border-border flex flex-col transition-[height] duration-300 ease-out relative ${(!mostrarCheckoutEnCarrito || expandido) ? 'overflow-hidden' : 'overflow-y-auto'}`}
                    style={!mostrarCheckoutEnCarrito ? { height: alturaCarrito } : expandido ? { height: '85vh' } : { maxHeight: '88vh' }}
                >
                    {submittingOrder && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center rounded-t-3xl">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-sm font-medium">Enviando pedido...</p>
                            </div>
                        </div>
                    )}

                    <div className="shrink-0 sticky top-0 z-10 bg-background pt-2">
                        <div className="w-full flex justify-center pt-3 pb-1">
                            <span className="w-12 h-1.5 rounded-full bg-[#eb623a]" />
                        </div>
                        <div className="flex items-center justify-between px-4 pb-3 pt-2">
                            <div className="w-8 h-8" />
                            <span className={`font-alfajor ${esPedidoHabitual ? 'text-[24px]' : 'text-[28px]'} uppercase leading-none text-center px-2`}>
                                {mostrarCheckoutEnCarrito ? tituloCheckout : 'Tu Pedido'}
                            </span>
                            {mostrarCheckoutEnCarrito && !esPedidoHabitual ? (
                                <button
                                    onClick={() => setExpandido(e => !e)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
                                    aria-label={expandido ? 'Minimizar' : 'Maximizar'}
                                >
                                    {expandido ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                            ) : (
                                <div className="w-8 h-8" />
                            )}
                        </div>
                    </div>

                    {mostrarCheckoutEnCarrito ? (
                        <CheckoutDeliveryGrupal
                            modo={expandido ? 'completo' : 'pasos'}
                            onVolverCarrito={() => {
                                if (esPedidoHabitual) {
                                    setCartItems([])
                                    cerrarCarrito()
                                    return
                                }
                                setMostrarCheckoutEnCarrito(false)
                                setExpandido(true)
                                setCheckoutDeliveryData(null)
                                checkoutDataRef.current = null
                                setEditSemaphoreLocal(null)
                                setEsPedidoHabitual(false)
                            }}
                            restauranteId={restaurante?.id ?? 0}
                            restauranteUsername={username}
                            itemsTotal={itemsTotalCheckout}
                            totalItems={cartItems.length}
                            sendMessage={handleCheckoutMessage}
                            clienteId="solo"
                            clienteNombre={localStorage.getItem('cliente_nombre') || ''}
                            checkoutData={checkoutDeliveryData}
                            editSemaphore={editSemaphoreLocal}
                            restauranteDireccion={restaurante?.direccion ?? undefined}
                            onTituloChange={setTituloCheckout}
                            labelGuardar="Confirmar y pedir"
                            labelConfirmar={esPedidoHabitual && checkoutDeliveryData?.metodoPago
                                ? `Pedir y pagar con ${nombreMetodoPago(checkoutDeliveryData.metodoPago)}`
                                : undefined}
                            itemsResumen={esPedidoHabitual ? cartItems : undefined}
                            pedidoHabitual={esPedidoHabitual}
                            localCerrado={!estadoAbierto.abierto}
                            contextoMarketing={{
                                ...contextoParaPedidoMarketing(username),
                                ...(campana ? { campaniaSlug: campana.slug, campanaId: campana.campanaId } : {}),
                            }}
                            codigoPromocionalInicial={descuentoGrowthCodigo || codigoPromocionalMarketing(username)}
                            onConfirmarClick={() => {
                                if (isSubmittingRef.current || !checkoutDataRef.current) return
                                isSubmittingRef.current = true
                                submitOrder(checkoutDataRef.current)
                            }}
                        />
                    ) : cartItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center gap-4 opacity-60 px-5 py-12">
                            <div className="bg-secondary p-6 rounded-full">
                                <UtensilsCrossed className="w-10 h-10" />
                            </div>
                            <p className="font-medium">El pedido está vacío.</p>
                            <Button variant="link" onClick={cerrarCarrito}>Ir al menú</Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
                                {cartItems.map((item) => {
                                    const imagen = item.imagenUrl
                                    const precio = parseFloat(item.precio || 0)
                                    return (
                                        <article key={item.id} className="grid min-h-[112px] grid-cols-[108px_minmax(0,1fr)] overflow-hidden rounded-[20px] border border-border bg-card transition-colors hover:border-foreground/15">
                                            <div className="min-h-[112px] w-[108px] overflow-hidden bg-muted">
                                                {imagen ? (
                                                    <img src={imagen} alt={item.nombre} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                                        <Utensils className="h-5 w-5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex min-w-0 flex-col justify-between px-3.5 py-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="line-clamp-2 text-[15px] font-bold leading-5 text-foreground">{item.nombre}</p>
                                                        {item.ingredientesExcluidosNombres?.length > 0 && (
                                                            <p className="mt-2 text-xs leading-4 text-muted-foreground">
                                                                ⚠️ Sin: {item.ingredientesExcluidosNombres.join(', ')}
                                                            </p>
                                                        )}
                                                        {item.agregados?.length > 0 && (
                                                            <div className="mt-1 space-y-0.5">
                                                                {item.agregados.map((ag: any) => (
                                                                    <p key={ag.id} className="text-xs leading-4 text-muted-foreground">+ {ag.nombre}</p>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="shrink-0 text-right tabular-nums">
                                                        {item.descuento > 0 && (
                                                            <p className="text-[10px] text-muted-foreground line-through">${formatPrecio(parseFloat(item.precioOriginal) * item.cantidad)}</p>
                                                        )}
                                                        <p className="text-lg font-black leading-5 tracking-tight text-foreground">${formatPrecio(precio * item.cantidad)}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex justify-end">
                                                    <button type="button" onClick={() => handleEliminarItem(item.id)} aria-label={`Quitar ${item.nombre} del carrito`} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    )
                                })}
                            </div>
                            <div className="shrink-0 p-4 border-t-2 border-dashed border-border bg-background">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-muted-foreground text-sm">Total a pagar</span>
                                    <span className="text-[28px] font-bold leading-none tabular-nums">${formatPrecio(totalPedido)}</span>
                                </div>
                                <Button
                                    className="font-alfajor w-full h-13 rounded-2xl text-base shadow-md"
                                    disabled={checkoutCerrado}
                                    onClick={() => {
                                        if (checkoutCerrado) return
                                        // Meta cuenta el inicio de checkout una vez por sesión: ir y
                                        // volver del carrito no puede inflar el paso del embudo.
                                        registrarEventoPixelUnaVez('InitiateCheckout', 'checkout', {
                                            items: cartItems, valor: Number(totalPedido),
                                        })
                                        setEsPedidoHabitual(false)
                                        setMostrarCheckoutEnCarrito(true)
                                        setExpandido(false)
                                    }}
                                >
                                    {checkoutCerrado ? 'Cerrado' : <>Continuar <ArrowRight className="size-4" /></>}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <Sheet open={modalPuntosOpen} onOpenChange={setModalPuntosOpen}>
                <SheetContent side="bottom" className="rounded-t-3xl border-none">
                    <form onSubmit={handleLoginPuntos} className="p-4 py-8 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                            </div>
                            <h3 className="text-xl font-bold">Consulta tus Puntos</h3>
                            <p className="text-sm text-muted-foreground">Ingresa tu celular de WhatsApp para ver los puntos de pedidos anteriores.</p>
                        </div>
                        <div className="space-y-2">
                            <input type="tel" name="telefono" required defaultValue={telefonoCliente} className="w-full text-center py-4 rounded-xl border border-input bg-transparent text-lg placeholder:text-muted-foreground focus:ring-2 focus:ring-primary transition-all outline-none" placeholder="Tu número de celular" />
                        </div>
                        <Button type="submit" className="w-full h-12 rounded-xl text-base bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                            {loadingPuntos ? 'Consultando...' : 'Ver Puntos'}
                        </Button>
                    </form>
                </SheetContent>
            </Sheet>

            <ProductDetailDrawer
                product={selectedProduct ? { ...selectedProduct, categoria: selectedProduct.categoria ?? undefined } : null}
                open={drawerOpen}
                onClose={cerrarProductoDrawer}
                onAddToOrder={agregarAlPedido}
                siblings={productosNavegables}
                onNavigate={(p) => setSelectedProduct(p)}
            />

            <Dialog open={modalSalaOpen} onOpenChange={setModalSalaOpen}>
                <DialogContent className="max-w-sm rounded-3xl p-6">
                    <DialogHeader className="text-center sm:text-center">
                        <div className="mx-auto mb-4">
                            <AvatarStack grande />
                        </div>
                        <DialogTitle className="text-xl">Pedido entre amigos</DialogTitle>
                        <DialogDescription className="text-center pt-1">
                            Un solo pedido para todo el grupo, sin pasarse la lista.
                        </DialogDescription>
                    </DialogHeader>
                    <ol className="mt-4 space-y-3">
                        {[
                            'Compartís el link con tu grupo',
                            'Cada uno agrega lo suyo desde su celu',
                            'Todo sale junto, en un solo pedido',
                        ].map((paso, i) => (
                            <li key={i} className="flex items-center gap-3">
                                <span className="w-6 h-6 shrink-0 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">
                                    {i + 1}
                                </span>
                                <span className="text-sm text-foreground/80 leading-snug">{paso}</span>
                            </li>
                        ))}
                    </ol>
                    <form onSubmit={handleCrearSala} className="mt-5 space-y-3">
                        <Input
                            placeholder="¿Cuál es tu nombre?"
                            value={nombreSala}
                            onChange={(e) => setNombreSala(e.target.value)}
                            required
                            autoComplete="off"
                            autoFocus
                            className="h-12 text-center rounded-xl"
                        />
                        <DialogFooter className="flex-col gap-2 sm:gap-2">
                            <Button
                                type="submit"
                                size="lg"
                                disabled={creandoSala || !nombreSala.trim()}
                                className="w-full rounded-2xl font-semibold"
                            >
                                {creandoSala ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creando tu link…
                                    </>
                                ) : (
                                    <>
                                        <Share2 className="w-4 h-4" />
                                        Crear mi link
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// Pila de avatares con un lugar libre ("+"): el visual de "un grupo con lugar para vos".
// Es lo que hace legible el pedido entre amigos sin leer ni una palabra.
const AvatarStack = ({ grande }: { grande?: boolean }) => {
    const circulo = grande ? 'w-11 h-11' : 'w-8 h-8'
    const icono = grande ? 'w-5 h-5' : 'w-4 h-4'
    return (
        <div className={`flex shrink-0 ${grande ? '-space-x-3' : '-space-x-2.5'}`}>
            <div className={`${circulo} rounded-full bg-primary text-primary-foreground flex items-center justify-center ring-2 ring-background z-[2]`}>
                <User className={icono} />
            </div>
            <div className={`${circulo} rounded-full bg-primary/25 text-primary flex items-center justify-center ring-2 ring-background z-[1]`}>
                <User className={icono} />
            </div>
            <div className={`${circulo} rounded-full border-2 border-dashed border-primary/40 text-primary/60 bg-background flex items-center justify-center`}>
                <Plus className={icono} />
            </div>
        </div>
    )
}

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50">
        <Package className="w-10 h-10 mb-2" />
        <p className="text-sm">Sin productos disponibles.</p>
    </div>
)

/** Landing de una campaña con producto: reemplaza la tarjeta de "pedido entre
 * amigos" para que el link muestre la oferta antes que la carta completa. */
const CampanaProductoHero = ({ campana, producto, onClick }: { campana: CampanaProductoPublica; producto: any; onClick: () => void }) => {
    const precioOriginal = Number(producto.precio || 0)
    const descuento = Math.max(0, Number(producto.descuento || campana.descuentoPorcentaje || 0))
    const precioFinal = precioOriginal * (1 - descuento / 100)
    return (
        <section className="overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-primary/5 to-background shadow-lg lg:mx-auto lg:max-w-3xl">
            <button type="button" onClick={onClick} className="grid w-full text-left sm:grid-cols-[minmax(220px,0.9fr)_1.1fr]">
                {producto.imagenUrl ? <img src={producto.imagenUrl} alt={producto.nombre} className="h-56 w-full object-cover sm:h-full sm:min-h-64" /> : <div className="flex min-h-44 items-center justify-center bg-primary/10"><Utensils className="h-14 w-14 text-primary/50" /></div>}
                <div className="flex flex-col justify-center p-6 sm:p-8">
                    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-primary px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-primary-foreground">Oferta especial</span>{campana.usosRestantes != null && <span className="text-xs font-semibold text-muted-foreground">Quedan {campana.usosRestantes}</span>}</div>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{campana.nombre}</p>
                    <h2 className="mt-1 text-2xl font-black leading-tight text-foreground sm:text-3xl">{producto.nombre}</h2>
                    {producto.descripcion && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{producto.descripcion}</p>}
                    <div className="mt-5 flex items-end gap-3"><span className="text-3xl font-black text-primary">${precioFinal.toFixed(0)}</span>{descuento > 0 && <><span className="pb-1 text-sm font-semibold text-muted-foreground line-through">${precioOriginal.toFixed(0)}</span><span className="mb-1 rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-400">{descuento}% OFF</span></>}</div>
                    <div className="mt-5 flex items-center justify-between gap-3"><div className="text-xs font-medium text-muted-foreground">{campana.fechaFin && formatTimeLeft(campana.fechaFin) ? `Termina en ${formatTimeLeft(campana.fechaFin)}` : 'Disponible desde este link'}</div><span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Ver producto <Plus className="h-4 w-4" /></span></div>
                </div>
            </button>
        </section>
    )
}

const ProductoCard = ({ producto, onClick }: { producto: any, onClick: () => void }) => {
    const tieneDescuento = !!(producto.descuento && producto.descuento > 0)
    const precioOriginal = parseFloat(producto.precio)
    const precioFinal = tieneDescuento ? precioOriginal * (1 - producto.descuento / 100) : precioOriginal
    const nombreLength = String(producto.nombre ?? '').trim().length
    // El nombre va en Eastman, que es ancha: un punto más chica que la letra anterior.
    const nombreClass = nombreLength > 70 ? 'text-base' : nombreLength > 48 ? 'text-[17px]' : nombreLength > 30 ? 'text-lg' : 'text-xl'

    // Diseño sólido (único): el glassmorphism quedó discontinuado.
    return (
        <div
            className="group relative flex min-h-[260px] flex-col w-full rounded-[24px] bg-card border border-border/50 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
            onClick={onClick}
        >
            {/* La foto va `absolute`: así no estira el recuadro 3:2 cuando es más alta (botellas, etc.) y
                todas las tarjetas tienen la misma foto y el mismo alto. */}
            <div className="w-full aspect-[3/2] shrink-0 bg-zinc-900 relative overflow-hidden">
                {producto.imagenUrl ? (
                    <img
                        src={producto.imagenUrl}
                        alt={producto.nombre}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-zinc-800 to-zinc-900">
                        <Utensils className="w-10 h-10 text-primary" />
                    </div>
                )}
                {tieneDescuento && (
                    <div className="absolute top-2.5 left-2.5 z-10">
                        <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-lg uppercase tracking-wide">
                            {producto.descuento}% OFF
                        </span>
                    </div>
                )}
            </div>

            <div className="p-3.5 flex flex-col flex-1 bg-card">
                <div className="flex-1">
                    <h3 className={`font-alfajor break-words leading-tight text-foreground [overflow-wrap:anywhere] ${nombreClass}`}>
                        {producto.nombre}
                    </h3>
                    {producto.descripcion && (
                        <p className="mt-1 text-sm text-muted-foreground break-words leading-snug font-medium">
                            {producto.descripcion}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-baseline justify-start gap-1.5 mt-2 text-left">
                    <span className={`font-bold text-[22px] ${tieneDescuento ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}`}>
                        ${precioFinal.toFixed(0)}
                    </span>
                    {tieneDescuento && (
                        <span className="text-[11px] font-semibold text-muted-foreground line-through opacity-70">
                            ${precioOriginal.toFixed(0)}
                        </span>
                    )}
                </div>
                {tieneDescuento && producto.descuentoFechaFin && formatTimeLeft(producto.descuentoFechaFin) && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-500/20 w-fit">
                        <span>⏱</span>
                        <span>Vence en {formatTimeLeft(producto.descuentoFechaFin)}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

export default MenuDelivery

const ProductoCanjeCard = ({
    producto,
    cantidadEnCarrito,
    onClick,
}: {
    producto: any
    cantidadEnCarrito?: number
    onClick: () => void
}) => (
    // Una fila corta, sin borde ni sombra, para que los canjes entren en un riel de una sola altura
    // y no empujen la carta: la ficha completa (descripción, extras) está en el detalle del producto.
    <button
        type="button"
        onClick={onClick}
        aria-label={`${producto.nombre}, ${producto.puntosNecesarios} puntos${cantidadEnCarrito ? `, en tu pedido (${cantidadEnCarrito})` : ', canjear'}`}
        className={`group flex w-64 shrink-0 snap-start items-center gap-3 rounded-2xl p-2 pr-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 lg:w-full ${
            cantidadEnCarrito ? 'bg-primary/10 ring-1 ring-primary/40' : 'bg-secondary hover:bg-secondary/70'
        }`}
    >
        <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
            {producto.imagenUrl ? (
                <img src={producto.imagenUrl} alt="" className="size-full object-cover" />
            ) : (
                <span className="grid size-full place-items-center">
                    <Utensils className="size-5 text-primary" />
                </span>
            )}
        </span>
        <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-[13px] font-semibold leading-tight text-foreground [overflow-wrap:anywhere]">
                {producto.nombre}
            </span>
            <span className="mt-1 block text-xs font-bold tabular-nums text-foreground/70">
                {producto.puntosNecesarios} pts
            </span>
        </span>
        {cantidadEnCarrito ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
                <Check className="size-3 stroke-[3]" />
                {cantidadEnCarrito}
            </span>
        ) : (
            <span className="shrink-0 rounded-full bg-background px-3 py-1.5 text-[11px] font-bold text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                Canjear
            </span>
        )}
    </button>
)
