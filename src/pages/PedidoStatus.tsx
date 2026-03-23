import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Copy, Loader2, Store, Truck, Utensils, MapPin, Clock, Package, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/ThemeToggle'
import { MisPedidosDrawer } from '@/components/MisPedidosDrawer'
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react'

const MP_CHECKOUT_LAUNCHED_KEY = 'mpCheckoutLaunchedPedidoId'

function getEffectiveMetodo(orderInfo: { metodoPago?: string; aliasDinamico?: string; cvuDinamico?: string } | null): string {
    if (!orderInfo) return ''
    const raw = orderInfo.metodoPago || ''
    if (raw === 'efectivo') return 'cash'
    if (raw === 'mercadopago') return 'mercadopago_bricks'
    if (raw === 'transferencia') {
        return orderInfo.aliasDinamico || orderInfo.cvuDinamico ? 'transferencia_automatica_cucuru' : 'manual_transfer'
    }
    return raw
}

function waMeDigits(phone: string | null | undefined): string | null {
    if (!phone?.trim()) return null
    const d = phone.replace(/\D/g, '')
    return d.length >= 8 ? d : null
}

/**
 * PedidoStatus — pantalla independiente que carga info del pedido por ID vía API.
 * Ruta: /pedido/:id
 * Versión Alfajor (username hardcoded a 'alfajor').
 */
const PedidoStatus = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const mpCheckoutReturnParams = useMemo(
        () =>
            !!(
                searchParams.get('collection_id') ||
                searchParams.get('payment_id') ||
                searchParams.get('collection_status') ||
                searchParams.get('preference_id') ||
                searchParams.get('status')
            ),
        [searchParams]
    )

    const [orderInfo, setOrderInfo] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [status, setStatus] = useState<'pending_payment' | 'verifying' | 'confirmed'>('pending_payment')
    const [restauranteData, setRestauranteData] = useState<any>(null)
    const [isCreatingMP, setIsCreatingMP] = useState(false)
    const [misPedidosOpen, setMisPedidosOpen] = useState(false)
    const [pedidoEstado, setPedidoEstado] = useState<string | null>(null)
    const [rapiboyTrackingUrl, setRapiboyTrackingUrl] = useState<string | null>(null)
    const metaPurchaseTracked = useRef(false)
    const [showInstagramHelp, setShowInstagramHelp] = useState(false)
    const copyAliasTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const AliasNotice = ({ children }: { children?: React.ReactNode }) => (
        <div
            role="status"
            className="flex items-start gap-3 p-2 rounded-lg border border-primary/20 bg-primary/5 max-w-sm mx-auto w-full"
        >
            <div className="mt-0.5">
                <Copy className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
                <p className="text-sm font-semibold text-primary/90 leading-tight">Importante</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {children ?? 'Cada pedido genera un alias único. Copialo antes de realizar la transferencia.'}
                </p>
            </div>
        </div>
    )

    // Fetch order info from API on mount
    useEffect(() => {
        if (!id) return
        const fetchOrderInfo = async () => {
            try {
                const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
                const response = await fetch(`${url}/public/pedido-info/${id}`)
                const data = await response.json()
                if (data.success && data.data) {
                    const { pedido, items, restaurante } = data.data
                    const orderData = {
                        pedidoId: pedido.id,
                        tipoPedido: pedido.tipo,
                        total: parseFloat(pedido.total),
                        metodoPago: pedido.metodoPago,
                        nombreCliente: pedido.nombreCliente,
                        direccion: pedido.direccion,
                        items,
                        deliveryFee: restaurante?.deliveryFee,
                        montoDescuento: pedido.montoDescuento,
                    }
                    setOrderInfo(orderData)
                    setRestauranteData(restaurante)
                    setPedidoEstado(pedido.estado)
                    if (pedido.rapiboyTrackingUrl) setRapiboyTrackingUrl(pedido.rapiboyTrackingUrl)

                    if (pedido.pagado) {
                        setStatus('confirmed')
                    } else if (getEffectiveMetodo(orderData) === 'cash') {
                        setStatus('confirmed')
                    } else if (mpCheckoutReturnParams) {
                        setStatus('verifying')
                    }
                } else {
                    navigate('/')
                }
            } catch (err) {
                console.error('Error fetching pedido info:', err)
                navigate('/')
            } finally {
                setIsLoading(false)
            }
        }
        fetchOrderInfo()
    }, [id, navigate, mpCheckoutReturnParams])

    // Init MercadoPago Bricks SDK
    useLayoutEffect(() => {
        const m = getEffectiveMetodo(orderInfo)
        if (!orderInfo || (m !== 'mercadopago_bricks' && m !== 'mercadopago') || !restauranteData?.mpPublicKey) return
        initMercadoPago(restauranteData.mpPublicKey, { locale: 'es-AR' })
    }, [orderInfo, restauranteData?.mpPublicKey])

    // Poll payment status when verifying
    useEffect(() => {
        if (status !== 'verifying' || !orderInfo) return
        let isChecking = false

        const checkPaymentStatus = async () => {
            if (isChecking) return
            isChecking = true
            try {
                const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
                const response = await fetch(`${url}/public/pedido/${orderInfo.tipoPedido}/${orderInfo.pedidoId}/status`)
                const data = await response.json()
                if (data.success && data.pagado) {
                    setStatus('confirmed')
                    sessionStorage.removeItem(MP_CHECKOUT_LAUNCHED_KEY)
                    toast.success('¡Pago confirmado!', {
                        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
                        duration: 6000,
                    })
                }
                if (data.estado) setPedidoEstado(data.estado)
                if (data.rapiboyTrackingUrl) setRapiboyTrackingUrl(data.rapiboyTrackingUrl)
            } catch (error) {
                console.error('Error verificando estado del pago', error)
            } finally {
                isChecking = false
            }
        }

        const pollInterval = setInterval(checkPaymentStatus, 4000)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') checkPaymentStatus()
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            clearInterval(pollInterval)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [status, orderInfo])

    // WebSocket Connection
    useEffect(() => {
        if (!orderInfo) return
        let ws: WebSocket
        let isConnecting = false

        const connectWebSocket = () => {
            if (isConnecting) return
            isConnecting = true
            const wsBase = import.meta.env.VITE_WS_URL
                ? import.meta.env.VITE_WS_URL
                : import.meta.env.VITE_API_URL
                    ? import.meta.env.VITE_API_URL.replace('http', 'ws').replace('/api', '')
                    : 'ws://localhost:3000'

            ws = new WebSocket(`${wsBase}/ws/public/${orderInfo.tipoPedido}/${orderInfo.pedidoId}`)
            ws.onopen = () => { isConnecting = false }
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    if (data.type === 'PAGO_ACREDITADO') {
                        setStatus('confirmed')
                        sessionStorage.removeItem(MP_CHECKOUT_LAUNCHED_KEY)
                        toast.success('¡Pago confirmado!', {
                            icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
                            duration: 6000,
                        })
                    } else if (data.type === 'PEDIDO_ESTADO_ACTUALIZADO') {
                        setPedidoEstado(data.payload.estado)
                        if (data.payload.trackingUrl) setRapiboyTrackingUrl(data.payload.trackingUrl)
                        if (data.payload.estado === 'dispatched' || data.payload.estado === 'archived') {
                            toast.success('¡Tu pedido va en camino!', {
                                icon: <Truck className="w-5 h-5 text-blue-500" />,
                                duration: 6000
                            })
                        }
                    }
                } catch (e) {
                    console.error('Error parsing WS message', e)
                }
            }
            ws.onclose = () => {
                isConnecting = false
                setTimeout(connectWebSocket, 3000)
            }
        }

        connectWebSocket()
        return () => { if (ws) ws.close() }
    }, [orderInfo])

    // Meta Pixel
    useEffect(() => {
        if (status !== 'confirmed' || !orderInfo || metaPurchaseTracked.current) return
        const total = parseFloat(orderInfo.total)
        if (isNaN(total) || total <= 0) return
        metaPurchaseTracked.current = true
        try {
            const fbq = (window as any).fbq
            if (typeof fbq === 'function') {
                fbq('track', 'Purchase', { currency: 'ARS', value: total })
            }
        } catch { }
    }, [status, orderInfo])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        )
    }

    if (!orderInfo) return null

    const handleCopyAlias = async (aliasToCopy: string) => {
        try {
            await navigator.clipboard.writeText(aliasToCopy)
            toast.success('Alias copiado', { description: aliasToCopy })
            // Instagram helper
            setShowInstagramHelp(true)
            if (copyAliasTimerRef.current) clearTimeout(copyAliasTimerRef.current)
            copyAliasTimerRef.current = setTimeout(() => setShowInstagramHelp(false), 15000)
        } catch {
            toast.error('No se pudo copiar el alias')
        }
    }

    const handleCardPaymentSubmit = async (formData: {
        token: string
        issuer_id: string
        payment_method_id: string
        transaction_amount: number
        installments: number
        payer: { email?: string; identification?: { type?: string; number?: string } }
    }) => {
        setIsCreatingMP(true)
        try {
            const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
            const response = await fetch(`${url}/mp/process-brick`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: formData.token,
                    installments: formData.installments,
                    payment_method_id: formData.payment_method_id,
                    issuer_id: formData.issuer_id,
                    payer: {
                        email: formData.payer?.email,
                        identification: formData.payer?.identification
                            ? { type: formData.payer.identification.type, number: formData.payer.identification.number }
                            : undefined
                    },
                    pedidoId: orderInfo.pedidoId
                })
            })
            const data = await response.json()
            if (data.success) {
                if (data.status === 'approved') { setStatus('confirmed'); return }
                if (data.status === 'pending') {
                    setStatus('verifying')
                    toast.message('Pago en proceso', { description: 'Te avisamos cuando se acredite.' })
                    return
                }
                if (data.status === 'rejected') {
                    toast.error('Pago rechazado', { description: data.message || 'Revisá los datos.' })
                    throw new Error('mp_rejected')
                }
                toast.error('No se pudo completar el pago')
                throw new Error('mp_error')
            }
            toast.error('No se pudo procesar el pago', { description: data.error })
            throw new Error('mp_error')
        } catch (err) {
            if (err instanceof Error && err.message !== 'mp_rejected' && err.message !== 'mp_error') {
                toast.error('Error de conexión al procesar el pago')
            }
            throw err
        } finally {
            setIsCreatingMP(false)
        }
    }

    const handleMercadoPagoCheckoutRedirect = async () => {
        setIsCreatingMP(true)
        try {
            const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
            const response = await fetch(`${url}/mp/crear-preferencia-externo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pedidoId: orderInfo.pedidoId }),
            })
            const data = await response.json()
            if (data.success && data.url_pago) {
                sessionStorage.setItem(MP_CHECKOUT_LAUNCHED_KEY, String(orderInfo.pedidoId))
                window.location.href = data.url_pago
                return
            }
            toast.error('No se pudo iniciar el pago', { description: data.error })
        } catch {
            toast.error('Error de conexión al iniciar Mercado Pago')
        } finally {
            setIsCreatingMP(false)
        }
    }

    const { items, tipoPedido, total, pedidoId, deliveryFee, direccion, nombreCliente } = orderInfo
    const transferenciaAlias = restauranteData?.transferenciaAlias || null

    const effectiveMetodo = getEffectiveMetodo(orderInfo)
    const isManualTransferMetodo = effectiveMetodo === 'manual_transfer'
    const isAutoTransferMetodo =
        effectiveMetodo === 'transferencia_automatica_cucuru' || effectiveMetodo === 'transferencia_automatica_talo'
    const isMpBricksMetodo = effectiveMetodo === 'mercadopago_bricks' || effectiveMetodo === 'mercadopago'
    const isMpCheckoutMetodo = effectiveMetodo === 'mercadopago_checkout'

    const clienteNombreWhatsapp = (nombreCliente && String(nombreCliente).trim()) || 'Cliente'
    const comprobantesRaw =
        (restauranteData?.comprobantesWhatsapp && String(restauranteData.comprobantesWhatsapp).trim()) ||
        (restauranteData?.telefono && String(restauranteData.telefono).trim()) || ''
    const whatsappDigits = waMeDigits(comprobantesRaw)
    const whatsappHref = whatsappDigits
        ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
            `Hola, te paso el comprobante de mi pedido #${pedidoId} a nombre de ${clienteNombreWhatsapp}.`,
        )}`
        : null

    const OrderSummary = ({ compact = false }: { compact?: boolean }) => (
        <div className={`bg-card border border-border rounded-2xl ${compact ? 'p-4' : 'p-5'} shadow-sm space-y-3`}>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Tu pedido</h4>
            <div className="flex flex-col gap-2.5">
                {items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-start gap-2">
                        <div className="flex gap-2 min-w-0">
                            <span className="font-semibold text-primary/90 min-w-4 shrink-0">{item.cantidad}x</span>
                            <p className="font-medium text-sm leading-tight truncate">{item.nombreProducto || item.nombre}</p>
                        </div>
                        <span className="text-sm font-medium shrink-0">
                            ${(parseFloat(item.precio) * item.cantidad).toFixed(2)}
                        </span>
                    </div>
                ))}
            </div>
            {tipoPedido === 'delivery' && deliveryFee && (
                <div className="flex justify-between items-center pt-2 border-t border-border/50">
                    <span className="text-sm text-muted-foreground">Envío</span>
                    <span className="text-sm font-medium">
                        {parseFloat(deliveryFee) === 0 ? 'GRATIS' : `$${parseFloat(deliveryFee).toFixed(2)}`}
                    </span>
                </div>
            )}
            {orderInfo?.montoDescuento != null && parseFloat(String(orderInfo.montoDescuento)) > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-border/50">
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Código de descuento</span>
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">-${parseFloat(String(orderInfo.montoDescuento)).toFixed(2)}</span>
                </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t-2 border-foreground/15">
                <span className="font-bold">Total</span>
                <span className="text-lg font-black">${total?.toFixed(2)}</span>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-background font-sans selection:bg-primary/20 pb-10 flex flex-col items-center">
            <div className="w-full fixed top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50">
                <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
                    <span className="font-semibold text-lg bg-linear-to-r from-primary to-primary bg-clip-text text-transparent opacity-80">Alfajor con Papas</span>
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

            <div className="max-w-xl w-full mx-auto px-5 pt-20 space-y-6 flex-1 flex flex-col">

                {status === 'pending_payment' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center space-y-3">
                            <div className="mx-auto w-20 h-20 rounded-full bg-secondary flex items-center justify-center border-4 border-background shadow-lg">
                                <Utensils className="w-10 h-10 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-2xl font-black tracking-tight">¡Casi listo!</h1>
                                <p className="text-muted-foreground">Tu pedido #{pedidoId} fue creado.</p>
                            </div>
                        </div>

                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 shadow-sm mx-auto max-w-sm w-full space-y-4">
                            <p className="font-medium text-primary/80 text-center">
                                {isMpBricksMetodo || isMpCheckoutMetodo ? 'Total a pagar' : 'Total a transferir'}
                            </p>
                            <p className="text-4xl font-black text-center">${total?.toFixed(2)}</p>

                            <div className="pt-2">
                                {isMpBricksMetodo ? (
                                    restauranteData?.mpPublicKey ? (
                                        <div className="w-full relative mt-1 space-y-2">
                                            {isCreatingMP && (
                                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl min-h-[120px]">
                                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                </div>
                                            )}
                                            <p className="text-xs text-center text-muted-foreground">
                                                Completá los datos de tu tarjeta. El cobro lo procesa Mercado Pago de forma segura.
                                            </p>
                                            <CardPayment
                                                locale="es-AR"
                                                initialization={{ amount: Number(total) }}
                                                customization={{ paymentMethods: { maxInstallments: 12 } }}
                                                onSubmit={handleCardPaymentSubmit}
                                                onError={() => {
                                                    toast.error('No se pudo cargar el formulario de pago', {
                                                        description: 'Actualizá la página o probá más tarde.'
                                                    })
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-sm text-center text-muted-foreground">
                                            Este local no tiene habilitado el pago con tarjeta.
                                        </p>
                                    )
                                ) : isMpCheckoutMetodo ? (
                                    <div className="space-y-3">
                                        <p className="text-xs text-center text-muted-foreground leading-snug">
                                            Te redirigimos a Mercado Pago para abonar con dinero en cuenta, tarjeta u otros medios.
                                        </p>
                                        <Button
                                            className="w-full h-14 text-lg font-bold rounded-xl bg-[#009EE3] hover:bg-[#008ed4] text-white"
                                            onClick={handleMercadoPagoCheckoutRedirect}
                                            disabled={isCreatingMP}
                                        >
                                            {isCreatingMP ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Ir a Mercado Pago'}
                                        </Button>
                                    </div>
                                ) : isManualTransferMetodo ? (
                                    <>
                                        <AliasNotice>Transferí el monto exacto al alias del local.</AliasNotice>
                                        {transferenciaAlias && (
                                            <Button
                                                variant="outline"
                                                className="w-full h-14 text-base font-bold rounded-xl border-2 border-primary/30 mt-3 gap-2"
                                                onClick={() => handleCopyAlias(transferenciaAlias)}
                                            >
                                                <Copy className="w-5 h-5 shrink-0" />
                                                <span className="truncate">Copiar alias: {transferenciaAlias}</span>
                                            </Button>
                                        )}
                                        {whatsappHref && (
                                            <Button asChild className="w-full h-14 text-lg font-bold rounded-xl shadow-md mt-4 bg-[#25D366] hover:bg-[#20BD5A] text-white border-0">
                                                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">Enviar comprobante por WhatsApp</a>
                                            </Button>
                                        )}
                                    </>
                                ) : null}
                            </div>
                        </div>

                        {/* Instagram in-app browser helper */}
                        {showInstagramHelp && (isAutoTransferMetodo || isManualTransferMetodo) && (
                            <div className="bg-linear-to-r from-purple-500/10 to-pink-500/10 border border-purple-300/30 rounded-2xl p-4 max-w-sm mx-auto w-full animate-in slide-in-from-bottom-2 duration-300">
                                <p className="text-xs font-bold text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-1.5">
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    ¿Estás en Instagram?
                                </p>
                                <p className="text-xs text-muted-foreground leading-snug">
                                    Instagram bloquea las apps bancarias. Abrí esta página en Chrome/Safari (tocá los
                                    <strong> ⋮ </strong> o <strong> ⋯ </strong> de arriba a la derecha → "Abrir en navegador") y pegá el alias ahí.
                                </p>
                            </div>
                        )}

                        <OrderSummary />
                    </div>
                )}

                {status === 'verifying' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="text-center space-y-3">
                            <div className="relative w-20 h-20 flex items-center justify-center mx-auto">
                                <Loader2 className="w-14 h-14 text-primary animate-spin absolute" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold">
                                    {isMpCheckoutMetodo
                                        ? 'Confirmando pago en Mercado Pago...'
                                        : isMpBricksMetodo
                                            ? 'Confirmando pago con tarjeta...'
                                            : 'Aguardando transferencia...'}
                                </h2>
                                <p className="text-muted-foreground text-sm animate-pulse">
                                    {isMpCheckoutMetodo
                                        ? 'Si ya pagaste en Mercado Pago, la acreditación puede tardar unos segundos. No cierres esta pantalla.'
                                        : isMpBricksMetodo
                                            ? 'Mercado Pago puede tardar unos segundos. No cierres esta pantalla.'
                                            : 'Realizá el pago y no cierres esta pantalla'}
                                </p>
                            </div>
                        </div>

                        {(isMpBricksMetodo || isMpCheckoutMetodo) && (
                            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 max-w-sm mx-auto w-full text-center">
                                <p className="text-xs font-semibold text-primary/80">Monto del pedido</p>
                                <p className="text-3xl font-black mt-1">${total?.toFixed(2)}</p>
                            </div>
                        )}

                        <OrderSummary />
                    </div>
                )}

                {status === 'confirmed' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full">
                        {(pedidoEstado === 'dispatched' || pedidoEstado === 'archived') ? (
                            <div className="text-center space-y-3">
                                <div className="mx-auto w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2 ring-8 ring-blue-50 dark:ring-blue-900/10">
                                    <Truck className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h1 className="text-3xl font-black tracking-tight text-blue-600 dark:text-blue-500">¡En camino!</h1>
                                <p className="text-base font-medium text-muted-foreground">Tu pedido #{pedidoId} ya fue despachado</p>
                            </div>
                        ) : (
                            <div className="text-center space-y-3">
                                <div className="mx-auto w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2 ring-8 ring-green-50 dark:ring-green-900/10">
                                    <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
                                </div>
                                <h1 className="text-3xl font-black tracking-tight text-green-600 dark:text-green-500">¡Pedido Confirmado!</h1>
                                <p className="text-base font-medium text-muted-foreground">Ya estamos recibiendo tu pedido en cocina</p>
                            </div>
                        )}

                        {/* Tracker visual */}
                        <div className="bg-card border-2 border-primary/30 rounded-2xl p-5 shadow-md">
                            <div className="flex items-center w-full gap-0 py-2">
                                {(['pending', 'dispatched'] as const).map((step, i) => {
                                    const effectiveEstado = pedidoEstado || 'pending'
                                    const normalizedEstado = (['preparing', 'ready'].includes(effectiveEstado)) ? 'pending' : (effectiveEstado === 'archived' ? 'dispatched' : effectiveEstado)
                                    const stepOrder = ['pending', 'dispatched']
                                    const currentIdx = stepOrder.indexOf(normalizedEstado)
                                    const allDone = effectiveEstado === 'delivered' || effectiveEstado === 'dispatched' || effectiveEstado === 'archived'
                                    const isCompleted = allDone || (currentIdx >= 0 && i < currentIdx)
                                    const isCurrent = !allDone && step === normalizedEstado
                                    const label = step === 'pending' ? 'Recibido' : 'En camino'

                                    return (
                                        <div key={step} className="flex items-center flex-1 min-w-0">
                                            <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                                                <div className={`
                                                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-500
                                                    ${isCompleted
                                                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                                        : isCurrent
                                                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30 ring-4 ring-primary/20 animate-pulse'
                                                            : 'bg-muted text-muted-foreground'}
                                                `}>
                                                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : (i + 1)}
                                                </div>
                                                <span className={`text-xs font-semibold text-center leading-tight
                                                    ${isCurrent ? 'text-primary font-bold' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}
                                                `}>
                                                    {label}
                                                </span>
                                            </div>
                                            {i < 1 && (
                                                <div className={`h-0.5 flex-1 mx-2 rounded-full -mt-5 transition-all duration-500
                                                    ${isCompleted ? 'bg-emerald-500' : 'bg-border'}
                                                `} />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Info card */}
                        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                            <div className="p-4">
                                <div className="flex items-start gap-4 p-4 rounded-2xl bg-secondary/50">
                                    <div className="p-3 bg-background rounded-full shadow-sm text-primary shrink-0">
                                        {tipoPedido === 'delivery' ? <Truck className="w-6 h-6" /> : <Store className="w-6 h-6" />}
                                    </div>
                                    <div className="space-y-1.5 min-w-0">
                                        <h3 className="font-bold text-base leading-none">
                                            {(pedidoEstado === 'dispatched' || pedidoEstado === 'archived')
                                                ? '¡Tu pedido va en camino!'
                                                : tipoPedido === 'delivery' ? 'Delivery' : 'Retiro en local'}
                                        </h3>
                                        {tipoPedido === 'delivery' && direccion ? (
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">{direccion}</span>
                                                </div>
                                            </div>
                                        ) : tipoPedido === 'takeaway' ? (
                                            <div className="space-y-1">
                                                {restauranteData?.direccion && (
                                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                        <span className="truncate">{restauranteData.direccion}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <Clock className="w-3.5 h-3.5 shrink-0" />
                                                    <span>Estará listo en ~10 minutos</span>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            {rapiboyTrackingUrl && (
                                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border-t border-orange-100 dark:border-orange-900/30">
                                    <Button
                                        className="w-full h-12 rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20"
                                        onClick={() => window.open(rapiboyTrackingUrl, '_blank')}
                                    >
                                        <Truck className="w-5 h-5 mr-2" />
                                        Rastrear pedido en vivo
                                    </Button>
                                </div>
                            )}
                        </div>

                        <OrderSummary />

                        <Button
                            variant="outline"
                            className="w-full h-12 rounded-xl font-semibold"
                            onClick={() => navigate('/')}
                        >
                            Volver al inicio
                        </Button>
                    </div>
                )}
            </div>

            <MisPedidosDrawer
                open={misPedidosOpen}
                onOpenChange={setMisPedidosOpen}
                restauranteId={restauranteData?.id ?? null}
            />
        </div>
    )
}

export default PedidoStatus
