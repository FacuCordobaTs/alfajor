import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ArrowLeft, Loader2, MapPin, Store, Zap, Truck, AlertTriangle, Package, Tag, X, CreditCard, Wallet } from 'lucide-react'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import { MisPedidosDrawer } from '@/components/MisPedidosDrawer'

type MetodoPublico = { id: string; label: string; automatico: boolean }

const CheckoutDelivery = () => {
    const navigate = useNavigate()
    const username = 'alfajor'

    const [cart, setCart] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const [tipoPedido, setTipoPedido] = useState<'delivery' | 'takeaway'>('delivery')
    const [nombre, setNombre] = useState(localStorage.getItem('cliente_nombre') || '')
    const [telefono, setTelefono] = useState(localStorage.getItem('cliente_telefono') || '')
    const [direccion, setDireccion] = useState(localStorage.getItem('cliente_direccion') || '')
    const [lat, setLat] = useState<number | null>(() => {
        const saved = localStorage.getItem('cliente_lat')
        return saved ? parseFloat(saved) : null
    })
    const [lng, setLng] = useState<number | null>(() => {
        const saved = localStorage.getItem('cliente_lng')
        return saved ? parseFloat(saved) : null
    })
    const [notas, setNotas] = useState('')

    // Zona de delivery dinámica
    const [zonaDeliveryFee, setZonaDeliveryFee] = useState<number | null>(null)
    const [zonaNombre, setZonaNombre] = useState<string | null>(null)
    const [isCheckingZona, setIsCheckingZona] = useState(false)
    const [fueraDeZona, setFueraDeZona] = useState(false)

    const hasSavedInfo = !!(localStorage.getItem('cliente_nombre') && localStorage.getItem('cliente_telefono'))
    const [editMode, setEditMode] = useState(!hasSavedInfo)

    const [availablePaymentMethods, setAvailablePaymentMethods] = useState<MetodoPublico[]>([])
    const [metodoPago, setMetodoPago] = useState<string | null>(null)
    const [restauranteData, setRestauranteData] = useState<any>(null)
    const [isLoadingRestaurante, setIsLoadingRestaurante] = useState(true)
    const [misPedidosOpen, setMisPedidosOpen] = useState(false)
    const codigoDescuentoEnabled = restauranteData?.codigoDescuentoEnabled === true

    const [codigoInput, setCodigoInput] = useState('')
    const [codigoDescuentoId, setCodigoDescuentoId] = useState<number | null>(null)
    const [montoDescuento, setMontoDescuento] = useState(0)
    const [validandoCodigo, setValidandoCodigo] = useState(false)
    const [codigoError, setCodigoError] = useState<string | null>(null)

    useEffect(() => {
        const fetchRestaurante = async () => {
            try {
                const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
                const response = await fetch(`${url}/public/restaurante/${username}`)
                const data = await response.json()
                if (data.success && data.data.restaurante) {
                    const r = data.data.restaurante
                    const methods: MetodoPublico[] = Array.isArray(r.metodosPago) ? r.metodosPago : []
                    setAvailablePaymentMethods(methods)
                    setRestauranteData(r)
                }
            } catch (err) {
                console.error('Error fetching restaurante data', err)
            } finally {
                setIsLoadingRestaurante(false)
            }
        }
        if (username) fetchRestaurante()
    }, [username])

    useEffect(() => {
        const savedCart = localStorage.getItem(`deliveryCart_${username}`)
        if (savedCart) {
            setCart(JSON.parse(savedCart))
        } else {
            navigate(`/`)
        }
    }, [username, navigate])

    useEffect(() => {
        if (isLoadingRestaurante) return
        if (!availablePaymentMethods.length) {
            setMetodoPago(null)
            return
        }
        const allowed = new Set(availablePaymentMethods.map((m) => m.id))
        setMetodoPago((prev) => {
            if (prev && allowed.has(prev)) return prev
            return availablePaymentMethods[0].id
        })
    }, [isLoadingRestaurante, availablePaymentMethods])

    const paymentTitle = (m: MetodoPublico) => {
        switch (m.id) {
            case 'cash':
                return 'Efectivo'
            case 'manual_transfer':
                return 'Transferencia manual (enviar comprobante)'
            case 'transferencia_automatica_cucuru':
            case 'transferencia_automatica_talo':
                return 'Transferencia automática'
            case 'mercadopago_checkout':
                return 'Mercado Pago Checkout'
            case 'mercadopago_bricks':
                return 'Tarjeta (Bricks)'
            default:
                return m.label
        }
    }

    const globalDeliveryFee = cart?.deliveryFee ? parseFloat(cart.deliveryFee) : 0
    const deliveryFee = zonaDeliveryFee !== null ? zonaDeliveryFee : globalDeliveryFee
    const itemsTotal = cart?.items?.reduce((sum: number, item: any) => sum + (parseFloat(item.precio) * item.cantidad), 0) || 0
    const subtotalConEnvio = tipoPedido === 'delivery' ? itemsTotal + deliveryFee : itemsTotal
    const total = Math.max(0, subtotalConEnvio - montoDescuento)

    const handleValidarCodigo = async () => {
        if (!codigoInput.trim() || !cart?.restauranteId) return
        setValidandoCodigo(true)
        setCodigoError(null)
        try {
            const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
            const res = await fetch(`${url}/public/descuentos/validar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restauranteId: cart.restauranteId,
                    codigo: codigoInput.trim().toUpperCase(),
                    totalCarrito: subtotalConEnvio,
                }),
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

    useEffect(() => {
        if (!codigoDescuentoEnabled) {
            quitarCodigo()
        }
    }, [codigoDescuentoEnabled])

    // Check zona when lat/lng change
    useEffect(() => {
        if (lat === null || lng === null || !cart?.restauranteId) {
            setZonaDeliveryFee(null)
            setZonaNombre(null)
            setFueraDeZona(false)
            return
        }

        const checkZona = async () => {
            setIsCheckingZona(true)
            setFueraDeZona(false)
            try {
                const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
                const res = await fetch(`${url}/public/restaurante/${cart.restauranteId}/check-zona?lat=${lat}&lng=${lng}`)
                const data = await res.json()

                if (data.code === 'FUERA_DE_ZONA') {
                    setFueraDeZona(true)
                    setZonaDeliveryFee(null)
                    setZonaNombre(null)
                } else if (data.success) {
                    setFueraDeZona(false)
                    setZonaDeliveryFee(parseFloat(data.deliveryFee))
                    setZonaNombre(data.zonaNombre || null)
                }
            } catch {
                // Silently fallback to global fee
                setZonaDeliveryFee(null)
                setZonaNombre(null)
            } finally {
                setIsCheckingZona(false)
            }
        }

        checkZona()
    }, [lat, lng, cart?.restauranteId])

    const handleAddressChange = useCallback((address: string, newLat: number | null, newLng: number | null) => {
        setDireccion(address)
        setLat(newLat)
        setLng(newLng)
        // Reset zone state when address changes without coordinates
        if (newLat === null || newLng === null) {
            setZonaDeliveryFee(null)
            setZonaNombre(null)
            setFueraDeZona(false)
        }
    }, [])

    const handleConfirm = async () => {
        if (!nombre.trim()) return toast.error('Ingresa tu nombre')
        if (!telefono.trim()) return toast.error('Ingresa tu celular')
        if (tipoPedido === 'delivery' && !direccion.trim()) return toast.error('Ingresa tu dirección')
        if (tipoPedido === 'delivery' && (lat === null || lng === null)) return toast.error('Selecciona una dirección de las sugerencias')
        const allowedIds = new Set(availablePaymentMethods.map((m) => m.id))
        if (!isLoadingRestaurante && (!metodoPago || !allowedIds.has(metodoPago))) {
            return toast.error('Selecciona un método de pago')
        }

        setLoading(true)
        try {
            const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
            const endpoint = tipoPedido === 'delivery' ? '/public/delivery/create' : '/public/takeaway/create'

            const payload: any = {
                restauranteId: cart.restauranteId,
                nombreCliente: nombre,
                telefono: telefono,
                notas: notas.replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '').trim(),
                items: cart.items.map((i: any) => ({
                    productoId: i.productoId,
                    cantidad: i.cantidad,
                    ingredientesExcluidos: i.ingredientesExcluidos,
                    agregados: i.agregados || [],
                    esCanjePuntos: i.esCanjePuntos || false
                }))
            }

            payload.metodoPago = metodoPago
            if (codigoDescuentoId) {
                payload.codigoDescuentoId = codigoDescuentoId
            }

            if (tipoPedido === 'delivery') {
                payload.direccion = direccion
                payload.lat = lat
                payload.lng = lng
            }

            const res = await fetch(`${url}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()
            if (data.success) {
                // Save client info for future purchases
                localStorage.setItem('cliente_nombre', nombre)
                localStorage.setItem('cliente_telefono', telefono)
                if (tipoPedido === 'delivery') {
                    localStorage.setItem('cliente_direccion', direccion)
                    if (lat !== null) localStorage.setItem('cliente_lat', lat.toString())
                    if (lng !== null) localStorage.setItem('cliente_lng', lng.toString())
                }

                localStorage.removeItem(`deliveryCart_${username}`)
                // Save info about the created order for the success page
                sessionStorage.setItem('deliveryOrderInfo', JSON.stringify({
                    pedidoId: data.data.id,
                    tipoPedido,
                    total: data.data.total ? parseFloat(data.data.total) : total,
                    items: cart.items,
                    metodoPago,
                    nombreCliente: nombre.trim(),
                    aliasDinamico: data.data.aliasDinamico,
                    cvuDinamico: data.data.cvuDinamico,
                    deliveryFee: data.data.deliveryFee,
                    zonaNombre: data.data.zonaNombre,
                    direccion: tipoPedido === 'delivery' ? direccion : null,
                    montoDescuento: montoDescuento > 0 ? montoDescuento : undefined,
                }))
                navigate(`/success`)
            } else {
                if (data.code === 'FUERA_DE_ZONA') {
                    toast.error('Fuera de zona', {
                        description: 'Tu dirección está fuera del área de delivery de este local. Probá con otra dirección o elegí Take Away.',
                        duration: 6000
                    })
                } else {
                    toast.error(data.message)
                }
            }
        } catch (error) {
            toast.error('Ocurrió un error al enviar el pedido')
        } finally {
            setLoading(false)
        }
    }

    const cachedThemeStr = sessionStorage.getItem(`theme_${username}`)
    const cachedTheme = cachedThemeStr ? JSON.parse(cachedThemeStr) : null

    const primario = restauranteData?.colorPrimario || cachedTheme?.primario
    const secundario = restauranteData?.colorSecundario || cachedTheme?.secundario

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

    if (!cart) return null

    return (
        <div className="min-h-screen bg-background font-sans selection:bg-primary/20 pb-10">
            {themeStyles}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50">
                <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary" onClick={() => navigate(`/`)}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <span className="font-semibold">Checkout</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setMisPedidosOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-primary hover:bg-primary/10 transition-colors border border-primary/20"
                        >
                            <Package className="w-3.5 h-3.5" />
                            Mis Pedidos
                        </button>
                        <ThemeToggle />
                    </div>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-5 pt-6 space-y-8">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">Completa tus datos</h1>
                    <p className="text-muted-foreground text-sm">Para enviar tu pedido a preparar</p>

                    {(restauranteData?.direccion && tipoPedido == 'takeaway') && (
                        <div className="flex items-center gap-2 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-full border border-primary/20 text-muted-foreground shadow-sm max-w-full">
                                <span className="p-1 bg-background rounded-full shrink-0 shadow-sm border border-border/50">
                                    <MapPin className="w-3.5 h-3.5 text-primary" />
                                </span>
                                <span className="text-sm font-medium truncate text-primary/80">Retira en <strong className="text-primary">{restauranteData.direccion}</strong></span>
                            </div>
                        </div>
                    )}
                </div>

                <section className="space-y-4">
                    <Label className="text-base">¿Cómo vas a recibir tu pedido?</Label>
                    <RadioGroup defaultValue="delivery" value={tipoPedido} onValueChange={(v: any) => setTipoPedido(v)} className="grid grid-cols-2 gap-4">
                        <div className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer hover:bg-secondary/50 transition-colors ${tipoPedido === 'delivery' ? 'border-primary bg-primary/5' : 'border-border'}`} onClick={() => setTipoPedido('delivery')}>
                            <MapPin className={`w-8 h-8 mb-2 ${tipoPedido === 'delivery' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <Label className="cursor-pointer font-semibold mb-1">Delivery</Label>
                            <span className="text-xs text-muted-foreground text-center">Te lo llevamos</span>
                        </div>
                        <div className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer hover:bg-secondary/50 transition-colors ${tipoPedido === 'takeaway' ? 'border-primary bg-primary/5' : 'border-border'}`} onClick={() => setTipoPedido('takeaway')}>
                            <Store className={`w-8 h-8 mb-2 ${tipoPedido === 'takeaway' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <Label className="cursor-pointer font-semibold mb-1">Take Away</Label>
                            <span className="text-xs text-muted-foreground text-center">Lo pasas a buscar</span>
                        </div>
                    </RadioGroup>
                </section>
                <section className="space-y-4">
                    {editMode ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Tu Nombre</Label>
                                <Input id="nombre" placeholder="Ej: Juan Perez" className="h-12 rounded-xl" value={nombre} onChange={e => setNombre(e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="telefono">Celular (WhatsApp)</Label>
                                <Input id="telefono" type="tel" placeholder="Ej: +54 9 11 1234-5678" className="h-12 rounded-xl" value={telefono} onChange={e => setTelefono(e.target.value)} />
                            </div>

                            {tipoPedido === 'delivery' && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <Label htmlFor="direccion">Dirección de entrega</Label>
                                    <AddressAutocomplete
                                        value={direccion}
                                        onChange={handleAddressChange}
                                        placeholder="Ej: Necochea 3601, Santa Fe"
                                    />
                                    {/* Zone status after address selection */}
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
                                                    <span className="text-xs text-destructive font-medium">Tu dirección está fuera del área de delivery. Probá otra dirección o Take Away.</span>
                                                </div>
                                            ) : zonaDeliveryFee !== null ? (
                                                <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                                                    <div className="flex items-center gap-2">
                                                        <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                                            Envío
                                                        </span>
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
                        </div>
                    ) : (
                        <div className="bg-secondary/40 p-5 rounded-2xl border border-border space-y-3 relative group">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditMode(true)}
                                className="absolute top-4 right-4 text-xs h-8"
                            >
                                Editar
                            </Button>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Nombre</p>
                                <p className="font-semibold text-foreground">{nombre}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Celular</p>
                                <p className="font-semibold text-foreground">{telefono}</p>
                            </div>
                            {tipoPedido === 'delivery' && (
                                <div className="animate-in fade-in slide-in-from-top-2 pt-2 border-t border-border/50 space-y-2">
                                    <p className="text-sm text-muted-foreground mb-1">Dirección de entrega</p>
                                    <div className="flex items-start gap-2">
                                        <p className="font-semibold text-foreground flex-1">
                                            {direccion || <span className="text-destructive font-medium text-xs">Falta dirección. Presiona Editar.</span>}
                                        </p>
                                        {lat !== null && lng !== null && direccion && (
                                            <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">GPS</span>
                                            </div>
                                        )}
                                    </div>
                                    {lat !== null && lng !== null && direccion && !isCheckingZona && (
                                        <div className="animate-in fade-in duration-300">
                                            {fueraDeZona ? (
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 rounded-lg border border-destructive/30">
                                                    <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                                                    <span className="text-xs text-destructive font-medium">Fuera del área de delivery</span>
                                                </div>
                                            ) : zonaDeliveryFee !== null ? (
                                                <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                                                    <div className="flex items-center gap-1.5">
                                                        <Truck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                                            {zonaNombre || 'Envío'}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                                        {deliveryFee === 0 ? 'GRATIS' : `$${deliveryFee.toFixed(0)}`}
                                                    </span>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-2 pt-4 border-t border-border/50">
                        <Label htmlFor="notas">Notas adicionales <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                        <Textarea id="notas" placeholder="Ej: El timbre no anda, Piso 9 Departamento 1" className="min-h-[100px] rounded-xl resize-none" value={notas} onChange={(e: any) => setNotas(e.target.value)} />
                    </div>

                    {codigoDescuentoEnabled && (
                        <div className="space-y-2 pt-4 border-t border-border/50">
                            <Label htmlFor="codigo">Código de descuento <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                            {codigoDescuentoId ? (
                                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                                    <div className="flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <span className="font-medium text-emerald-700 dark:text-emerald-300">Descuento aplicado: -${montoDescuento.toFixed(0)}</span>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={quitarCodigo} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Input
                                        id="codigo"
                                        placeholder="Ej: ALFAJOROPEN"
                                        className="h-11 rounded-xl font-mono uppercase"
                                        value={codigoInput}
                                        onChange={(e) => { setCodigoInput(e.target.value.toUpperCase()); setCodigoError(null) }}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleValidarCodigo())}
                                    />
                                    <Button variant="outline" className="rounded-xl shrink-0" onClick={handleValidarCodigo} disabled={validandoCodigo || !codigoInput.trim()}>
                                        {validandoCodigo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                                    </Button>
                                </div>
                            )}
                            {codigoError && <p className="text-xs text-destructive font-medium">{codigoError}</p>}
                        </div>
                    )}

                    {!isLoadingRestaurante && (
                        <div className="space-y-4 pt-4 border-t border-border/50 animate-in fade-in slide-in-from-bottom-2">
                            <Label className="text-base font-bold">Método de pago</Label>
                            {availablePaymentMethods.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Este local no tiene métodos de pago habilitados por ahora. Contactá al restaurante.
                                </p>
                            ) : (
                                <RadioGroup
                                    value={metodoPago || ''}
                                    onValueChange={(v: string) => setMetodoPago(v)}
                                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                                >
                                    {availablePaymentMethods.map((m) => {
                                        const selected = metodoPago === m.id
                                        const showAuto =
                                            m.automatico &&
                                            (m.id === 'transferencia_automatica_cucuru' ||
                                                m.id === 'transferencia_automatica_talo' ||
                                                m.id === 'mercadopago_bricks' ||
                                                m.id === 'mercadopago_checkout')
                                        const borderMp =
                                            m.id === 'mercadopago_bricks' || m.id === 'mercadopago_checkout'
                                        return (
                                            <div
                                                key={m.id}
                                                className={`relative flex flex-col items-center justify-center gap-1 p-4 w-full border-2 rounded-2xl cursor-pointer hover:bg-secondary/50 transition-colors ${
                                                    selected
                                                        ? borderMp
                                                            ? 'border-[#009EE3] bg-[#009EE3]/5'
                                                            : m.id === 'cash'
                                                              ? 'border-emerald-500 bg-emerald-500/5'
                                                              : 'border-purple-500 bg-purple-500/5'
                                                        : 'border-border'
                                                }`}
                                                onClick={() => setMetodoPago(m.id)}
                                            >
                                                {showAuto && (
                                                    <div className="absolute -top-2.5 bg-linear-to-r from-purple-600 to-indigo-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                                                        <Zap className="w-3 h-3 fill-current" />
                                                        AUTOMÁTICO
                                                    </div>
                                                )}
                                                {m.id === 'mercadopago_checkout' && (
                                                    <Wallet
                                                        className={`w-6 h-6 mt-1 ${selected ? 'text-[#009EE3]' : 'text-muted-foreground'}`}
                                                    />
                                                )}
                                                {m.id === 'mercadopago_bricks' && (
                                                    <CreditCard
                                                        className={`w-6 h-6 mt-1 ${selected ? 'text-[#009EE3]' : 'text-muted-foreground'}`}
                                                    />
                                                )}
                                                <Label className="cursor-pointer font-semibold text-center text-sm leading-tight px-1">
                                                    {paymentTitle(m)}
                                                </Label>
                                                {m.id === 'mercadopago_checkout' && (
                                                    <span className="text-[10px] text-muted-foreground text-center leading-tight px-1">
                                                        Te lleva a Mercado Pago (dinero en cuenta, tarjeta, etc.)
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </RadioGroup>
                            )}
                        </div>
                    )}

                </section>

                <section className="bg-secondary/50 rounded-2xl p-5 border border-border/50">
                    <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-muted-foreground">Subtotal ({cart.items?.length} items)</span>
                        <span className="font-medium">${itemsTotal.toFixed(2)}</span>
                    </div>
                    {(() => {
                        const totalAhorro = cart?.items?.reduce((sum: number, item: any) => {
                            if (item.descuento && item.descuento > 0 && item.precioOriginal) {
                                const original = parseFloat(item.precioOriginal) * item.cantidad
                                const conDescuento = parseFloat(item.precio) * item.cantidad
                                return sum + (original - conDescuento)
                            }
                            return sum
                        }, 0) || 0
                        return totalAhorro > 0 ? (
                            <div className="flex justify-between items-center text-sm mb-2">
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ahorro por ofertas</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">-${totalAhorro.toFixed(2)}</span>
                            </div>
                        ) : null
                    })()}
                    {tipoPedido === 'delivery' && (
                        <div className="flex justify-between items-center text-sm mb-2">
                            <span className="text-muted-foreground">
                                {isCheckingZona ? 'Calculando envío...' : deliveryFee === 0 ? 'Delivery GRATIS' : zonaNombre ? `Delivery (${zonaNombre})` : 'Delivery'}
                            </span>
                            <span className="font-medium">
                                {isCheckingZona ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `$${deliveryFee.toFixed(2)}`}
                            </span>
                        </div>
                    )}
                    {montoDescuento > 0 && (
                        <div className="flex justify-between items-center text-sm mb-2">
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Descuento</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">-${montoDescuento.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center font-bold text-lg mt-4 pt-4 border-t-2 border-foreground/15">
                        <span>Total a enviar</span>
                        <span className="text-xl">${total.toFixed(2)}</span>
                    </div>
                </section>

                <Button
                    className="w-full h-14 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90 shadow-lg"
                    onClick={handleConfirm}
                    disabled={loading || (tipoPedido === 'delivery' && (isCheckingZona || fueraDeZona))}
                >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : fueraDeZona && tipoPedido === 'delivery' ? 'Dirección fuera de zona' : 'Confirmar Datos y Pedir'}
                </Button>
            </div >

            <MisPedidosDrawer
                open={misPedidosOpen}
                onOpenChange={setMisPedidosOpen}
                restauranteId={restauranteData?.id ?? cart?.restauranteId ?? null}
            />
        </div >
    )
}

export default CheckoutDelivery
