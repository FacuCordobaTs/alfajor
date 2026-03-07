import { useState, useEffect } from 'react'
import {
  Drawer,
  DrawerContent
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Utensils } from 'lucide-react'

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
}

interface ProductDetailDrawerProps {
  product: Product | null
  open: boolean
  onClose: () => void
  onAddToOrder: (product: Product, quantity: number, ingredientesExcluidos?: number[], agregados?: Agregado[]) => void
}

export function ProductDetailDrawer({ product, open, onClose, onAddToOrder }: ProductDetailDrawerProps) {
  const [quantity, setQuantity] = useState(1)
  const [ingredientesExcluidos, setIngredientesExcluidos] = useState<number[]>([])
  const [agregadosSeleccionados, setAgregadosSeleccionados] = useState<Agregado[]>([])

  // Resetear estado cuando se abre/cierra el drawer o cambia el producto
  useEffect(() => {
    if (open && product) {
      setIngredientesExcluidos([])
      setAgregadosSeleccionados([])
      setQuantity(1)
    }
  }, [open, product?.id])

  // Inicialmente todos los ingredientes están incluidos (ninguno excluido)
  // Al hacer clic, se excluye o se vuelve a incluir
  const toggleIngrediente = (ingredienteId: number) => {
    setIngredientesExcluidos(prev => {
      if (prev.includes(ingredienteId)) {
        // Si estaba excluido, lo incluimos de nuevo (lo removemos de la lista de excluidos)
        return prev.filter(id => id !== ingredienteId)
      } else {
        // Si estaba incluido, lo excluimos (lo agregamos a la lista de excluidos)
        return [...prev, ingredienteId]
      }
    })
  }

  // Verificar si un ingrediente está incluido (no está en la lista de excluidos)
  const isIngredienteIncluido = (ingredienteId: number) => {
    return !ingredientesExcluidos.includes(ingredienteId)
  }

  const handleAdd = () => {
    if (!product) return
    onAddToOrder(product, quantity, ingredientesExcluidos.length > 0 ? ingredientesExcluidos : undefined, agregadosSeleccionados.length > 0 ? agregadosSeleccionados : undefined)
    setQuantity(1)
    setIngredientesExcluidos([])
    setAgregadosSeleccionados([])
    onClose()
  }

  const tieneIngredientes = product?.ingredientes && product.ingredientes.length > 0
  const tieneAgregados = product?.agregados && product.agregados.length > 0

  const toggleAgregado = (agregado: Agregado) => {
    setAgregadosSeleccionados(prev => {
      if (prev.find(a => a.id === agregado.id)) {
        return prev.filter(a => a.id !== agregado.id)
      } else {
        return [...prev, agregado]
      }
    })
  }

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      {/* 1. Fixed height set to 75vh (3/4 of screen) and flex-col layout */}
      <DrawerContent className="h-[80vh] flex flex-col overflow-hidden border-none outline-none">
        {product ? (
          <>
            {/* 2. Image Container: flex-1 allows it to grow/shrink. min-h-0 is crucial for flex-shrink to work */}
            <div className="relative flex-1 min-h-0 w-full bg-secondary overflow-hidden">
              {product.imagenUrl ? (
                <img
                  src={product.imagenUrl}
                  alt={product.nombre}
                  className="absolute inset-0 w-full h-full object-cover animate-in fade-in zoom-in-95 duration-1000 ease-out"
                />
              ) : (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center animate-in fade-in zoom-in-95 duration-1000 ease-out">
                  <Utensils className="w-20 h-20 text-primary/30" />
                </div>
              )}
              {/* Overlay gradiente suave desde abajo para evitar cortes bruscos */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background via-background/60 to-transparent" />
            </div>

            {/* 3. Content Container: shrink-0 ensures this area doesn't get squished by the image */}
            <div className="p-6 space-y-4 shrink-0 bg-background relative z-10 -mt-8 rounded-t-3xl shadow-[0_-15px_30px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_-15px_30px_-15px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-8 fade-in duration-700 ease-out fill-mode-both">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-2xl font-bold text-foreground leading-tight">{product.nombre}</h3>
                    {product.descuento && product.descuento > 0 && (
                      <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wide shadow-sm">
                        {product.descuento}% OFF
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{product.categoria || 'Sin categoría'}</p>
                </div>
                <div className="text-right">
                  {product.descuento && product.descuento > 0 ? (
                    <>
                      <p className="text-sm text-muted-foreground line-through">${(parseFloat(String(product.precio)) * quantity).toFixed(2)}</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${(parseFloat(String(product.precio)) * (1 - product.descuento / 100) * quantity).toFixed(2)}</p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-primary">${(parseFloat(String(product.precio)) * quantity).toFixed(2)}</p>
                  )}
                </div>
              </div>

              {/* Description: We use line-clamp to ensure the text doesn't push the layout if it's exceptionally long */}
              <div className="space-y-1.5 pt-2 border-t border-border/50">
                <h4 className="font-semibold text-sm text-foreground">Descripción</h4>
                <p className="text-sm text-foreground/60 leading-relaxed line-clamp-3">
                  {product.descripcion || 'Sin descripción'}
                </p>
              </div>

              {/* Botones de Modificación y Extras */}
              <div className="flex gap-3 pt-2">
                {tieneIngredientes && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1 whitespace-normal h-auto py-2">
                        Modificar Ingredientes
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[400px] w-[90vw] rounded-2xl max-h-[85vh] overflow-hidden flex flex-col">
                      <DialogHeader className="shrink-0">
                        <DialogTitle className="text-left">Confirma los ingredientes incluidos</DialogTitle>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto p-1 space-y-3">
                        <div className="space-y-2 border rounded-lg p-3">
                          {product.ingredientes?.map((ingrediente) => {
                            const estaIncluido = isIngredienteIncluido(ingrediente.id)
                            return (
                              <div
                                key={ingrediente.id}
                                className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${estaIncluido
                                  ? 'bg-primary/10 border border-primary/30'
                                  : 'bg-destructive/10 border border-destructive/30'
                                  }`}
                                onClick={() => toggleIngrediente(ingrediente.id)}
                              >
                                <Checkbox checked={estaIncluido} />
                                <span className={`text-sm flex-1 ${estaIncluido ? '' : 'line-through text-muted-foreground'}`}>
                                  {ingrediente.nombre}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                        {ingredientesExcluidos.length > 0 && (
                          <p className="text-xs text-primary/80 font-medium text-center">
                            {ingredientesExcluidos.length} ingrediente{ingredientesExcluidos.length !== 1 ? 's' : ''} excluido{ingredientesExcluidos.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {tieneAgregados && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1 whitespace-normal h-auto py-2">
                        Agregar Extras
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[400px] w-[90vw] rounded-2xl max-h-[85vh] overflow-hidden flex flex-col">
                      <DialogHeader className="shrink-0">
                        <DialogTitle className="text-left">Agregados Opcionales</DialogTitle>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto p-1 space-y-3">
                        <div className="space-y-2 border rounded-lg p-3">
                          {product.agregados?.map((agregado) => {
                            const estaSeleccionado = !!agregadosSeleccionados.find(a => a.id === agregado.id)
                            return (
                              <div
                                key={agregado.id}
                                className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${estaSeleccionado
                                  ? 'bg-primary/10 border border-primary/30'
                                  : 'bg-background hover:bg-muted border'
                                  }`}
                                onClick={() => toggleAgregado(agregado)}
                              >
                                <Checkbox checked={estaSeleccionado} />
                                <span className="text-sm flex-1 font-medium text-foreground">
                                  {agregado.nombre}
                                </span>
                                <span className="text-sm text-muted-foreground">+${parseFloat(agregado.precio).toFixed(2)}</span>
                              </div>
                            )
                          })}
                        </div>
                        {agregadosSeleccionados.length > 0 && (
                          <p className="text-xs text-primary/80 font-medium text-center">
                            {agregadosSeleccionados.length} extra{agregadosSeleccionados.length !== 1 ? 's' : ''} seleccionado{agregadosSeleccionados.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {/* Total Amount & Add Button */}
              <div className="flex items-center justify-between pt-4 border-t border-border">

                <Button
                  size="lg"
                  onClick={handleAdd}
                  className="rounded-2xl px-8 h-14 bg-primary hover:bg-primary/90 font-bold w-full transition-all duration-200 active:scale-[0.98] shadow-lg shadow-primary/20"
                >
                  Agregar al pedido
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full w-full bg-background" />
        )}
      </DrawerContent>
    </Drawer>
  )
}