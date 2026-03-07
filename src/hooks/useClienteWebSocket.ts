import { useEffect, useRef, useState, useCallback } from 'react'
import { useMesaStore } from '@/store/mesaStore'
import { useCarritoStore } from '@/store/carritoStore'
import { toast } from 'sonner'

interface ItemPedido {
  id: number
  productoId: number
  clienteNombre: string
  cantidad: number
  precioUnitario: string
  nombreProducto?: string // Nombre del producto desde el servidor
  nombre?: string // Para compatibilidad
  precio?: number // Para compatibilidad con ItemCarrito
  imagenUrl?: string | null // URL de la imagen del producto
  ingredientesExcluidos?: number[] // IDs de ingredientes excluidos
  ingredientesExcluidosNombres?: string[] // Nombres de ingredientes excluidos
}

interface WebSocketState {
  items: ItemPedido[]
  total: string
  estado: 'pending' | 'preparing' | 'delivered' | 'closed' | 'served'
}

// Estado de confirmación de cada cliente
export interface ConfirmacionCliente {
  clienteId: string
  nombre: string
  confirmado: boolean
}

// Estado del proceso de confirmación grupal
export interface ConfirmacionGrupal {
  activa: boolean
  iniciadaPor: string
  iniciadaPorNombre: string
  confirmaciones: ConfirmacionCliente[]
  timestamp: string
}

interface UseClienteWebSocketReturn {
  state: WebSocketState | null
  isConnected: boolean
  error: string | null
  sendMessage: (message: any) => void
  confirmacionGrupal: ConfirmacionGrupal | null
  confirmacionCancelada: { canceladoPor: string } | null
  clearConfirmacionCancelada: () => void
}

const WS_URL = import.meta.env.VITE_WS_URL || 'wss://api.piru.app'

export const useClienteWebSocket = (): UseClienteWebSocketReturn => {
  const {
    qrToken, clienteId, clienteNombre, setClientes, setPedidoId,
    setPedidoCerrado, clearPedidoCerrado, setSubtotalesPagados, pedidoId, sessionEnded, endSession,
    setPedido, setPedidoListo
  } = useMesaStore()
  const { clearCarrito } = useCarritoStore()
  const [state, setState] = useState<WebSocketState | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmacionGrupal, setConfirmacionGrupal] = useState<ConfirmacionGrupal | null>(null)
  const [confirmacionCancelada, setConfirmacionCancelada] = useState<{ canceladoPor: string } | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasConnectedRef = useRef(false)
  const connectionIdRef = useRef<string | null>(null)

  // Refs para acceder a los valores actuales sin causar reconexiones
  const clienteIdRef = useRef(clienteId)
  const clienteNombreRef = useRef(clienteNombre)

  // Mantener refs actualizados
  useEffect(() => {
    clienteIdRef.current = clienteId
    clienteNombreRef.current = clienteNombre
  }, [clienteId, clienteNombre])

  // Función para limpiar el estado de cancelación
  const clearConfirmacionCancelada = useCallback(() => {
    setConfirmacionCancelada(null)
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const newMessage = {
        type: message.type,
        payload: {
          ...message.payload,
        },
      }
      console.log('Enviando mensaje a WebSocket:', newMessage)
      wsRef.current.send(JSON.stringify(newMessage))
    } else {
      console.error('WebSocket no está conectado')
    }
  }, [])

  // Efecto separado para enviar CLIENTE_CONECTADO cuando los datos estén disponibles
  useEffect(() => {
    // No enviar si la sesión terminó o si ya se envió para esta conexión
    if (sessionEnded) return

    if (isConnected && clienteId && clienteNombre && !hasConnectedRef.current && connectionIdRef.current) {
      console.log('Enviando CLIENTE_CONECTADO para conexión:', connectionIdRef.current)
      hasConnectedRef.current = true
      sendMessage({
        type: 'CLIENTE_CONECTADO',
        payload: {
          clienteId,
          nombre: clienteNombre,
        },
      })
    }
  }, [isConnected, clienteId, clienteNombre, sendMessage, sessionEnded])

  // Efecto principal de conexión - SOLO depende de qrToken y sessionEnded
  useEffect(() => {
    // No conectar si no hay qrToken o si la sesión terminó
    if (!qrToken || sessionEnded) {
      console.log('No conectando WebSocket:', { qrToken, sessionEnded })
      return
    }

    // Limpiar conexión anterior si existe
    if (wsRef.current) {
      wsRef.current.close(1000, 'qrToken changed')
      wsRef.current = null
    }

    // Limpiar timeout de reconexión si existe
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Generar ID único para esta instancia de conexión
    const instanceId = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    connectionIdRef.current = instanceId

    const connect = () => {
      // No reconectar si la sesión terminó
      if (sessionEnded) {
        console.log('Sesión terminada, no reconectando')
        return
      }

      // Prevenir múltiples conexiones simultáneas
      if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
        console.log('Ya hay una conexión en progreso, ignorando...')
        return
      }

      // Verificar que el ID de conexión no haya cambiado (componente desmontado y remontado)
      if (connectionIdRef.current !== instanceId) {
        console.log('ID de conexión cambió, abortando conexión antigua')
        return
      }

      try {
        console.log('Conectando WebSocket para qrToken:', qrToken, 'instancia:', instanceId)
        const ws = new WebSocket(`${WS_URL}/ws/${qrToken}`)
        wsRef.current = ws

        ws.onopen = () => {
          // Verificar que esta conexión sigue siendo la actual
          if (connectionIdRef.current !== instanceId) {
            console.log('Conexión obsoleta, cerrando')
            ws.close(1000, 'Obsolete connection')
            return
          }

          console.log('WebSocket conectado para cliente:', qrToken)
          setIsConnected(true)
          setError(null)
          // Resetear el flag para permitir envío de CLIENTE_CONECTADO
          hasConnectedRef.current = false
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('Mensaje WebSocket recibido:', data)

            switch (data.type) {
              case 'ESTADO_INICIAL':
                const nuevoEstado = data.payload.estado || 'pending'
                const nuevosItems = data.payload.items || []
                const nuevoTotal = data.payload.total || '0.00'
                const nuevoPedidoId = data.payload.pedidoId

                // Detectar si es un pedido diferente al guardado en localStorage
                // Si es diferente, limpiar estados de pago que podrían ser del pedido anterior
                const currentPedidoId = useMesaStore.getState().pedidoId
                if (nuevoPedidoId && currentPedidoId && nuevoPedidoId !== currentPedidoId) {
                  console.log('🔄 Nuevo pedido detectado, limpiando estado de pago anterior:', {
                    anterior: currentPedidoId,
                    nuevo: nuevoPedidoId
                  })
                  setSubtotalesPagados([])
                  setPedidoListo(false)
                  // También limpiar sessionEnded para permitir nuevo flujo
                  useMesaStore.setState({ sessionEnded: false })
                }

                // Siempre confiar en los datos del servidor - es la fuente de verdad
                // Si el servidor envía un pedido vacío, es porque es un nuevo pedido
                console.log('Estado inicial recibido:', {
                  pedidoId: nuevoPedidoId,
                  estado: nuevoEstado,
                  items: nuevosItems.length
                })

                setState({
                  items: nuevosItems,
                  total: nuevoTotal,
                  estado: nuevoEstado,
                })
                setClientes(data.payload.clientes || [])
                setPedidoId(nuevoPedidoId)
                break

              case 'CLIENTE_UNIDO':
                setClientes(data.payload.clientes || [])
                break

              case 'CLIENTE_DESCONECTADO':
                setClientes(data.payload.clientes || [])
                break

              case 'ITEM_AGREGADO':
                setState((prev) => prev ? {
                  ...prev,
                  items: data.payload.items || prev.items,
                  total: data.payload.total || prev.total,
                } : null)
                break

              case 'ITEM_ELIMINADO':
                setState((prev) => prev ? {
                  ...prev,
                  items: data.payload.items || prev.items,
                  total: data.payload.total || prev.total,
                } : null)
                break

              case 'CANTIDAD_ACTUALIZADA':
                setState((prev) => prev ? {
                  ...prev,
                  items: data.payload.items || prev.items,
                  total: data.payload.total || prev.total,
                } : null)
                break

              case 'PEDIDO_ACTUALIZADO':
                // Detectar si alguien más agregó un nuevo item para notificar localmente
                if (
                  data.payload.nuevoItem &&
                  data.payload.nuevoItem.clienteNombre !== 'Mozo' &&
                  data.payload.nuevoItem.clienteNombre !== clienteNombreRef.current
                ) {
                  const name = data.payload.nuevoItem.clienteNombre
                  const product = data.payload.nuevoItem.nombreProducto || 'un producto'
                  toast(`${name} agregó ${product} al pedido 🍽️`)
                }

                // Actualizar el estado con los items y pedido del servidor
                setState({
                  items: data.payload.items || [],
                  total: data.payload.pedido?.total || '0.00',
                  estado: data.payload.pedido?.estado || 'pending',
                })
                // Limpiar el carrito local ya que el servidor es la fuente de verdad
                // Esto evita duplicados y mantiene sincronización
                clearCarrito()
                break

              case 'PEDIDO_CONFIRMADO':
                setState({
                  items: data.payload.items || [],
                  total: data.payload.pedido?.total || '0.00',
                  estado: 'preparing',
                })
                // Limpiar estados de pago - el pedido acaba de confirmarse, nadie ha pagado aún
                setSubtotalesPagados([])
                setPedidoListo(false)
                // Limpiar estado de confirmación grupal
                setConfirmacionGrupal(null)
                setConfirmacionCancelada(null)
                // El estado se actualiza y los componentes reaccionan automáticamente
                // No usar window.location.href para evitar perder el estado
                break

              case 'PEDIDO_CERRADO':
                const cerradoItems = data.payload.items || []
                const cerradoTotal = data.payload.pedido?.total || '0.00'
                const cerradoPedidoId = data.payload.pedido?.id || pedidoId

                // Limpiar subtotales pagados de sesiones anteriores cuando se cierra un nuevo pedido
                // Esto evita que se muestren como pagados cuando en realidad no lo están
                setSubtotalesPagados([])

                // Guardar datos del pedido cerrado en el store para poder mostrarlos en la factura
                if (cerradoItems.length > 0 && cerradoPedidoId) {
                  setPedidoCerrado({
                    items: cerradoItems,
                    total: cerradoTotal,
                    pedidoId: cerradoPedidoId,
                  })
                }

                setState({
                  items: cerradoItems,
                  total: cerradoTotal,
                  estado: 'closed',
                })
                break

              case 'MESA_RESETEADA':
                // El admin reseteó la mesa - se creó un nuevo pedido vacío
                console.log('Mesa reseteada por admin:', data.payload)
                const nuevoPedidoIdReset = data.payload.nuevoPedidoId

                // Limpiar carrito local
                clearCarrito()

                // Limpiar datos del pedido cerrado anterior (ya no es relevante)
                clearPedidoCerrado()

                // Actualizar el pedidoId al nuevo pedido
                if (nuevoPedidoIdReset) {
                  setPedidoId(nuevoPedidoIdReset)
                }

                // Establecer estado como pending con items vacíos
                // El usuario será redirigido automáticamente por la lógica de redirección en las páginas
                setState({
                  items: [],
                  total: '0.00',
                  estado: 'pending',
                })
                break

              case 'PEDIDO_PAGADO':
                const pagadoItems = data.payload.items || []
                const pagadoTotal = data.payload.total || data.payload.pedido?.total || '0.00'
                const pagadoPedidoId = data.payload.pedido?.id || pedidoId
                const metodoPago = data.payload.metodo || 'efectivo'

                // Guardar datos del pedido pagado en el store para poder mostrarlos en la factura
                if (pagadoItems.length > 0 && pagadoPedidoId) {
                  setPedidoCerrado({
                    items: pagadoItems,
                    total: pagadoTotal,
                    pedidoId: pagadoPedidoId,
                  })
                }

                // Terminar la sesión para evitar reconexiones
                endSession()

                // Redirigir a la pantalla de factura con el método de pago
                window.location.href = `/factura?metodo=${metodoPago}`
                break

              case 'MOZO_NOTIFICADO':
                // Este mensaje se maneja en la página PedidoConfirmado
                break

              case 'SUBTOTALES_ACTUALIZADOS':
                // Actualizar estado de subtotales pagados (split payment)
                console.log('Subtotales actualizados:', data.payload)
                const todosSubtotales = data.payload.todosSubtotales || []
                setSubtotalesPagados(todosSubtotales)
                break

              // Mensajes de confirmación grupal
              case 'CONFIRMACION_INICIADA':
                console.log('Confirmación grupal iniciada:', data.payload)
                setConfirmacionGrupal(data.payload.confirmacionGrupal)
                setConfirmacionCancelada(null)
                break

              case 'CONFIRMACION_ACTUALIZADA':
                console.log('Confirmación grupal actualizada:', data.payload)
                setConfirmacionGrupal(data.payload.confirmacionGrupal)
                break

              case 'CONFIRMACION_CANCELADA':
                console.log('Confirmación grupal cancelada:', data.payload)
                setConfirmacionGrupal(null)
                setConfirmacionCancelada({ canceladoPor: data.payload.canceladoPor })
                break

              case 'ERROR':
                console.error('Error del servidor:', data.payload)
                setError(data.payload.message)
                break

              // Mensajes de modo carrito
              case 'NOMBRE_PEDIDO_ASIGNADO':
                console.log('Nombre del pedido asignado (carrito):', data.payload)
                // Actualizar el pedido en el store con el nuevo nombrePedido
                const nombreAsignado = data.payload.nombrePedido
                useMesaStore.getState().pedido && setPedido({
                  ...useMesaStore.getState().pedido!,
                  nombrePedido: nombreAsignado
                })
                break

              case 'PEDIDO_LISTO_PARA_RETIRAR':
                console.log('¡Pedido listo para retirar!', data.payload)
                setPedidoListo(true)
                break
            }
          } catch (err) {
            console.error('Error parseando mensaje WebSocket:', err)
          }
        }

        ws.onerror = (event) => {
          console.error('Error WebSocket:', event)
          setError('Error de conexión WebSocket')
          setIsConnected(false)
        }

        ws.onclose = (event) => {
          // Verificar que esta conexión sigue siendo la actual
          if (connectionIdRef.current !== instanceId) {
            console.log('Conexión obsoleta cerrada, ignorando')
            return
          }

          console.log('WebSocket cerrado, código:', event.code)
          setIsConnected(false)
          hasConnectedRef.current = false

          // Solo reconectar si no fue un cierre intencional y la sesión no terminó
          if (event.code !== 1000 && !sessionEnded) {
            console.log('Intentando reconectar en 3 segundos...')
            reconnectTimeoutRef.current = setTimeout(() => {
              connect()
            }, 3000)
          }
        }
      } catch (err) {
        console.error('Error creando WebSocket:', err)
        setError('No se pudo conectar al servidor')
      }
    }

    connect()

    return () => {
      console.log('Limpiando conexión WebSocket, instancia:', instanceId)
      connectionIdRef.current = null

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (wsRef.current) {
        // Cerrar con código 1000 para indicar cierre normal
        wsRef.current.close(1000, 'Component unmount')
        wsRef.current = null
      }
      hasConnectedRef.current = false
    }
  }, [qrToken, sessionEnded]) // Depender también de sessionEnded

  return { state, isConnected, error, sendMessage, confirmacionGrupal, confirmacionCancelada, clearConfirmacionCancelada }
}

