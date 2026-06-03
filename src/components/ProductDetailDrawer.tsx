import { useState, useEffect } from 'react'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { motion, AnimatePresence } from 'motion/react'
import { Check, ChevronLeft, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Ingrediente {
  id: number
  nombre: string
}

interface Agregado {
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
  categoria?: string
  ingredientes?: Ingrediente[]
  agregados?: Agregado[]
  descuento?: number | null
  descuentoFechaFin?: string | null
}

interface ProductDetailDrawerProps {
  product: Product | null
  open: boolean
  onClose: () => void
  onAddToOrder: (product: Product, quantity: number, ingredientesExcluidos?: number[], agregados?: Agregado[]) => void
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

const IMG_H = 220
const SPRING = { type: 'spring' as const, stiffness: 320, damping: 34 }
const STAGE1_BASE_H = 390
const CARNE_ROW_H = 58
const CARNE_LABEL_H = 44

type MedallonKey = 'simple' | 'doble' | 'triple'

export function ProductDetailDrawer({ product, open, onClose, onAddToOrder }: ProductDetailDrawerProps) {
  const [stage, setStage] = useState<'select' | 'extras'>('select')
  const [quantity] = useState(1)
  const [ingredientesExcluidos, setIngredientesExcluidos] = useState<number[]>([])
  const [extrasSeleccionados, setExtrasSeleccionados] = useState<Agregado[]>([])
  const [medallonSeleccionado, setMedallonSeleccionado] = useState<MedallonKey>('simple')
  const [veggieSeleccionado, setVeggieSeleccionado] = useState(false)
  const [addCount, setAddCount] = useState(0)
  const [showCounter, setShowCounter] = useState(false)

  useEffect(() => {
    if (open && product) {
      setStage('select')
      setIngredientesExcluidos([])
      setExtrasSeleccionados([])
      setMedallonSeleccionado('simple')
      setVeggieSeleccionado(false)
      setAddCount(0)
      setShowCounter(false)
    }
  }, [open, product?.id])

  // Classify agregados into carne (shown in stage 1) and extras (shown in stage 2)
  const carneAgregados = product?.agregados?.filter(a =>
    a.nombre.includes('Veggie') || a.nombre.includes('Doble') || a.nombre.includes('Triple') || a.nombre.includes('Medallon Extra')
  ) || []
  const extrasAgregados = product?.agregados?.filter(a =>
    !a.nombre.includes('Veggie') && !a.nombre.includes('Doble') && !a.nombre.includes('Triple') && !a.nombre.includes('Medallon Extra')
  ) || []

  const opcionVeggie = carneAgregados.find(a => a.nombre.includes('Veggie'))
  const opcionDoble = carneAgregados.find(a => a.nombre.includes('Doble'))
  const opcionTriple = carneAgregados.find(a => a.nombre.includes('Triple'))

  const tieneCarneSelector = !!(opcionDoble || opcionTriple)
  const hasCarneSection = tieneCarneSelector || !!opcionVeggie
  const tieneIngredientes = !!(product?.ingredientes && product.ingredientes.length > 0)
  const needsStage2 = tieneIngredientes || extrasAgregados.length > 0

  const toggleIngrediente = (id: number) =>
    setIngredientesExcluidos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const toggleExtra = (agregado: Agregado) =>
    setExtrasSeleccionados(prev =>
      prev.find(a => a.id === agregado.id) ? prev.filter(a => a.id !== agregado.id) : [...prev, agregado]
    )

  // Build the final agregados array combining carne (from stage 1) + extras (from stage 2)
  const buildAgregados = (): Agregado[] => {
    const result: Agregado[] = []
    if (medallonSeleccionado === 'doble' && opcionDoble) result.push(opcionDoble)
    if (medallonSeleccionado === 'triple' && opcionTriple) result.push(opcionTriple)
    if (veggieSeleccionado && opcionVeggie) result.push(opcionVeggie)
    result.push(...extrasSeleccionados)
    return result
  }

  // Price calculation
  const precioBase = parseFloat(String(product?.precio ?? 0))
  const tieneDescuento = !!(product?.descuento && product.descuento > 0)
  const precioConDescuento = tieneDescuento ? precioBase * (1 - product!.descuento! / 100) : precioBase
  const precioMedallon = medallonSeleccionado === 'doble' && opcionDoble
    ? parseFloat(opcionDoble.precio)
    : medallonSeleccionado === 'triple' && opcionTriple
      ? parseFloat(opcionTriple.precio)
      : 0
  const precioVeggie = veggieSeleccionado && opcionVeggie ? parseFloat(opcionVeggie.precio) : 0
  const precioExtras = extrasSeleccionados.reduce((sum, ag) => sum + parseFloat(ag.precio || '0'), 0)
  const total = (precioConDescuento + precioMedallon + precioVeggie + precioExtras) * quantity
  const totalTachado = (precioBase + precioMedallon + precioVeggie + precioExtras) * quantity

  const handleContinue = () => {
    if (addCount > 0 || !needsStage2) handleAdd()
    else setStage('extras')
  }

  const handleAdd = () => {
    if (!product) return
    const agregados = buildAgregados()
    onAddToOrder(
      product,
      quantity,
      ingredientesExcluidos.length > 0 ? ingredientesExcluidos : undefined,
      agregados.length > 0 ? agregados : undefined
    )
    const newCount = addCount + 1
    setAddCount(newCount)
    if (newCount >= 2) {
      setShowCounter(true)
      setTimeout(() => setShowCounter(false), 700)
    }
  }

  const timeLeft = tieneDescuento ? formatTimeLeft(product?.descuentoFechaFin ?? null) : null

  // Height calculation
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const carneSectionRows = (tieneCarneSelector ? 3 : 0) + (opcionVeggie ? 1 : 0) // Simple + Doble + Triple + Veggie
  const stage1Height = Math.min(
    STAGE1_BASE_H + (hasCarneSection ? CARNE_LABEL_H + carneSectionRows * CARNE_ROW_H : 0),
    Math.round(vh * 0.85)
  )
  const stage2Height = Math.round(vh * 0.92)
  const drawerHeight = stage === 'select' ? stage1Height : stage2Height

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="overflow-hidden border-none bg-background p-0 outline-none [&>div:first-child]:hidden">
        <motion.div
          className="relative overflow-hidden bg-background"
          animate={{ height: drawerHeight }}
          transition={SPRING}
        >
          {product ? (
            <>
              {/* ── IMAGE LAYER ── always present, grows to fill stage 2 */}
              <motion.div
                className="absolute inset-x-0 top-0 z-0 overflow-hidden bg-secondary"
                animate={{ height: stage === 'select' ? IMG_H : stage2Height }}
                transition={SPRING}
              >
                <motion.div
                  className="h-full w-full"
                  animate={{ scale: stage === 'extras' ? 1.06 : 1 }}
                  transition={{ type: 'tween', duration: 0.6, ease: 'easeOut' }}
                >
                  {product.imagenUrl ? (
                    <img
                      src={product.imagenUrl}
                      alt={product.nombre}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/25 via-primary/10 to-background">
                      <span className="text-[26vw] font-black leading-none text-primary/15 select-none">
                        {product.nombre.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </motion.div>
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/30 to-transparent"
                  animate={{ opacity: stage === 'select' ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>

              {/* Drag handle */}
              <div className="pointer-events-none absolute inset-x-0 top-2.5 z-30 flex justify-center">
                <div className="h-1.5 w-10 rounded-full bg-white/60" />
              </div>

              {/* ── STAGE 1: SELECT ── */}
              <AnimatePresence>
                {stage === 'select' && (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 z-10 flex flex-col"
                  >
                    {/* Image spacer: name + price anchored to the gradient */}
                    <div className="relative shrink-0" style={{ height: IMG_H }}>
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
                        <div className="flex items-end justify-between gap-4">
                          <h3 className="text-[28px] font-bold leading-tight tracking-tight text-white drop-shadow-sm">
                            {product.nombre}
                          </h3>
                          <div className="shrink-0 text-right">
                            {tieneDescuento && (
                              <p className="text-sm font-medium text-white/60 line-through">
                                ${totalTachado.toFixed(2)}
                              </p>
                            )}
                            <p className="text-2xl font-bold text-white drop-shadow-sm">
                              ${total.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom sheet: description + carne selector */}
                    <div className="relative -mt-5 flex min-h-0 flex-1 flex-col rounded-t-[28px] bg-background">
                      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 pb-4 pt-6">
                        <p className="text-[15px] leading-relaxed text-foreground/70">
                          {product.descripcion || 'Sin descripción.'}
                        </p>

                        {/* Carne selector: replaces variants for alfajor */}
                        {hasCarneSection && (
                          <div className="space-y-1">
                            <p className="px-1 pb-1 text-[13px] font-medium text-muted-foreground">
                              Elegí tu opción
                            </p>
                            <div
                              className="flex flex-col gap-0.5"
                            >
                              {/* Medallón options (mutually exclusive radio-style) */}
                              {tieneCarneSelector && (
                                <>
                                  {/* Simple — always the default */}
                                  <button
                                    type="button"
                                    onClick={() => setMedallonSeleccionado('simple')}
                                    className={cn(
                                      'flex items-center justify-between rounded-2xl px-4 py-3.5 text-left transition-colors',
                                      medallonSeleccionado === 'simple' ? 'bg-primary/10' : 'bg-secondary/50'
                                    )}
                                  >
                                    <span className={cn('text-[15px]', medallonSeleccionado === 'simple' ? 'font-semibold text-primary' : 'text-foreground')}>
                                      Simple
                                    </span>
                                    <span className="flex items-center gap-2">
                                      <span className={cn('text-[15px]', medallonSeleccionado === 'simple' ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                                        Incluido
                                      </span>
                                      {medallonSeleccionado === 'simple' && <Check className="h-[18px] w-[18px] text-primary" />}
                                    </span>
                                  </button>

                                  {opcionDoble && (
                                    <button
                                      type="button"
                                      onClick={() => setMedallonSeleccionado('doble')}
                                      className={cn(
                                        'flex items-center justify-between rounded-2xl px-4 py-3.5 text-left transition-colors',
                                        medallonSeleccionado === 'doble' ? 'bg-primary/10' : 'bg-secondary/50'
                                      )}
                                    >
                                      <span className={cn('text-[15px]', medallonSeleccionado === 'doble' ? 'font-semibold text-primary' : 'text-foreground')}>
                                        {opcionDoble.nombre}
                                      </span>
                                      <span className="flex items-center gap-2">
                                        <span className={cn('text-[15px]', medallonSeleccionado === 'doble' ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                                          +${parseFloat(opcionDoble.precio).toFixed(2)}
                                        </span>
                                        {medallonSeleccionado === 'doble' && <Check className="h-[18px] w-[18px] text-primary" />}
                                      </span>
                                    </button>
                                  )}

                                  {opcionTriple && (
                                    <button
                                      type="button"
                                      onClick={() => setMedallonSeleccionado('triple')}
                                      className={cn(
                                        'flex items-center justify-between rounded-2xl px-4 py-3.5 text-left transition-colors',
                                        medallonSeleccionado === 'triple' ? 'bg-primary/10' : 'bg-secondary/50'
                                      )}
                                    >
                                      <span className={cn('text-[15px]', medallonSeleccionado === 'triple' ? 'font-semibold text-primary' : 'text-foreground')}>
                                        {opcionTriple.nombre}
                                      </span>
                                      <span className="flex items-center gap-2">
                                        <span className={cn('text-[15px]', medallonSeleccionado === 'triple' ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                                          +${parseFloat(opcionTriple.precio).toFixed(2)}
                                        </span>
                                        {medallonSeleccionado === 'triple' && <Check className="h-[18px] w-[18px] text-primary" />}
                                      </span>
                                    </button>
                                  )}
                                </>
                              )}

                              {/* Divider between medallón and veggie */}
                              {tieneCarneSelector && opcionVeggie && (
                                <div className="h-px w-full bg-border my-1" />
                              )}

                              {/* Veggie — independent toggle, combinable with any medallón */}
                              {opcionVeggie && (
                                <button
                                  type="button"
                                  onClick={() => setVeggieSeleccionado(v => !v)}
                                  className={cn(
                                    'flex items-center justify-between rounded-2xl px-4 py-3.5 text-left transition-colors',
                                    veggieSeleccionado ? 'bg-primary/10' : 'bg-secondary/50'
                                  )}
                                >
                                  <span className={cn('text-[15px]', veggieSeleccionado ? 'font-semibold text-primary' : 'text-foreground')}>
                                    {opcionVeggie.nombre}
                                  </span>
                                  <span className="flex items-center gap-2">
                                    <span className={cn('text-[15px]', veggieSeleccionado ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                                      +${parseFloat(opcionVeggie.precio).toFixed(2)}
                                    </span>
                                    {veggieSeleccionado && <Check className="h-[18px] w-[18px] text-primary" />}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Continue / Add button */}
                      <div className="shrink-0 px-6 pb-7 pt-2 space-y-2">
                        <button
                          type="button"
                          onClick={handleContinue}
                          className={cn(
                            'relative h-14 w-full overflow-hidden rounded-2xl text-[17px] font-semibold transition-all duration-300 active:scale-[0.98]',
                            addCount > 0
                              ? 'bg-emerald-500 text-white'
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
                                className="absolute inset-0 flex items-center justify-center font-black text-2xl"
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
                            ) : needsStage2 ? (
                              <motion.span key="continue" className="absolute inset-0 flex items-center justify-center">
                                Continuar
                              </motion.span>
                            ) : (
                              <motion.span key="add" className="absolute inset-0 flex items-center justify-center">
                                Agregar · ${total.toFixed(2)}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </button>
                        {addCount > 0 && (
                          <motion.button
                            type="button"
                            onClick={onClose}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className="h-14 w-full rounded-2xl text-[17px] font-semibold bg-secondary text-foreground transition-all duration-300 active:scale-[0.98]"
                          >
                            Cerrar
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── STAGE 2: EXTRAS ──
                  Glassmorphism overlay on the full image.
                  Shows ingredientes to remove + non-carne extras. */}
              <AnimatePresence>
                {stage === 'extras' && (
                  <motion.div
                    key="extras"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 z-20 flex flex-col text-white"
                  >
                    {/* Frosted glass layer */}
                    <motion.div
                      className="absolute inset-0 bg-black/60"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      initial={{ backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' } as any}
                      animate={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' } as any}
                      exit={{ backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' } as any}
                      transition={{ duration: 0.45 }}
                    />

                    <div className="relative z-10 flex h-full flex-col">
                      {/* Header with back button */}
                      <div className="flex shrink-0 items-center gap-3 px-4 pt-5">
                        <button
                          type="button"
                          onClick={() => setStage('select')}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/5 text-foreground transition-colors active:bg-foreground/10"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                      </div>

                      <h3 className="truncate text-[19px] m-auto font-extrabold tracking-tight text-white pb-2">
                        {product.nombre}
                      </h3>
                      <div className="flex items-center font-bold justify-center gap-2 pb-4">
                        ${total.toFixed(2)}
                      </div>

                      {/* Scrollable options */}
                      <div className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 pb-4 pt-1">
                        {tieneIngredientes && (
                          <div className="space-y-1">
                            <p className="px-1 pb-1 text-lg font-bold">
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
                                    className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-left transition-colors ${incluido ? 'bg-black/10' : 'bg-black/5'}`}
                                  >
                                    <span
                                      className={cn(
                                        'text-[15px]',
                                        incluido ? 'text-white' : 'text-neutral-400 line-through'
                                      )}
                                    >
                                      {ing.nombre}
                                    </span>
                                    {incluido && (
                                      <Check className="h-[18px] w-[18px] text-white" />
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {extrasAgregados.length > 0 && (
                          <div className="space-y-1">
                            <p className="px-1 pb-1 text-lg font-bold">
                              Extras
                            </p>
                            <div className="flex flex-col gap-0.5">
                              {extrasAgregados.map((ag) => {
                                const sel = !!extrasSeleccionados.find(a => a.id === ag.id)
                                return (
                                  <button
                                    key={ag.id}
                                    type="button"
                                    onClick={() => toggleExtra(ag)}
                                    className={cn(
                                      'flex items-center mb-1 justify-between rounded-2xl px-4 py-3.5 text-left transition-colors',
                                      sel ? 'bg-black/20' : 'bg-black/5'
                                    )}
                                  >
                                    <span className={cn('text-[15px]', sel ? 'font-semibold text-primary' : 'text-foreground')}>
                                      {ag.nombre}
                                    </span>
                                    <span className="flex items-center gap-2">
                                      <span className={cn('text-[15px]', sel ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                                        +${parseFloat(ag.precio).toFixed(2)}
                                      </span>
                                      {sel && <Check className="h-[18px] w-[18px] text-primary" />}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer: add button */}
                      <div className="flex shrink-0 flex-col gap-2 px-5 pb-7 pt-2">
                        <button
                          type="button"
                          onClick={handleAdd}
                          className={cn(
                            'relative h-14 w-full overflow-hidden rounded-2xl text-[17px] font-semibold transition-all duration-300 active:scale-[0.98]',
                            addCount > 0 ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground'
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
                                className="absolute inset-0 flex items-center justify-center font-black text-2xl"
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
                            ) : (
                              <motion.span
                                key="add"
                                className="absolute inset-0 flex items-center justify-center"
                              >
                                Agregar
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </button>
                        {addCount > 0 && (
                          <motion.button
                            type="button"
                            onClick={onClose}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className="h-14 w-full rounded-2xl text-[17px] font-semibold bg-secondary text-foreground transition-all duration-300 active:scale-[0.98]"
                          >
                            Cerrar
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
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
