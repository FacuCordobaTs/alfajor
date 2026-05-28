import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { MapPin, Store, Truck, AlertTriangle, Loader2, Pencil, Check, X, Tag, Home, Building2, Clock, CreditCard, Wallet, Zap } from 'lucide-react'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import { AddressMapPreview } from '@/components/AddressMapPreview'
import type { CheckoutDeliveryData, CheckoutEditSemaphore } from '@/store/mesaStore'

type MetodoPublico = { id: string; label: string; automatico: boolean }

interface CheckoutDeliveryGrupalProps {
  restauranteId: number
  restauranteUsername?: string | null
  itemsTotal: string
  totalItems: number
  onConfirmarClick: () => void
  sendMessage: (msg: any) => void
  clienteId: string
  clienteNombre: string
  checkoutData: CheckoutDeliveryData | null
  editSemaphore: CheckoutEditSemaphore | null
  restauranteDireccion?: string
}

export function CheckoutDeliveryGrupal({
  restauranteId,
  restauranteUsername,
  itemsTotal,
  totalItems,
  onConfirmarClick,
  sendMessage,
  clienteId,
  clienteNombre,
  checkoutData,
  editSemaphore,
  restauranteDireccion
}: CheckoutDeliveryGrupalProps) {
  const [tipoPedido, setTipoPedido] = useState<'delivery' | 'takeaway'>(checkoutData?.tipoPedido || 'delivery')
  const [nombre, setNombre] = useState(checkoutData?.nombre || localStorage.getItem('cliente_nombre') || '')
  const [telefono, setTelefono] = useState(checkoutData?.telefono || localStorage.getItem('cliente_telefono') || '')
  const [direccion, setDireccion] = useState(checkoutData?.direccion || '')
  const [lat, setLat] = useState<number | null>(checkoutData?.lat ?? null)
  const [lng, setLng] = useState<number | null>(checkoutData?.lng ?? null)
  const [notas, setNotas] = useState(checkoutData?.notas || '')
  const [tipoDomicilio, setTipoDomicilio] = useState<'casa' | 'departamento' | null>(checkoutData?.tipoDomicilio ?? null)
  const [piso, setPiso] = useState('')
  const [numeroDepartamento, setNumeroDepartamento] = useState('')
  const [programarPedido, setProgramarPedido] = useState(!!(checkoutData?.horarioProgramado))
  const [horarioProgramado, setHorarioProgramado] = useState(checkoutData?.horarioProgramado || '')
  const [metodoPago, setMetodoPago] = useState<string | null>(checkoutData?.metodoPago ?? null)
  const [sucursales, setSucursales] = useState<{ id: number; nombre: string; direccion: string | null }[]>([])
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<number | null>(checkoutData?.sucursalId ?? null)
  const [sucursalDelivery, setSucursalDelivery] = useState<number | null>(null)
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<MetodoPublico[]>([])
  const [restauranteData, setRestauranteData] = useState<any>(null)
  const [isLoadingRestaurante, setIsLoadingRestaurante] = useState(false)

  const [zonaDeliveryFee, setZonaDeliveryFee] = useState<number | null>(checkoutData ? checkoutData.deliveryFee : null)
  const [zonaNombre, setZonaNombre] = useState<string | null>(checkoutData?.zonaNombre ?? null)
  const [isCheckingZona, setIsCheckingZona] = useState(false)
  const [fueraDeZona, setFueraDeZona] = useState(false)
  const [codigoInput, setCodigoInput] = useState('')
  const [codigoDescuentoId, setCodigoDescuentoId] = useState<number | null>(checkoutData?.codigoDescuentoId ?? null)
  const [montoDescuento, setMontoDescuento] = useState(checkoutData?.montoDescuento ?? 0)
  const [validandoCodigo, setValidandoCodigo] = useState(false)
  const [codigoError, setCodigoError] = useState<string | null>(null)

  const estoyEditando = editSemaphore?.clienteId === clienteId
  const alguienEditando = editSemaphore && !estoyEditando

  const codigoDescuentoEnabled = !restauranteData || restauranteData.codigoDescuentoEnabled === true
  const deliveryFee = zonaDeliveryFee !== null ? zonaDeliveryFee : 0
  const itemsTotalNum = parseFloat(itemsTotal)
  const subtotalConEnvio = tipoPedido === 'delivery' ? itemsTotalNum + deliveryFee : itemsTotalNum
  const total = Math.max(0, subtotalConEnvio - montoDescuento)

  // Fetch restaurante data when editing starts
  useEffect(() => {
    if (!restauranteUsername || !estoyEditando || restauranteData) return
    const fetchRestaurante = async () => {
      setIsLoadingRestaurante(true)
      try {
        const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
        const response = await fetch(`${url}/public/restaurante/${restauranteUsername}`)
        const data = await response.json()
        if (data.success && data.data?.restaurante) {
          const r = data.data.restaurante
          setAvailablePaymentMethods(Array.isArray(r.metodosPago) ? r.metodosPago : [])
          setRestauranteData(r)
          const s = Array.isArray(data.data.sucursales) ? data.data.sucursales : []
          setSucursales(s)
          if (s.length === 1) setSucursalSeleccionada(s[0].id)
          const delEn = r.deliveryEnabled !== false
          const tkEn = r.takeawayEnabled !== false
          if (delEn && !tkEn) setTipoPedido('delivery')
          else if (!delEn && tkEn) setTipoPedido('takeaway')
        }
      } catch { /* ignore */ }
      finally { setIsLoadingRestaurante(false) }
    }
    fetchRestaurante()
  }, [restauranteUsername, estoyEditando])

  // Auto-select first payment method when methods load
  useEffect(() => {
    if (!availablePaymentMethods.length) return
    const allowed = new Set(availablePaymentMethods.map(m => m.id))
    setMetodoPago(prev => {
      if (prev && allowed.has(prev)) return prev
      return availablePaymentMethods[0].id
    })
  }, [availablePaymentMethods])

  // Sync from checkoutData changes (another user saved)
  useEffect(() => {
    if (!checkoutData) return
    setTipoPedido(checkoutData.tipoPedido)
    setNombre(checkoutData.nombre)
    setTelefono(checkoutData.telefono)
    setDireccion(checkoutData.direccion)
    setLat(checkoutData.lat)
    setLng(checkoutData.lng)
    setNotas(checkoutData.notas)
    setZonaDeliveryFee(checkoutData.deliveryFee)
    setZonaNombre(checkoutData.zonaNombre)
    setCodigoDescuentoId(checkoutData.codigoDescuentoId ?? null)
    setMontoDescuento(checkoutData.montoDescuento ?? 0)
    if (checkoutData.metodoPago) setMetodoPago(checkoutData.metodoPago)
    if (checkoutData.horarioProgramado) {
      setProgramarPedido(true)
      setHorarioProgramado(checkoutData.horarioProgramado)
    }
    if (checkoutData.tipoDomicilio) setTipoDomicilio(checkoutData.tipoDomicilio)
    if (checkoutData.sucursalId) setSucursalSeleccionada(checkoutData.sucursalId)
  }, [checkoutData?.nombre, checkoutData?.telefono, checkoutData?.direccion, checkoutData?.tipoPedido, checkoutData?.notas, checkoutData?.deliveryFee, checkoutData?.zonaNombre, checkoutData?.codigoDescuentoId, checkoutData?.montoDescuento, checkoutData?.metodoPago, checkoutData?.horarioProgramado, checkoutData?.tipoDomicilio, checkoutData?.sucursalId])

  useEffect(() => {
    if (lat === null || lng === null || !restauranteId) {
      if (!checkoutData?.deliveryFee) {
        setZonaDeliveryFee(null)
        setZonaNombre(null)
      }
      setFueraDeZona(false)
      setSucursalDelivery(null)
      return
    }
    const checkZona = async () => {
      setIsCheckingZona(true)
      setFueraDeZona(false)
      try {
        const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
        const res = await fetch(`${url}/public/restaurante/${restauranteId}/check-zona?lat=${lat}&lng=${lng}`)
        const data = await res.json()
        if (data.code === 'FUERA_DE_ZONA') {
          setFueraDeZona(true)
          setZonaDeliveryFee(null)
          setZonaNombre(null)
          setSucursalDelivery(null)
        } else if (data.success) {
          setFueraDeZona(false)
          setZonaDeliveryFee(parseFloat(data.deliveryFee))
          setZonaNombre(data.zonaNombre || null)
          setSucursalDelivery(data.sucursalId ?? null)
        }
      } catch {
        setZonaDeliveryFee(null)
        setZonaNombre(null)
        setSucursalDelivery(null)
      } finally {
        setIsCheckingZona(false)
      }
    }
    checkZona()
  }, [lat, lng, restauranteId])

  const handleAddressChange = useCallback((address: string, newLat: number | null, newLng: number | null) => {
    setDireccion(address)
    setLat(newLat)
    setLng(newLng)
    if (newLat === null || newLng === null) {
      setZonaDeliveryFee(null)
      setZonaNombre(null)
      setFueraDeZona(false)
      setSucursalDelivery(null)
    }
  }, [])

  const handleIniciarEdicion = () => {
    sendMessage({ type: 'INICIAR_EDICION_CHECKOUT', payload: { clienteId, clienteNombre } })
  }

  const handleCancelarEdicion = () => {
    sendMessage({ type: 'CANCELAR_EDICION_CHECKOUT', payload: { clienteId, clienteNombre } })
  }

  const handleValidarCodigo = async () => {
    if (!codigoInput.trim() || !restauranteId) return
    setValidandoCodigo(true)
    setCodigoError(null)
    try {
      const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
      const res = await fetch(`${url}/public/descuentos/validar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restauranteId, codigo: codigoInput.trim().toUpperCase(), totalCarrito: subtotalConEnvio }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        setCodigoDescuentoId(data.data.codigoDescuentoId)
        setMontoDescuento(parseFloat(data.data.montoDescuento))
        toast.success(`Código aplicado: -$${parseFloat(data.data.montoDescuento).toFixed(0)}`)
      } else {
        setCodigoError(data.message || 'Código no válido')
        setCodigoDescuentoId(null)
        setMontoDescuento(0)
      }
    } catch {
      setCodigoError('Error al validar')
      setCodigoDescuentoId(null)
      setMontoDescuento(0)
    } finally {
      setValidandoCodigo(false)
    }
  }

  const quitarCodigo = () => {
    setCodigoInput('')
    setCodigoDescuentoId(null)
    setMontoDescuento(0)
    setCodigoError(null)
  }

  const handleGuardarEdicion = () => {
    if (tipoPedido === 'delivery' && (!nombre.trim() || !telefono.trim() || !direccion.trim())) {
      toast.error('Completa nombre, celular y dirección')
      return
    }
    if (tipoPedido === 'takeaway' && (!nombre.trim() || !telefono.trim())) {
      toast.error('Completa nombre y celular')
      return
    }
    if (tipoPedido === 'delivery' && (lat === null || lng === null)) {
      toast.error('Selecciona una dirección de las sugerencias')
      return
    }
    if (tipoPedido === 'delivery' && fueraDeZona) {
      toast.error('La dirección está fuera del área de delivery')
      return
    }
    if (tipoPedido === 'delivery' && !tipoDomicilio) {
      toast.error('Indicá si es casa o departamento')
      return
    }
    if (tipoPedido === 'delivery' && tipoDomicilio === 'departamento' && (!piso.trim() || !numeroDepartamento.trim())) {
      toast.error('Ingresá el piso y el número de departamento')
      return
    }
    if (tipoPedido === 'takeaway' && sucursales.length > 1 && !sucursalSeleccionada) {
      toast.error('Seleccioná un local de retiro')
      return
    }
    if (programarPedido && !horarioProgramado.trim()) {
      toast.error('Ingresa el horario para tu pedido')
      return
    }

    const notasLimpias = notas.replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '').trim()
    const notasFinal = (tipoPedido === 'delivery' && tipoDomicilio === 'departamento')
      ? (notasLimpias ? `Piso ${piso.trim()} Dpto ${numeroDepartamento.trim()}\n${notasLimpias}` : `Piso ${piso.trim()} Dpto ${numeroDepartamento.trim()}`)
      : notasLimpias

    const sucursalId = tipoPedido === 'delivery'
      ? (sucursalDelivery ?? null)
      : (sucursales.length === 1 ? sucursales[0].id : sucursalSeleccionada) ?? null

    const updates: Record<string, unknown> = {
      tipoPedido,
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      direccion: tipoPedido === 'delivery' ? direccion.trim() : '',
      lat: tipoPedido === 'delivery' ? lat : null,
      lng: tipoPedido === 'delivery' ? lng : null,
      notas: notasFinal,
      tipoDomicilio: tipoPedido === 'delivery' ? tipoDomicilio : null,
      deliveryFee,
      zonaNombre,
      itemsTotal,
      total: total.toFixed(2),
      codigoDescuentoId: codigoDescuentoId ?? null,
      montoDescuento,
      metodoPago: metodoPago ?? null,
      horarioProgramado: programarPedido ? horarioProgramado : '',
      sucursalId,
    }

    sendMessage({ type: 'MODIFICAR_CHECKOUT', payload: { clienteId, updates } })
    sendMessage({ type: 'ACEPTAR_EDICION_CHECKOUT', payload: { clienteId, clienteNombre } })

    localStorage.setItem('cliente_nombre', nombre.trim())
    localStorage.setItem('cliente_telefono', telefono.trim())
  }

  const handleConfirmarPedido = () => {
    if (!checkoutData) {
      toast.error('Completa los datos de envío antes de confirmar')
      return
    }
    if (!checkoutData.nombre?.trim() || !checkoutData.telefono?.trim()) {
      toast.error('Faltan nombre o celular')
      return
    }
    if (checkoutData.tipoPedido === 'delivery' && !checkoutData.direccion?.trim()) {
      toast.error('Falta la dirección de entrega')
      return
    }
    onConfirmarClick()
  }

  const paymentTitle = (m: MetodoPublico) => {
    switch (m.id) {
      case 'cash': return 'Efectivo'
      case 'manual_transfer': return 'Transferencia manual'
      case 'transferencia_automatica_cucuru':
      case 'transferencia_automatica_talo': return 'Transferencia automática'
      case 'mercadopago_checkout': return 'Mercado Pago'
      case 'mercadopago_bricks': return 'Tarjeta (Bricks)'
      default: return m.label
    }
  }

  const datosCompletos = checkoutData &&
    checkoutData.nombre?.trim() &&
    checkoutData.telefono?.trim() &&
    (checkoutData.tipoPedido === 'takeaway' || (checkoutData.direccion?.trim() && checkoutData.lat != null && checkoutData.lng != null))

  const delEn = restauranteData ? restauranteData.deliveryEnabled !== false : true
  const tkEn = restauranteData ? restauranteData.takeawayEnabled !== false : true

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="font-semibold text-base">Datos de envío</h3>
        <p className="text-xs text-muted-foreground">Completa la información para el pedido grupal</p>
      </div>

      {alguienEditando && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 rounded-xl border border-amber-500/30">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
            {editSemaphore?.clienteNombre} está editando
          </span>
        </div>
      )}

      {(!checkoutData || estoyEditando) && !alguienEditando && (
        <>
          {!estoyEditando && !checkoutData && (
            <Button variant="outline" className="w-full rounded-xl" onClick={handleIniciarEdicion}>
              <Pencil className="w-4 h-4 mr-2" />
              Completar datos de envío
            </Button>
          )}
          {(estoyEditando || checkoutData) && (
            <>
              {/* Tipo de pedido */}
              <section className="space-y-3">
                <Label className="text-sm">¿Cómo van a recibir el pedido?</Label>
                {restauranteData && !delEn && !tkEn ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-xl border border-destructive/30">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    <p className="text-sm text-destructive font-medium">El local no está aceptando pedidos ahora.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl transition-colors ${restauranteData && !delEn ? 'opacity-40 cursor-not-allowed border-border' : `cursor-pointer ${tipoPedido === 'delivery' ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50'}`}`}
                      onClick={() => (!restauranteData || delEn) && setTipoPedido('delivery')}
                    >
                      <MapPin className={`w-6 h-6 mb-1 ${tipoPedido === 'delivery' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <Label className="cursor-pointer text-sm font-medium">Delivery</Label>
                    </div>
                    <div
                      className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl transition-colors ${restauranteData && !tkEn ? 'opacity-40 cursor-not-allowed border-border' : `cursor-pointer ${tipoPedido === 'takeaway' ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50'}`}`}
                      onClick={() => (!restauranteData || tkEn) && setTipoPedido('takeaway')}
                    >
                      <Store className={`w-6 h-6 mb-1 ${tipoPedido === 'takeaway' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <Label className="cursor-pointer text-sm font-medium">Take Away</Label>
                    </div>
                  </div>
                )}
              </section>

              {/* Sucursal selector for takeaway with multiple branches */}
              {tipoPedido === 'takeaway' && sucursales.length > 1 && (
                <section className="space-y-2">
                  <Label className="text-sm">¿En qué local retirás?</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {sucursales.map(s => (
                      <div
                        key={s.id}
                        onClick={() => setSucursalSeleccionada(s.id)}
                        className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-colors ${sucursalSeleccionada === s.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50'}`}
                      >
                        <Store className={`w-4 h-4 shrink-0 ${sucursalSeleccionada === s.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="font-semibold text-sm">{s.nombre}</p>
                          {s.direccion && <p className="text-xs text-muted-foreground">{s.direccion}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Datos personales */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre-grupal">Nombre de quien recibe</Label>
                  <Input id="nombre-grupal" placeholder="Ej: Juan Perez" className="h-11 rounded-xl" value={nombre} onChange={e => setNombre(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="telefono-grupal">Celular (WhatsApp)</Label>
                  <Input id="telefono-grupal" type="tel" placeholder="Ej: 5491112345678" className="h-11 rounded-xl" value={telefono} onChange={e => setTelefono(e.target.value.replace(/\D/g, ''))} />
                </div>

                {/* Delivery address */}
                {tipoPedido === 'delivery' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="direccion-grupal">Dirección de entrega</Label>
                    <AddressAutocomplete value={direccion} onChange={handleAddressChange} placeholder="Ej: Espora 811, Santa Fe" />
                    {lat !== null && lng !== null && <AddressMapPreview lat={lat} lng={lng} />}
                    {lat !== null && lng !== null && direccion && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {isCheckingZona ? (
                          <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-xl border border-border/50">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Verificando zona de delivery...</span>
                          </div>
                        ) : fueraDeZona ? (
                          <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-xl border border-destructive/30">
                            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                            <span className="text-xs text-destructive font-medium">Fuera del área de delivery. Probá otra dirección o Take Away.</span>
                          </div>
                        ) : zonaDeliveryFee !== null ? (
                          <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Envío{zonaNombre ? ` (${zonaNombre})` : ''}</span>
                            </div>
                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                              {deliveryFee === 0 ? 'GRATIS' : `$${deliveryFee.toFixed(0)}`}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}

                {/* Casa / Departamento */}
                {tipoPedido === 'delivery' && (
                  <div className="space-y-2 pt-2 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
                    <Label className="text-sm">¿Es casa o departamento?</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`flex flex-col items-center gap-1.5 p-3 border-2 rounded-xl cursor-pointer transition-colors ${tipoDomicilio === 'casa' ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50'}`}
                        onClick={() => { setTipoDomicilio('casa'); setPiso(''); setNumeroDepartamento('') }}
                      >
                        <Home className={`w-6 h-6 ${tipoDomicilio === 'casa' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-semibold ${tipoDomicilio === 'casa' ? 'text-primary' : 'text-foreground'}`}>Casa</span>
                      </div>
                      <div
                        className={`flex flex-col items-center gap-1.5 p-3 border-2 rounded-xl cursor-pointer transition-colors ${tipoDomicilio === 'departamento' ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50'}`}
                        onClick={() => setTipoDomicilio('departamento')}
                      >
                        <Building2 className={`w-6 h-6 ${tipoDomicilio === 'departamento' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-semibold ${tipoDomicilio === 'departamento' ? 'text-primary' : 'text-foreground'}`}>Departamento</span>
                      </div>
                    </div>
                    {tipoDomicilio === 'departamento' && (
                      <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="piso-grupal">Piso</Label>
                          <Input id="piso-grupal" placeholder="Ej: 4" className="h-10 rounded-xl" value={piso} onChange={e => setPiso(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="depto-grupal">Depto</Label>
                          <Input id="depto-grupal" placeholder="Ej: C" className="h-10 rounded-xl" value={numeroDepartamento} onChange={e => setNumeroDepartamento(e.target.value.toUpperCase())} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Takeaway - pickup address */}
                {tipoPedido === 'takeaway' && restauranteDireccion && sucursales.length <= 1 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/20">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-xs font-medium text-primary/80">Retira en {restauranteDireccion}</span>
                  </div>
                )}

                {/* Notas */}
                <div className="space-y-1.5">
                  <Label htmlFor="notas-grupal">Notas adicionales <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Textarea id="notas-grupal" placeholder="Ej: El timbre no anda..." className="min-h-[80px] rounded-xl resize-none text-sm" value={notas} onChange={(e: any) => setNotas(e.target.value)} />
                </div>

                {/* Programar pedido */}
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div
                    className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-colors ${programarPedido ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50'}`}
                    onClick={() => { setProgramarPedido(!programarPedido); if (programarPedido) setHorarioProgramado('') }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock className={`w-5 h-5 ${programarPedido ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <p className={`font-semibold text-sm ${programarPedido ? 'text-primary' : 'text-foreground'}`}>Programar para después</p>
                        <p className="text-xs text-muted-foreground">Indicá a qué hora querés recibirlo</p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${programarPedido ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                      {programarPedido && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                    </div>
                  </div>
                  {programarPedido && (
                    <div className="animate-in fade-in slide-in-from-top-2 space-y-1.5">
                      <Label htmlFor="horario-grupal">¿A qué hora lo querés?</Label>
                      <input
                        id="horario-grupal"
                        type="time"
                        className="w-full h-11 rounded-xl border border-input bg-background px-4 text-base font-semibold text-foreground"
                        value={horarioProgramado}
                        onChange={e => setHorarioProgramado(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Código de descuento */}
                {codigoDescuentoEnabled && (
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    <Label htmlFor="codigo-grupal">Código de descuento <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                    {codigoDescuentoId ? (
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Descuento: -${montoDescuento.toFixed(0)}</span>
                        </div>
                        <button type="button" onClick={quitarCodigo} className="p-1 rounded hover:bg-emerald-500/20 text-muted-foreground hover:text-destructive">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          id="codigo-grupal"
                          placeholder="Ej: CODIGO10"
                          className="h-10 rounded-xl font-mono uppercase text-sm"
                          value={codigoInput}
                          onChange={e => { setCodigoInput(e.target.value.toUpperCase()); setCodigoError(null) }}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleValidarCodigo())}
                        />
                        <Button type="button" variant="outline" size="sm" className="rounded-xl shrink-0 h-10" onClick={handleValidarCodigo} disabled={validandoCodigo || !codigoInput.trim()}>
                          {validandoCodigo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Aplicar'}
                        </Button>
                      </div>
                    )}
                    {codigoError && <p className="text-xs text-destructive font-medium">{codigoError}</p>}
                  </div>
                )}

                {/* Métodos de pago */}
                {!isLoadingRestaurante && availablePaymentMethods.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-border/50 animate-in fade-in slide-in-from-bottom-2">
                    <Label className="text-sm font-bold">Método de pago</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {availablePaymentMethods.map(m => {
                        const selected = metodoPago === m.id
                        const showAuto = m.automatico && (
                          m.id === 'transferencia_automatica_cucuru' ||
                          m.id === 'transferencia_automatica_talo' ||
                          m.id === 'mercadopago_bricks' ||
                          m.id === 'mercadopago_checkout'
                        )
                        return (
                          <div
                            key={m.id}
                            className={`relative flex flex-col items-center justify-center gap-1 p-3 border-2 rounded-xl cursor-pointer hover:bg-secondary/50 transition-colors ${selected
                              ? m.id === 'cash' ? 'border-emerald-500 bg-emerald-500/5'
                                : m.id.startsWith('mercadopago') ? 'border-[#009EE3] bg-[#009EE3]/5'
                                : 'border-purple-500 bg-purple-500/5'
                              : 'border-border'}`}
                            onClick={() => setMetodoPago(m.id)}
                          >
                            {showAuto && (
                              <div className="absolute -top-2 bg-linear-to-r from-purple-600 to-indigo-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
                                <Zap className="w-2.5 h-2.5 fill-current" />
                                AUTO
                              </div>
                            )}
                            {m.id === 'mercadopago_checkout' && <Wallet className={`w-5 h-5 mt-1 ${selected ? 'text-[#009EE3]' : 'text-muted-foreground'}`} />}
                            {m.id === 'mercadopago_bricks' && <CreditCard className={`w-5 h-5 mt-1 ${selected ? 'text-[#009EE3]' : 'text-muted-foreground'}`} />}
                            <Label className="cursor-pointer font-semibold text-center text-xs leading-tight px-1">
                              {paymentTitle(m)}
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleCancelarEdicion} className="flex-1 rounded-xl">
                  <X className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleGuardarEdicion} className="flex-1 rounded-xl" disabled={tipoPedido === 'delivery' && (isCheckingZona || fueraDeZona)}>
                  <Check className="w-4 h-4 mr-1" />
                  Guardar
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {/* Read-only view */}
      {checkoutData && !estoyEditando && !alguienEditando && (
        <div className="bg-secondary/40 p-4 rounded-2xl border border-border space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">Datos guardados</span>
            <Button variant="outline" size="sm" onClick={handleIniciarEdicion} className="text-xs h-8 shrink-0">
              <Pencil className="w-3.5 h-3.5 mr-1" />
              Editar
            </Button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className={`flex items-center justify-center p-2 rounded-lg border bg-muted/30 ${checkoutData.tipoPedido === 'delivery' ? 'border-primary/30' : 'border-border'}`}>
                <span className="text-xs font-medium text-muted-foreground">Delivery</span>
              </div>
              <div className={`flex items-center justify-center p-2 rounded-lg border bg-muted/30 ${checkoutData.tipoPedido === 'takeaway' ? 'border-primary/30' : 'border-border'}`}>
                <span className="text-xs font-medium text-muted-foreground">Take Away</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Nombre</p>
              <p className="text-sm font-semibold">{checkoutData.nombre}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Celular</p>
              <p className="text-sm font-semibold">{checkoutData.telefono}</p>
            </div>
            {checkoutData.tipoPedido === 'delivery' && checkoutData.direccion && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Dirección</p>
                <p className="text-sm font-semibold">{checkoutData.direccion}</p>
                {checkoutData.tipoDomicilio && (
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{checkoutData.tipoDomicilio}</p>
                )}
                {(checkoutData.deliveryFee ?? 0) > 0 && (
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                    Envío: ${checkoutData.deliveryFee.toFixed(0)}{checkoutData.zonaNombre ? ` (${checkoutData.zonaNombre})` : ''}
                  </p>
                )}
              </div>
            )}
            {checkoutData.metodoPago && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Método de pago</p>
                <p className="text-sm font-semibold">{checkoutData.metodoPago.replace(/_/g, ' ')}</p>
              </div>
            )}
            {checkoutData.horarioProgramado && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Programado para las <span className="font-semibold text-foreground">{checkoutData.horarioProgramado}</span></p>
              </div>
            )}
            {(checkoutData.montoDescuento ?? 0) > 0 && (
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                Descuento: -${(checkoutData.montoDescuento ?? 0).toFixed(0)}
              </p>
            )}
            {checkoutData.notas && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Notas</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{checkoutData.notas}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Total summary */}
      <div className="bg-secondary/50 rounded-xl p-4 border border-border/50 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
          <span className="font-medium">${itemsTotal}</span>
        </div>
        {checkoutData?.tipoPedido === 'delivery' && (checkoutData.deliveryFee ?? 0) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery</span>
            <span className="font-medium">${checkoutData.deliveryFee.toFixed(2)}</span>
          </div>
        )}
        {(checkoutData?.montoDescuento ?? montoDescuento) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Descuento</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">-${(checkoutData?.montoDescuento ?? montoDescuento).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base pt-2 border-t border-border/50">
          <span>Total</span>
          <span>${checkoutData?.total || total.toFixed(2)}</span>
        </div>
      </div>

      {datosCompletos ? (
        <Button className="w-full h-12 font-bold rounded-xl" size="lg" onClick={handleConfirmarPedido}>
          Confirmar Pedido
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">
          {!checkoutData ? 'Completa los datos de envío para continuar' : 'Esperando que se completen los datos...'}
        </p>
      )}
    </div>
  )
}
