import { useState, useEffect, useLayoutEffect, useRef, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { motion, AnimatePresence, useIsPresent, useMotionValue, animate, type PanInfo } from 'motion/react'
import { Check, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrecio } from '@/lib/formatPrecio'
import { fotosDeProducto } from '@/lib/fotosProducto'

interface Ingrediente {
  id: number
  nombre: string
}

interface Agregado {
  id: number
  nombre: string
  precio: string
  grupo?: number
}

interface Variante {
  id: number
  nombre: string
  precio: string
}

interface Product {
  id: number
  nombre: string
  descripcion: string | null
  precio: number | string
  imagenUrl: string | null
  /** Galería opcional: se recorre deslizando la foto del detalle. La portada es `imagenUrl`. */
  imagenesExtra?: string[]
  categoria?: string
  ingredientes?: Ingrediente[]
  agregados?: Agregado[]
  agregadosPrimarios?: Agregado[]
  agregadosSecundarios?: Agregado[]
  variantes?: Variante[]
  variantesSecundarias?: Variante[]
  tituloVariantesPrimarias?: string
  tituloVariantesSecundarias?: string
  tituloExtrasPrimarios?: string
  tituloExtrasSecundarios?: string
  descuento?: number | null
  descuentoFechaFin?: string | null
}

interface ProductDetailDrawerProps {
  product: Product | null
  open: boolean
  onClose: () => void
  onAddToOrder: (product: Product, quantity: number, ingredientesExcluidos?: number[], agregados?: Agregado[], varianteSeleccionada?: Variante, varianteSecundariaSeleccionada?: Variante) => void
  /** Lista ordenada de productos "hermanos" navegables desde el detalle. Si tiene ≥2
   *  items, se puede pasar al producto anterior/siguiente sin cerrar el drawer. */
  siblings?: Product[]
  /** Se llama con el producto destino al navegar (el padre actualiza el producto abierto). */
  onNavigate?: (product: Product) => void
}

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

/** "Cebolla" → "cebolla" para que "Sin cebolla" se lea como frase; las siglas ("BBQ") quedan como están. */
function enMinuscula(texto: string): string {
  return /^\p{Lu}\p{Ll}/u.test(texto) ? texto.charAt(0).toLowerCase() + texto.slice(1) : texto
}

/** Espacio que no corta línea (sin escribir el carácter invisible en el código). */
const NBSP = String.fromCharCode(0xa0)

/** Un nombre no se parte entre líneas: el resumen de lo elegido sólo corta entre elementos. */
function sinCortes(texto: string): string {
  return texto.replace(/ /g, NBSP)
}

/** Mide la altura natural de su contenido y la informa (también cuando cambia), para que el drawer
 *  se ajuste a lo que hay en vez de a una estimación. Un hijo que ya está saliendo de un
 *  `AnimatePresence` deja de informar, así no pisa la medida del que entra. */
function Medido({ onAltura, className, children }: { onAltura: (alto: number) => void; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const presente = useIsPresent()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !presente) return
    const medir = () => onAltura(Math.ceil(el.getBoundingClientRect().height))
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    return () => observador.disconnect()
  }, [onAltura, presente])

  return <div ref={ref} className={className}>{children}</div>
}

/** Altura fija de la imagen (px). Ahora es idéntica en todas las etapas. */
const IMG_H = 220
/** Cuánto sube la hoja inferior sobre la imagen (el `-mt-5` de la hoja). */
const SOLAPA = 20
const SPRING = { type: 'spring' as const, stiffness: 320, damping: 34 }
/** Sin animar: la primera medición al abrir tiene que quedar exacta, no crecer desde cero. */
const SIN_ANIMAR = { duration: 0 }
/** Transición del crossfade deslizante entre el contenido de las dos etapas. */
const SLIDE = { type: 'tween' as const, duration: 0.34, ease: [0.22, 1, 0.36, 1] as const }
/** Lo que dura el cruce entre etapas (SLIDE + margen, y cubre el umbral de doble toque de los
 *  sistemas): en ese lapso la hoja ignora toques (ver `cruzando`). */
const CRUCE_MS = 400
/** Transición del deslizamiento horizontal al pasar de un producto a otro. */
const NAV_SLIDE = { type: 'tween' as const, duration: 0.42, ease: [0.32, 0.72, 0, 1] as const }
/** Paso entre fotos de la galería: sigue al dedo y se asienta con un resorte corto. */
const FOTO_SPRING = { type: 'spring' as const, stiffness: 380, damping: 38 }
/** Resistencia al tirar de la galería hacia un borde sin foto (ni producto) del otro lado. */
const BORDE_ELASTICO = 0.3

// Cada fila de la lista de variantes (py-3.5 + texto + gap). Sólo dimensiona el tope de esa lista:
// el alto del drawer sale de medir el contenido (`Medido`), no de constantes.
const ROW_H = 58
// Máximo de variantes visibles antes de scroll
const MAX_VISIBLE_VARIANTS = 3

// ── Variante SIN IMAGEN: diseño plano (sin foto ni hoja superpuesta) ──
// Espeja el card text-only de MenuDelivery: nombre/precio en texto foreground, todo al ras.
// Aire sobre el header de texto (pt-9) y lo que ocupa el botón volver cuando aparece (h-9 + mb-3).
const PLANO_PT = 36
const VOLVER_PLANO_H = 48

// Al navegar entre productos, la tarjeta entrante llega desde el lado del gesto y la
// saliente se va con un leve parallax. `dir` = +1 (siguiente) / -1 (anterior).
const navVariants = {
  enter: (dir: number) => ({ x: dir >= 0 ? '100%' : '-100%', opacity: 0.35 }),
  center: { x: '0%', opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? '-42%' : '42%', opacity: 0 }),
}


type CustomizationStage = 'primary' | 'secondary' | 'extrasPrimary' | 'extrasSecondary'
type MedallonSelection = 'simple' | 'doble' | 'triple'

const normalizarNombre = (nombre: string) => nombre
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim()

/** En Alfajor estos agregados modelan el tamaño de la hamburguesa y se
 * presentan como variantes, no como extras independientes. */
export const etiquetaVarianteMedallon = (nombre: string): 'Doble' | 'Triple' | null => {
  const nombreNormalizado = normalizarNombre(nombre)
  if (nombreNormalizado === 'doble medallon') return 'Doble'
  if (nombreNormalizado === 'triple medallon') return 'Triple'
  return null
}

export function ProductDetailDrawer({ product, open, onClose, onAddToOrder, siblings, onNavigate }: ProductDetailDrawerProps) {
  const [stage, setStage] = useState<CustomizationStage>('primary')
  const [quantity, setQuantity] = useState(1)
  const [ingredientesExcluidos, setIngredientesExcluidos] = useState<number[]>([])
  const [agregadosSeleccionados, setAgregadosSeleccionados] = useState<Agregado[]>([])
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<Variante | null>(null)
  const [varianteSecundariaSeleccionada, setVarianteSecundariaSeleccionada] = useState<Variante | null>(null)
  const [medallonSeleccionado, setMedallonSeleccionado] = useState<MedallonSelection>('simple')
  const [addCount, setAddCount] = useState(0)
  const [showCounter, setShowCounter] = useState(false)
  // Dirección del último salto entre productos (alimenta la animación de deslizamiento).
  const [navDir, setNavDir] = useState(0)
  // Alturas naturales de cada pieza, medidas con `Medido`: el drawer las suma en vez de estimarlas.
  const [contenidoH, setContenidoH] = useState(0)
  const [resumenH, setResumenH] = useState(0)
  const [pieH, setPieH] = useState(0)
  const [cabeceraPlanaH, setCabeceraPlanaH] = useState(0)
  // La altura sólo se anima con resorte pasada la primera medición al abrir; antes se fija de golpe.
  const [animar, setAnimar] = useState(false)
  // Última altura con producto: al cerrar, el padre lo suelta antes de que termine de bajar la hoja.
  const [alturaVigente, setAlturaVigente] = useState(0)
  // Mientras cruzan las etapas (CRUCE_MS) la hoja —etapa y pie— ignora toques: elegir una variante
  // cambia de etapa y un segundo toque en el mismo lugar caería sobre la etapa nueva (activaría un
  // ingrediente o un extra) o sobre el botón de agregar del pie.
  const [cruzando, setCruzando] = useState(false)
  const cruceTimer = useRef<number | undefined>(undefined)
  const productId = product?.id
  // Foto visible de la galería, atada al producto: al pasar a otro arranca en la portada desde el
  // primer frame (un reset en efecto mostraría un frame con el índice del producto anterior).
  const [foto, setFoto] = useState<{ productoId?: number; idx: number }>({ idx: 0 })
  // Desplazamiento en vivo del dedo sobre la galería (px), sumado al paso de foto (%).
  const arrastreFoto = useMotionValue(0)
  // El gesto sobre la foto se decide en el primer movimiento: horizontal recorre fotos/productos,
  // vertical queda para el scroll y para bajar el drawer.
  const panHorizontal = useRef(false)
  // Hubo arrastre en el gesto actual: el click con que termina no cuenta como toque.
  const huboPan = useRef(false)

  useEffect(() => {
    if (open && productId !== undefined) {
      setStage('primary')
      setIngredientesExcluidos([])
      setAgregadosSeleccionados([])
      setVarianteSeleccionada(null)
      setVarianteSecundariaSeleccionada(null)
      setMedallonSeleccionado('simple')
      setQuantity(1)
      setAddCount(0)
      setShowCounter(false)
    }
  }, [open, productId])

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => setAnimar(true), 120)
    return () => {
      window.clearTimeout(id)
      setAnimar(false)
    }
  }, [open])

  useEffect(() => () => window.clearTimeout(cruceTimer.current), [])

  const tieneIngredientes = !!(product?.ingredientes && product.ingredientes.length > 0)
  const todosLosAgregados = [
    ...(product?.agregados ?? []),
    ...(product?.agregadosPrimarios ?? []),
    ...(product?.agregadosSecundarios ?? []),
  ]
  const extraDobleMedallon = todosLosAgregados.find(ag => etiquetaVarianteMedallon(ag.nombre) === 'Doble')
  const extraTripleMedallon = todosLosAgregados.find(ag => etiquetaVarianteMedallon(ag.nombre) === 'Triple')
  const idsExtrasMedallon = new Set(
    [extraDobleMedallon?.id, extraTripleMedallon?.id].filter((id): id is number => id !== undefined)
  )
  const tieneSelectorMedallon = idsExtrasMedallon.size > 0
  const agregadoMedallonSeleccionado = medallonSeleccionado === 'doble'
    ? extraDobleMedallon
    : medallonSeleccionado === 'triple'
      ? extraTripleMedallon
      : undefined
  const opcionesMedallon: Array<{ id: MedallonSelection; nombre: string; agregado?: Agregado }> = [
    { id: 'simple', nombre: 'Simple' },
    ...(extraDobleMedallon ? [{ id: 'doble' as const, nombre: 'Doble', agregado: extraDobleMedallon }] : []),
    ...(extraTripleMedallon ? [{ id: 'triple' as const, nombre: 'Triple', agregado: extraTripleMedallon }] : []),
  ]
  // Estos agregados representan el tamaño de la hamburguesa: se eligen de
  // forma exclusiva en la primera etapa y no se repiten en la lista de extras.
  const agregadosPrimarios = (product?.agregadosPrimarios
    ?? product?.agregados?.filter(a => (a.grupo ?? 1) === 1)
    ?? []).filter(ag => !idsExtrasMedallon.has(ag.id))
  const agregadosSecundarios = (product?.agregadosSecundarios
    ?? product?.agregados?.filter(a => a.grupo === 2)
    ?? []).filter(ag => !idsExtrasMedallon.has(ag.id))
  const tieneAgregadosPrimarios = agregadosPrimarios.length > 0
  const tieneAgregadosSecundarios = agregadosSecundarios.length > 0
  const tieneVariantes = !!(product?.variantes && product.variantes.length > 0)
  const tieneVariantesSecundarias = !!(product?.variantesSecundarias && product.variantesSecundarias.length > 0)
  const stages: CustomizationStage[] = [
    'primary',
    ...(tieneVariantesSecundarias ? ['secondary' as const] : []),
    ...(tieneIngredientes || tieneAgregadosPrimarios ? ['extrasPrimary' as const] : []),
    ...(tieneAgregadosSecundarios ? ['extrasSecondary' as const] : []),
  ]
  const stageIndex = stages.indexOf(stage)
  const hayEtapaSiguiente = stageIndex < stages.length - 1
  const isExtrasStage = stage === 'extrasPrimary' || stage === 'extrasSecondary'
  const currentExtras = stage === 'extrasSecondary' ? agregadosSecundarios : agregadosPrimarios
  const currentExtrasTitle = stage === 'extrasSecondary'
    ? (product?.tituloExtrasSecundarios || 'Extras')
    : (product?.tituloExtrasPrimarios || 'Extras')
  // Producto sin foto → diseño plano (espeja el card text-only del menú).
  const fotos = fotosDeProducto(product)
  const sinImagen = fotos.length === 0
  const multiFoto = fotos.length > 1
  const fotoIdx = foto.productoId === productId ? Math.min(foto.idx, fotos.length - 1) : 0

  // ── Navegación entre productos ──
  const lista = siblings ?? []
  const currentIndex = product ? lista.findIndex(p => p.id === product.id) : -1
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < lista.length - 1
  // Sólo se navega desde la etapa de selección (en "extras" el usuario está personalizando).
  const puedeNavegar = stage === 'primary' && addCount === 0 && currentIndex >= 0 && lista.length > 1

  const irA = (dir: number) => {
    if (!puedeNavegar) return
    const target = lista[currentIndex + dir]
    if (!target) return
    setNavDir(dir)
    arrastreFoto.set(0)
    onNavigate?.(target)
  }

  const irAFoto = (idx: number) => {
    if (idx < 0 || idx >= fotos.length) return
    setFoto({ productoId: productId, idx })
  }

  // Flechas del teclado en desktop.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && hasNext) { e.preventDefault(); irA(1) }
      else if (e.key === 'ArrowLeft' && hasPrev) { e.preventDefault(); irA(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, puedeNavegar, currentIndex, lista])

  // ── Galería ──
  // Con varias fotos, el swipe sobre la foto las recorre (la tira sigue al dedo) y, pasada la
  // última o antes de la primera, salta al producto vecino, como en las historias. Los toques en
  // los bordes de la foto también la cambian.
  const onFotoPanStart = (_e: unknown, info: PanInfo) => {
    huboPan.current = true
    panHorizontal.current = Math.abs(info.offset.x) > Math.abs(info.offset.y)
  }
  const onFotoPan = (_e: unknown, info: PanInfo) => {
    if (!panHorizontal.current) return
    const dx = info.offset.x
    const enBorde = (dx > 0 && fotoIdx === 0) || (dx < 0 && fotoIdx === fotos.length - 1)
    arrastreFoto.set(enBorde ? dx * BORDE_ELASTICO : dx)
  }
  const onFotoPanEnd = (_e: unknown, info: PanInfo) => {
    if (!panHorizontal.current) return
    panHorizontal.current = false
    const off = info.offset.x
    const vel = info.velocity.x
    const dir = off < -55 || vel < -450 ? 1 : off > 55 || vel > 450 ? -1 : 0
    const destino = fotoIdx + dir
    if (dir !== 0 && destino >= 0 && destino < fotos.length) irAFoto(destino)
    else if (puedeNavegar && ((dir === 1 && hasNext) || (dir === -1 && hasPrev))) return irA(dir)
    animate(arrastreFoto, 0, FOTO_SPRING)
  }
  const onFotoClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (huboPan.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    if (x < 0.3) irAFoto(fotoIdx - 1)
    else if (x > 0.7) irAFoto(fotoIdx + 1)
  }

  // Swipe horizontal sobre la foto (área del header) para saltar de producto.
  const onHeaderDragEnd = (_e: unknown, info: PanInfo) => {
    const off = info.offset.x
    const vel = info.velocity.x
    if ((off < -55 || vel < -450) && hasNext) irA(1)
    else if ((off > 55 || vel > 450) && hasPrev) irA(-1)
  }

  const toggleIngrediente = (id: number) =>
    setIngredientesExcluidos(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))

  const toggleAgregado = (agregado: Agregado) =>
    setAgregadosSeleccionados(prev =>
      prev.find(a => a.id === agregado.id) ? prev.filter(a => a.id !== agregado.id) : [...prev, agregado]
    )

  const variantBloqueada = stage === 'primary'
    ? tieneVariantes && !varianteSeleccionada
    : stage === 'secondary'
      ? tieneVariantesSecundarias && !varianteSecundariaSeleccionada
      : false

  // ── Cálculo de precio ──
  const precioBasePrimario = varianteSeleccionada
    ? parseFloat(varianteSeleccionada.precio)
    : parseFloat(String(product?.precio ?? 0))
  const precioBase = precioBasePrimario + (varianteSecundariaSeleccionada ? parseFloat(varianteSecundariaSeleccionada.precio) : 0)
  const tieneDescuento = !!(product?.descuento && product.descuento > 0)
  const precioUnitConDescuento = tieneDescuento ? precioBase * (1 - (product!.descuento! / 100)) : precioBase
  const precioMedallon = parseFloat(agregadoMedallonSeleccionado?.precio || '0')
  const precioAgregados = agregadosSeleccionados.reduce((sum, ag) => sum + parseFloat(ag.precio || '0'), precioMedallon)
  const total = (precioUnitConDescuento + precioAgregados) * quantity
  const totalTachado = (precioBase + precioAgregados) * quantity

  // ── Avance entre etapas ──
  // En una etapa con lista de variantes (o de medallones) no hay botón "Continuar": elegir una pasa sola
  // a la etapa siguiente. Queda el botón (y se elige sin avanzar) si ya se agregó una vez —ahí es
  // "Agregar otro igual"— o si no hay etapa siguiente —ahí es "Agregar".
  const esEtapaVariantes = (stage === 'primary' && (tieneVariantes || tieneSelectorMedallon)) || stage === 'secondary'
  const avanzaAlElegir = esEtapaVariantes && addCount === 0 && hayEtapaSiguiente
  const hayBotonPrincipal = !avanzaAlElegir
  const hayPie = hayBotonPrincipal || puedeNavegar

  const irAEtapa = (destino: CustomizationStage) => {
    setStage(destino)
    setCruzando(true)
    window.clearTimeout(cruceTimer.current)
    cruceTimer.current = window.setTimeout(() => setCruzando(false), CRUCE_MS)
  }

  const elegirVariante = (variante: Variante) => {
    if (stage === 'primary') setVarianteSeleccionada(variante)
    else setVarianteSecundariaSeleccionada(variante)
    if (avanzaAlElegir) irAEtapa(stages[stageIndex + 1])
  }

  const elegirMedallon = (id: MedallonSelection) => {
    setMedallonSeleccionado(id)
    // Si además hay variantes, la que cierra la etapa es la variante.
    if (avanzaAlElegir && !tieneVariantes) irAEtapa(stages[stageIndex + 1])
  }

  const handleContinue = () => {
    if (variantBloqueada) return
    if (addCount > 0 || stageIndex >= stages.length - 1) {
      handleAdd()
    } else {
      irAEtapa(stages[stageIndex + 1])
    }
  }

  const handleBack = () => {
    if (stageIndex > 0) irAEtapa(stages[stageIndex - 1])
  }

  const handleAdd = () => {
    if (!product) return
    const agregadosFinales = agregadoMedallonSeleccionado
      ? [agregadoMedallonSeleccionado, ...agregadosSeleccionados.filter(ag => ag.id !== agregadoMedallonSeleccionado.id)]
      : agregadosSeleccionados
    onAddToOrder(
      product,
      quantity,
      ingredientesExcluidos.length > 0 ? ingredientesExcluidos : undefined,
      agregadosFinales.length > 0 ? agregadosFinales : undefined,
      varianteSeleccionada ?? undefined,
      varianteSecundariaSeleccionada ?? undefined
    )
    const newCount = addCount + 1
    setAddCount(newCount)
    if (newCount >= 2) {
      setShowCounter(true)
      setTimeout(() => setShowCounter(false), 700)
    }
  }

  const handlePrimary = handleContinue

  // ── Resumen de lo elegido ──
  // Ocupa, desde la segunda etapa, el lugar de la descripción: medallones, variantes, extras (+) y los
  // ingredientes que se sacan, en texto chico.
  const ingredientesQuitados = (product?.ingredientes ?? [])
    .filter(ing => ingredientesExcluidos.includes(ing.id))
    .map(ing => sinCortes(enMinuscula(ing.nombre)))
  const partesResumen = [
    ...(tieneSelectorMedallon ? [sinCortes(opcionesMedallon.find(o => o.id === medallonSeleccionado)?.nombre ?? 'Simple')] : []),
    ...(varianteSeleccionada ? [sinCortes(varianteSeleccionada.nombre)] : []),
    ...(varianteSecundariaSeleccionada ? [sinCortes(varianteSecundariaSeleccionada.nombre)] : []),
    ...agregadosSeleccionados.map(ag => sinCortes(`+${ag.nombre}`)),
    ...(ingredientesQuitados.length > 0 ? [`Sin${NBSP}${ingredientesQuitados.join(', ')}`] : []),
  ]
  const resumen = partesResumen.join(`${NBSP}· `)
  const mostrarResumen = stage !== 'primary' && resumen !== ''

  const timeLeft = tieneDescuento ? formatTimeLeft(product?.descuentoFechaFin ?? null) : null
  // El nombre va con la letra de titulares de la marca (condensada): un punto más grande que en la ficha.
  const nombreLength = product?.nombre.trim().length ?? 0
  const nombreClass = nombreLength > 70 ? 'text-xl' : nombreLength > 48 ? 'text-[22px]' : nombreLength > 30 ? 'text-2xl' : 'text-[28px]'
  const nombreLargo = nombreLength > 30

  // ── Altura del drawer ──
  // Suma de lo que realmente hay: cabecera + resumen + contenido de la etapa + pie. Crece con la
  // información hasta el 100% de la pantalla (el techo es el `max-h` de DrawerContent); pasado eso,
  // el contenido de la etapa scrollea.
  const cabeceraH = sinImagen
    ? PLANO_PT + (stage !== 'primary' ? VOLVER_PLANO_H : 0) + cabeceraPlanaH
    : IMG_H - SOLAPA
  const alturaTotal = cabeceraH + (mostrarResumen ? resumenH : 0) + contenidoH + (hayPie ? pieH : 0)
  if (product && !Object.is(alturaVigente, alturaTotal)) setAlturaVigente(alturaTotal)
  const resorte = animar ? SPRING : SIN_ANIMAR

  const rowBtn = 'flex items-center justify-between rounded-2xl px-4 py-3.5 text-left transition-colors'
  // Flechas de navegación que flanquean el botón principal: chicas y en tono secundario para no
  // competir con la acción primaria. El `after:` agranda el área de toque (44 px) sin agrandar el círculo.
  const navFlankBtn = 'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-all after:absolute after:-inset-1.5 active:scale-90 disabled:opacity-35 disabled:active:scale-100'

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent aria-describedby={undefined} className="menu-delivery overflow-hidden border-none bg-background p-0 outline-none [&>div:first-child]:hidden data-[vaul-drawer-direction=bottom]:max-h-dvh lg:mx-auto lg:max-w-md lg:rounded-t-[28px]">
        <DrawerTitle className="sr-only">{product?.nombre ?? 'Producto'}</DrawerTitle>
        <motion.div
          className="relative overflow-hidden bg-background"
          initial={false}
          animate={{ height: alturaVigente }}
          transition={resorte}
        >
          {product ? (
            <>
              {/* Asa de arrastre — fija, no se desliza con el producto */}
              <div className="pointer-events-none absolute inset-x-0 top-2.5 z-40 flex justify-center">
                <div className={cn('h-1.5 w-10 rounded-full', sinImagen ? 'bg-foreground/20' : 'bg-white/60')} />
              </div>

              {/* Controles de navegación entre productos — fijos sobre la imagen */}
              <AnimatePresence>
                {puedeNavegar && (
                  <>
                    {lista.length > 1 && (
                      <motion.div
                        key="counter"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          'absolute right-3 top-3.5 z-40 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums',
                          sinImagen ? 'bg-foreground/10 text-foreground' : 'bg-black/35 text-white backdrop-blur-md'
                        )}
                      >
                        {currentIndex + 1} / {lista.length}
                      </motion.div>
                    )}
                  </>
                )}
              </AnimatePresence>

              {/* ─────────── CAPA DESLIZANTE POR PRODUCTO ───────────
                  Todo lo que cambia al pasar de un producto a otro (imagen, nombre,
                  precio y contenido) vive acá y se desliza horizontalmente. El asa y
                  los controles de navegación quedan fijos por encima. */}
              <AnimatePresence initial={false} mode="popLayout" custom={navDir}>
                <motion.div
                  key={product.id}
                  custom={navDir}
                  variants={navVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={NAV_SLIDE}
                  className="absolute inset-0"
                >
                  {/* CAPA DE IMAGEN — altura fija en ambas etapas (sólo con foto) */}
                  {!sinImagen && (
                    <div className="absolute inset-x-0 top-0 z-0 overflow-hidden bg-secondary" style={{ height: IMG_H }}>
                      {/* Tira de fotos: el contenedor externo avanza de a una foto y el interno
                          suma el arrastre del dedo, así el paso arranca donde lo soltó. */}
                      <motion.div
                        className="flex h-full"
                        initial={false}
                        animate={{ x: `${-fotoIdx * 100}%` }}
                        transition={FOTO_SPRING}
                      >
                        <motion.div className="flex h-full w-full shrink-0" style={{ x: arrastreFoto }}>
                          {fotos.map((src, i) => (
                            <img
                              key={src}
                              src={src}
                              alt={i === 0 ? product.nombre : `${product.nombre} (foto ${i + 1})`}
                              draggable={false}
                              decoding="async"
                              className="h-full w-full shrink-0 select-none object-cover"
                            />
                          ))}
                        </motion.div>
                      </motion.div>
                      {/* Gradiente inferior — separa el nombre/precio de la imagen. */}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/30 to-transparent"
                      />
                    </div>
                  )}

                  {/* Botón volver — sólo en extras, sobre la imagen (el diseño plano tiene el suyo propio) */}
                  <AnimatePresence>
                    {!sinImagen && stage !== 'primary' && (
                      <motion.button
                        key="back"
                        type="button"
                        onClick={handleBack}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-3 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition-colors active:bg-black/50"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </motion.button>
                    )}
                  </AnimatePresence>

                  {/* ─────────── COLUMNA DE CONTENIDO ─────────── */}
                  <div className="absolute inset-0 z-10 flex flex-col">
                    {/* Header: sobre la imagen (con foto) o de texto al ras (sin foto). Es también el
                        área de swipe (arrastrá de lado a lado para cambiar de producto).
                        `menu-delivery` le da la tipografía de las fichas de producto de MenuDelivery:
                        el drawer se monta en un portal, fuera de ese contenedor, y sin esto caería a
                        la fuente del sistema. */}
                    <motion.div
                      className={cn(
                        'menu-delivery group/galeria relative shrink-0 select-none',
                        (puedeNavegar || multiFoto) && 'cursor-grab touch-pan-y active:cursor-grabbing'
                      )}
                      style={sinImagen ? undefined : { height: IMG_H }}
                      // Con galería, el gesto mueve la tira de fotos (no el header) y decide entre
                      // foto y producto al soltar; sin galería, el header entero salta de producto.
                      {...(multiFoto
                        ? {
                            onPointerDown: () => { huboPan.current = false },
                            onPanStart: onFotoPanStart,
                            onPan: onFotoPan,
                            onPanEnd: onFotoPanEnd,
                            onClick: onFotoClick,
                          }
                        : {
                            drag: puedeNavegar ? 'x' as const : false,
                            dragDirectionLock: true,
                            dragConstraints: { left: 0, right: 0 },
                            dragElastic: 0.18,
                            dragSnapToOrigin: true,
                            onDragEnd: onHeaderDragEnd,
                          })}
                    >
                      {multiFoto && (
                        <>
                          {/* Indicador de fotos — centrado bajo el asa, como en las historias. */}
                          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[26px] z-20 flex justify-center gap-1">
                            {fotos.map((src, i) => (
                              <span
                                key={src}
                                className={cn(
                                  'h-1.5 rounded-full shadow-[0_0_4px_rgba(0,0,0,0.35)] transition-all duration-300',
                                  i === fotoIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/55'
                                )}
                              />
                            ))}
                          </div>
                          {/* Flechas de foto — sólo con mouse, al pasar sobre la imagen. */}
                          {[-1, 1].map(paso => {
                            const destino = fotoIdx + paso
                            if (destino < 0 || destino >= fotos.length) return null
                            return (
                              <button
                                key={paso}
                                type="button"
                                aria-label={paso < 0 ? 'Foto anterior' : 'Foto siguiente'}
                                onPointerDown={e => e.stopPropagation()}
                                onClick={e => { e.stopPropagation(); irAFoto(destino) }}
                                className={cn(
                                  'absolute top-[78px] z-20 hidden h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-md transition-opacity hover:bg-black/50 group-hover/galeria:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:flex',
                                  paso < 0 ? 'left-3' : 'right-3'
                                )}
                              >
                                {paso < 0 ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            )
                          })}
                        </>
                      )}
                      {sinImagen ? (
                        <div className="px-6 pt-9">
                          {/* Botón volver del diseño plano — al ras, no sobre foto. Su hueco crece con
                              el mismo resorte que la altura del drawer para que el contenido no salte. */}
                          <motion.div
                            className="overflow-hidden"
                            initial={false}
                            animate={{ height: stage !== 'primary' ? VOLVER_PLANO_H : 0 }}
                            transition={resorte}
                          >
                            <AnimatePresence>
                              {stage !== 'primary' && (
                                <motion.button
                                  key="back-flat"
                                  type="button"
                                  onClick={handleBack}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ duration: 0.2 }}
                                  className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground transition-colors active:bg-secondary/70"
                                >
                                  <ChevronLeft className="h-5 w-5" />
                                </motion.button>
                              )}
                            </AnimatePresence>
                          </motion.div>
                          <Medido onAltura={setCabeceraPlanaH}>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              {tieneDescuento && (
                                <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                                  {product.descuento}% OFF
                                </span>
                              )}
                              {timeLeft && (
                                <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                  <Clock className="h-3 w-3" /> Vence en {timeLeft}
                                </span>
                              )}
                            </div>
                            <div className={cn('flex gap-3', nombreLargo ? 'flex-col items-stretch gap-1' : 'items-end justify-between')}>
                              <h3 className={cn('font-alfajor min-w-0 flex-1 break-words uppercase text-foreground [overflow-wrap:anywhere]', nombreClass, 'leading-[0.92]')}>
                                {product.nombre}
                              </h3>
                              <div className={cn('shrink-0 text-right', nombreLargo && 'self-end')}>
                                {tieneDescuento && (
                                  <p className="text-[11px] font-semibold text-muted-foreground line-through opacity-70">
                                    ${formatPrecio(totalTachado)}
                                  </p>
                                )}
                                <p className={cn('text-[26px] font-bold leading-none tabular-nums', tieneDescuento ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary')}>
                                  ${formatPrecio(total)}
                                </p>
                              </div>
                            </div>
                          </Medido>
                        </div>
                      ) : (
                        <div className="absolute inset-x-0 bottom-0 px-6 pb-8">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            {tieneDescuento && (
                              <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                                {product.descuento}% OFF
                              </span>
                            )}
                            {timeLeft && (
                              <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md">
                                <Clock className="h-3 w-3" /> Vence en {timeLeft}
                              </span>
                            )}
                          </div>
                          <div className={cn('flex gap-3', nombreLargo ? 'flex-col items-stretch gap-1' : 'items-end justify-between')}>
                            <h3 className={cn('font-alfajor min-w-0 flex-1 break-words uppercase text-white drop-shadow-sm [overflow-wrap:anywhere]', nombreClass, 'leading-[0.92]')}>
                              {product.nombre}
                            </h3>
                            <div className={cn('shrink-0 text-right', nombreLargo && 'self-end')}>
                              {tieneDescuento && (
                                <p className="text-[11px] font-semibold text-white/70 line-through">
                                  ${formatPrecio(totalTachado)}
                                </p>
                              )}
                              <p className="text-[26px] font-bold leading-none tabular-nums text-[#eb623a] drop-shadow-sm">
                                ${formatPrecio(total)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>

                    {/* Hoja inferior: el contenido se cruza entre las dos etapas. Con foto se
                        superpone a la imagen (borde redondeado); sin foto va al ras. */}
                    <div className={cn(
                      'relative flex min-h-0 flex-1 flex-col bg-background',
                      !sinImagen && '-mt-5 rounded-t-[28px]'
                    )}>
                      {/* Resumen de lo elegido — desde la segunda etapa ocupa el lugar de la
                          descripción. Su alto sigue el mismo resorte que el del drawer: crece hacia
                          arriba y las filas de abajo se quedan donde está el dedo. */}
                      <motion.div
                        className="shrink-0 overflow-hidden"
                        initial={false}
                        animate={{ height: mostrarResumen ? resumenH : 0, opacity: mostrarResumen ? 1 : 0 }}
                        transition={resorte}
                      >
                        {mostrarResumen && (
                          <Medido onAltura={setResumenH}>
                            <p className="px-6 pt-6 text-[13px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">
                              {resumen}
                            </p>
                          </Medido>
                        )}
                      </motion.div>

                      {/* Área animada — misma posición y misma lógica de scroll en ambas etapas */}
                      <div className={cn('relative min-h-0 flex-1', cruzando && 'pointer-events-none')}>
                        <AnimatePresence initial={false}>
                          {!isExtrasStage ? (
                            <motion.div
                              key={`content-${stage}`}
                              initial={{ opacity: 0, x: -40 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -40 }}
                              transition={SLIDE}
                              className="absolute inset-0 flex flex-col"
                            >
                              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                                <Medido onAltura={setContenidoH} className={cn('space-y-6 px-6 pt-6', hayPie ? 'pb-4' : 'pb-8')}>
                                  {stage === 'primary' && (
                                    <p className="text-[15px] leading-relaxed text-foreground/70">
                                      {product.descripcion || 'Sin descripción.'}
                                    </p>
                                  )}

                                  {stage === 'primary' && tieneSelectorMedallon && (
                                    <div className="space-y-1">
                                      <p className="px-1 pb-1 text-[13px] font-medium text-muted-foreground">
                                        {tieneVariantes ? 'Elegí la cantidad de medallones' : (product.tituloVariantesPrimarias || 'Elegí una opción')}
                                      </p>
                                      <div
                                        className="flex flex-col gap-0.5 overflow-y-auto overscroll-contain"
                                        style={{ maxHeight: MAX_VISIBLE_VARIANTS * ROW_H }}
                                      >
                                        {opcionesMedallon.map((opcion) => {
                                          const sel = medallonSeleccionado === opcion.id
                                          const precioOpcion = parseFloat(String(product.precio || 0))
                                            + parseFloat(opcion.agregado?.precio || '0')
                                          return (
                                            <button
                                              key={opcion.id}
                                              type="button"
                                              onClick={() => elegirMedallon(opcion.id)}
                                              className={cn(rowBtn, sel ? 'bg-primary/10' : 'bg-secondary/50')}
                                            >
                                              <span className={cn('text-[15px]', sel ? 'font-semibold text-primary' : 'text-foreground')}>
                                                {opcion.nombre}
                                              </span>
                                              <span className="flex items-center gap-2">
                                                <span className={cn('text-[15px]', sel ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                                                  ${formatPrecio(precioOpcion)}
                                                </span>
                                                {sel && <Check className="h-[18px] w-[18px] text-primary" />}
                                              </span>
                                            </button>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {((stage === 'primary' && tieneVariantes) || (stage === 'secondary' && tieneVariantesSecundarias)) && (
                                    <div className="space-y-1">
                                      <p className="px-1 pb-1 text-[13px] font-medium text-muted-foreground">
                                        {stage === 'primary'
                                          ? (product.tituloVariantesPrimarias || 'Elegí una opción')
                                          : (product.tituloVariantesSecundarias || 'Elegí también una segunda opción')}
                                      </p>
                                      <div
                                        className="flex flex-col gap-0.5 overflow-y-auto overscroll-contain"
                                        style={{ maxHeight: MAX_VISIBLE_VARIANTS * ROW_H }}
                                      >
                                        {(stage === 'primary' ? product.variantes! : product.variantesSecundarias!).map((v) => {
                                          const sel = (stage === 'primary' ? varianteSeleccionada : varianteSecundariaSeleccionada)?.id === v.id
                                          return (
                                            <button
                                              key={v.id}
                                              type="button"
                                              onClick={() => elegirVariante(v)}
                                              className={cn(rowBtn, sel ? 'bg-primary/10' : 'bg-secondary/50')}
                                            >
                                              <span className={cn('text-[15px]', sel ? 'font-semibold text-primary' : 'text-foreground')}>
                                                {v.nombre}
                                              </span>
                                              <span className="flex items-center gap-2">
                                                <span className={cn('text-[15px]', sel ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                                                  {stage === 'secondary'
                                                    ? (parseFloat(v.precio) > 0 ? `+$${formatPrecio(parseFloat(v.precio))}` : 'Sin adicional')
                                                    : `$${formatPrecio(parseFloat(v.precio))}`}
                                                </span>
                                                {sel && <Check className="h-[18px] w-[18px] text-primary" />}
                                              </span>
                                            </button>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </Medido>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key={`content-${stage}`}
                              initial={{ opacity: 0, x: 40 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 40 }}
                              transition={SLIDE}
                              className="absolute inset-0 flex flex-col"
                            >
                              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                                <Medido onAltura={setContenidoH} className={cn('space-y-7 px-6 pt-6', hayPie ? 'pb-4' : 'pb-8')}>
                                  {isExtrasStage && currentExtras.length > 0 && (
                                    <div className="space-y-1">
                                      <p className="px-1 pb-1 text-lg font-bold text-foreground">
                                        {currentExtrasTitle}
                                      </p>
                                      <div className="flex flex-col gap-0.5">
                                        {currentExtras.map((ag) => {
                                          const sel = !!agregadosSeleccionados.find(a => a.id === ag.id)
                                          return (
                                            <button
                                              key={ag.id}
                                              type="button"
                                              onClick={() => toggleAgregado(ag)}
                                              className={cn(rowBtn, sel ? 'bg-primary/10' : 'bg-secondary/50')}
                                            >
                                              <span className={cn('text-[15px]', sel ? 'font-semibold text-primary' : 'text-foreground')}>
                                                {ag.nombre}
                                              </span>
                                              <span className="flex items-center gap-2">
                                                <span className={cn('text-[15px]', sel ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                                                  +${formatPrecio(parseFloat(ag.precio))}
                                                </span>
                                                {sel && <Check className="h-[18px] w-[18px] text-primary" />}
                                              </span>
                                            </button>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {stage === 'extrasPrimary' && tieneIngredientes && (
                                    <div className="space-y-1">
                                      <p className="px-1 pb-1 text-lg font-bold text-foreground">
                                        Ingredientes
                                      </p>
                                      <div className="flex flex-col gap-0.5">
                                        {product.ingredientes!.map((ing) => {
                                          const incluido = !ingredientesExcluidos.includes(ing.id)
                                          return (
                                            <button
                                              key={ing.id}
                                              type="button"
                                              onClick={() => toggleIngrediente(ing.id)}
                                              className={cn(rowBtn, incluido ? 'bg-secondary/60' : 'bg-secondary/30')}
                                            >
                                              <span
                                                className={cn(
                                                  'text-[15px]',
                                                  incluido ? 'text-foreground' : 'text-muted-foreground line-through'
                                                )}
                                              >
                                                {ing.nombre}
                                              </span>
                                              {incluido && <Check className="h-[18px] w-[18px] text-foreground/70" />}
                                            </button>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}

                                </Medido>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Pie — botón principal (muta entre Continuar y Agregar) y, cuando se puede
                          navegar entre productos, las flechas anterior/siguiente que lo flanquean.
                          En una etapa de variantes que avanza sola no hay botón: quedan sólo las
                          flechas, y si tampoco hay a dónde navegar, no hay pie. */}
                      {hayPie && (
                        <Medido onAltura={setPieH} className={cn('shrink-0 space-y-2 px-6 pb-7 pt-2', cruzando && 'pointer-events-none')}>
                          <div className={cn('flex items-center gap-2', !hayBotonPrincipal && 'justify-between')}>
                            {puedeNavegar && (
                              <button
                                type="button"
                                onClick={() => irA(-1)}
                                disabled={!hasPrev}
                                aria-label="Producto anterior"
                                className={navFlankBtn}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                            )}
                            {hayBotonPrincipal && (
                              <button
                                type="button"
                                onClick={handlePrimary}
                                disabled={!isExtrasStage && variantBloqueada}
                                className={cn(
                                  'font-alfajor relative h-14 min-w-0 flex-1 overflow-hidden rounded-2xl text-[17px] transition-all duration-300 active:scale-[0.98]',
                                  addCount > 0
                                    ? 'bg-[#eb623a] text-[#083821]'
                                    : !isExtrasStage && variantBloqueada
                                      ? 'bg-foreground/10 text-muted-foreground'
                                      : 'bg-primary text-primary-foreground'
                                )}
                              >
                                <AnimatePresence mode="wait">
                                  {showCounter ? (
                                    <motion.span
                                      key={`x${addCount}`}
                                      initial={{ scale: 0.4, opacity: 0 }}
                                      animate={{ scale: 1.1, opacity: 1 }}
                                      exit={{ scale: 1.5, opacity: 0 }}
                                      transition={{ duration: 0.25 }}
                                      className="absolute inset-0 flex items-center justify-center text-2xl font-black"
                                    >
                                      x{addCount}
                                    </motion.span>
                                  ) : addCount > 0 ? (
                                    <motion.span
                                      key="repeat"
                                      initial={{ opacity: 0, y: 8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -8 }}
                                      transition={{ duration: 0.2 }}
                                      className="absolute inset-0 flex items-center justify-center gap-2"
                                    >
                                      <Check className="h-5 w-5" /> Agregar otro igual
                                    </motion.span>
                                  ) : hayEtapaSiguiente ? (
                                    <motion.span
                                      key="continue"
                                      initial={{ opacity: 0, y: 8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -8 }}
                                      transition={{ duration: 0.2 }}
                                      className="absolute inset-0 flex items-center justify-center"
                                    >
                                      Continuar
                                    </motion.span>
                                  ) : (
                                    <motion.span
                                      key="add"
                                      initial={{ opacity: 0, y: 8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -8 }}
                                      transition={{ duration: 0.2 }}
                                      className="absolute inset-0 flex items-center justify-center"
                                    >
                                      {variantBloqueada ? 'Agregar' : `Agregar · $${formatPrecio(total)}`}
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </button>
                            )}
                            {puedeNavegar && (
                              <button
                                type="button"
                                onClick={() => irA(1)}
                                disabled={!hasNext}
                                aria-label="Producto siguiente"
                                className={navFlankBtn}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          {addCount > 0 && (
                            <motion.button
                              type="button"
                              onClick={onClose}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25 }}
                              className="font-alfajor h-14 w-full rounded-2xl bg-secondary text-[17px] text-foreground transition-all duration-300 active:scale-[0.98]"
                            >
                              Cerrar
                            </motion.button>
                          )}
                        </Medido>
                      )}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </>
          ) : (
            <div className="h-full w-full bg-background" />
          )}
        </motion.div>
      </DrawerContent>
    </Drawer>
  )
}
