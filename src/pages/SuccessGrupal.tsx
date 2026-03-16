import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Copy, Loader2, Store, Truck, MapPin, Clock, Users } from 'lucide-react'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/ThemeToggle'

const SuccessGrupal = () => {
  const { qrToken } = useParams()
  const navigate = useNavigate()
  const [orderInfo, setOrderInfo] = useState<any>(null)
  const [status, setStatus] = useState<'pending_payment' | 'verifying' | 'confirmed'>('pending_payment')
  const [restauranteData, setRestauranteData] = useState<any>(null)
  const [pedidoEstado, setPedidoEstado] = useState<string | null>(null)
  const [rapiboyTrackingUrl, setRapiboyTrackingUrl] = useState<string | null>(null)

  useEffect(() => {
    const savedInfo = sessionStorage.getItem('salaOrderInfo')
    if (savedInfo) {
      setOrderInfo(JSON.parse(savedInfo))
    } else if (qrToken) {
      navigate(`/sala/${qrToken}`)
    }
  }, [qrToken, navigate])

  useEffect(() => {
    const fetchRestaurante = async () => {
      if (!orderInfo?.token) return
      try {
        const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
        const res = await fetch(`${url}/mesa/join/${orderInfo.token}`)
        const data = await res.json()
        if (data.success && data.data?.restaurante) {
          setRestauranteData(data.data.restaurante)
        }
      } catch (err) {
        console.error('Error fetching restaurante:', err)
      }
    }
    if (orderInfo?.token) {
      fetchRestaurante()
    }
  }, [orderInfo?.token])

  useEffect(() => {
    if (!orderInfo?.pedidoId || !orderInfo?.tipoPedido) return
    const fetchStatus = async () => {
      try {
        const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
        const res = await fetch(`${url}/public/pedido/${orderInfo.tipoPedido}/${orderInfo.pedidoId}/status`)
        const data = await res.json()
        if (data.success) {
          if (data.pagado) setStatus('confirmed')
          if (data.estado) setPedidoEstado(data.estado)
          if (data.rapiboyTrackingUrl) setRapiboyTrackingUrl(data.rapiboyTrackingUrl)
        }
      } catch (err) {
        console.error('Error fetching status:', err)
      }
    }
    fetchStatus()
  }, [orderInfo?.pedidoId, orderInfo?.tipoPedido])

  useEffect(() => {
    if (!orderInfo?.pedidoId || !orderInfo?.tipoPedido) return

    const wsBase = import.meta.env.VITE_WS_URL
      ? import.meta.env.VITE_WS_URL
      : import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace('http', 'ws').replace('/api', '')
        : 'ws://localhost:3000'

    const ws = new WebSocket(`${wsBase}/ws/public/${orderInfo.tipoPedido}/${orderInfo.pedidoId}`)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'PAGO_ACREDITADO') {
          setStatus('confirmed')
          toast.success('¡Transferencia recibida!', {
            icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
            duration: 6000
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

    return () => ws.close()
  }, [orderInfo?.pedidoId, orderInfo?.tipoPedido])

  useEffect(() => {
    if (status !== 'verifying' || !orderInfo) return
    let isChecking = false
    const checkPaymentStatus = async () => {
      if (isChecking) return
      isChecking = true
      try {
        const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
        const res = await fetch(`${url}/public/pedido/${orderInfo.tipoPedido}/${orderInfo.pedidoId}/status`)
        const data = await res.json()
        if (data.success && data.pagado) {
          setStatus('confirmed')
          toast.success('¡Transferencia recibida!', {
            icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
            duration: 6000
          })
        }
      } catch (err) {
        console.error('Error verificando pago:', err)
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

  if (!orderInfo) return null

  const { items, tipoPedido, total, pedidoId, deliveryFee, direccion, cucuruAlias, cucuruAccountNumber } = orderInfo

  const handleCopyAlias = async (aliasToCopy: string) => {
    try {
      await navigator.clipboard.writeText(aliasToCopy)
      toast.success('Alias copiado', { description: aliasToCopy })
    } catch (err) {
      toast.error('No se pudo copiar el alias')
    }
  }

  // Colores hardcodeados para single tenant
  const primario = '#0a331d'
  const secundario = '#eae7e0'

  const themeStyles = (
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
  )

  const OrderSummary = () => (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
      <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Users className="w-4 h-4" />
        Pedido grupal
      </h4>
      <div className="flex flex-col gap-2.5">
        {items?.map((item: any, i: number) => (
          <div key={i} className="flex justify-between items-start gap-2">
            <div className="flex gap-2 min-w-0 flex-1">
              <span className="font-semibold text-primary/90 min-w-4 shrink-0">{item.cantidad}x</span>
              <div className="min-w-0">
                <p className="font-medium text-sm leading-tight truncate">{item.nombreProducto || item.nombre}</p>
                {item.clienteNombre && (
                  <p className="text-xs text-muted-foreground mt-0.5">de {item.clienteNombre}</p>
                )}
              </div>
            </div>
            <span className="text-sm font-medium shrink-0">
              ${(parseFloat(item.precio || '0') * (item.cantidad || 1)).toFixed(2)}
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
      <div className="flex justify-between items-center pt-2 border-t-2 border-foreground/15">
        <span className="font-bold">Total</span>
        <span className="text-lg font-black">${parseFloat(total || '0').toFixed(2)}</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20 pb-10 flex flex-col items-center">
      {themeStyles}
      <div className="w-full fixed top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-semibold text-lg bg-linear-to-r from-primary to-primary bg-clip-text text-transparent opacity-80">Piru</span>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-xl w-full mx-auto px-5 pt-20 space-y-6 flex-1 flex flex-col">

        {status === 'pending_payment' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-3">
              <div className="mx-auto w-20 h-20 rounded-full bg-secondary flex items-center justify-center border-4 border-background shadow-lg">
                <Users className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight">¡Casi listo!</h1>
                <p className="text-muted-foreground">Pedido grupal #{pedidoId} creado. Un integrante debe transferir el total.</p>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 shadow-sm mx-auto max-w-sm w-full space-y-4">
              <p className="font-medium text-primary/80 text-center">Total a transferir</p>
              <p className="text-4xl font-black text-center">${parseFloat(total || '0').toFixed(2)}</p>

              {(cucuruAlias || cucuruAccountNumber) ? (
                <>
                  <Button
                    className="w-full h-14 text-lg font-bold rounded-xl shadow-md gap-3 bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => {
                      handleCopyAlias(cucuruAlias || cucuruAccountNumber!)
                      setStatus('verifying')
                    }}
                  >
                    <Copy className="w-5 h-5" />
                    Copiar Alias: {cucuruAlias || cucuruAccountNumber}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-3 font-medium">
                    Copiá el alias o CBU y transferí el monto exacto desde tu app bancaria. Todos verán cuando se confirme.
                  </p>
                </>
              ) : (
                <p className="text-sm text-center text-muted-foreground">
                  Cargando datos de pago...
                </p>
              )}
            </div>

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
                <h2 className="text-xl font-bold">Aguardando transferencia...</h2>
                <p className="text-muted-foreground text-sm animate-pulse">Quien vaya a pagar debe transferir el monto exacto. Todos verán cuando se confirme.</p>
              </div>
            </div>

            {(cucuruAlias || cucuruAccountNumber) && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-3 max-w-sm mx-auto w-full">
                <p className="text-xs font-bold text-primary/80 text-center">Transferí este monto exacto:</p>
                <p className="text-3xl font-black text-center">${parseFloat(total || '0').toFixed(2)}</p>
                <Button
                  variant="outline"
                  className="w-full h-12 text-base font-bold rounded-xl border-primary/20 hover:bg-primary/10"
                  onClick={() => handleCopyAlias(cucuruAlias || cucuruAccountNumber!)}
                >
                  <Copy className="w-5 h-5 mr-2 text-primary" />
                  {cucuruAlias || cucuruAccountNumber}
                </Button>
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
                <p className="text-base font-medium text-muted-foreground">
                  El pedido #{pedidoId} ya fue despachado
                </p>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <div className="mx-auto w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2 ring-8 ring-green-50 dark:ring-green-900/10">
                  <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-green-600 dark:text-green-500">¡Pedido Confirmado!</h1>
                <p className="text-base font-medium text-muted-foreground">
                  Ya estamos recibiendo el pedido en cocina
                </p>
              </div>
            )}

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
                          ${isCompleted ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                            : isCurrent ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30 ring-4 ring-primary/20 animate-pulse'
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

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              {(cucuruAlias || cucuruAccountNumber) && (
                <div className="p-4 border-b border-border bg-primary/5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-primary/80">Alias / CBU de transferencia</p>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      Verificación automática
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full h-11 text-base font-bold rounded-xl border-primary/20 hover:bg-primary/10"
                    onClick={() => handleCopyAlias(cucuruAlias || cucuruAccountNumber!)}
                  >
                    <Copy className="w-4 h-4 mr-2 text-primary" />
                    {cucuruAlias || cucuruAccountNumber}
                  </Button>
                  <p className="text-xs mt-2 text-center text-muted-foreground">Total: ${parseFloat(total || '0').toFixed(2)}</p>
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-secondary/50">
                  <div className="p-3 bg-background rounded-full shadow-sm text-primary shrink-0">
                    {tipoPedido === 'delivery' ? <Truck className="w-6 h-6" /> : <Store className="w-6 h-6" />}
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <h3 className="font-bold text-base leading-none">
                      {(pedidoEstado === 'dispatched' || pedidoEstado === 'archived')
                        ? '¡El pedido va en camino!'
                        : tipoPedido === 'delivery' ? 'Delivery' : 'Retiro en local'}
                    </h3>
                    {tipoPedido === 'delivery' && direccion && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{direccion}</span>
                      </div>
                    )}
                    {tipoPedido === 'takeaway' && restauranteData?.direccion && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{restauranteData.direccion}</span>
                      </div>
                    )}
                    {tipoPedido === 'takeaway' && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Estará listo en ~10 minutos</span>
                      </div>
                    )}
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
              onClick={() => {
                sessionStorage.removeItem('salaOrderInfo')
                navigate(qrToken ? `/sala/${qrToken}` : '/')
              }}
            >
              Volver al inicio
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SuccessGrupal
