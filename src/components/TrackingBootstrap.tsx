import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { enviarEventosPendientes, obtenerSesionTracking } from '@/lib/tracking'

const RUTAS_SIN_USERNAME = new Set(['mesa', 'sala', 'menu', 'pedido-confirmado', 'agregar-producto', 'pedido-cerrado', 'pago', 'factura', 'esperando-pedido', 'pedido', 'pago-exitoso', 'pago-fallido', 'pago-pendiente'])

export function TrackingBootstrap() {
  const location = useLocation()
  useEffect(() => {
    const username = location.pathname.split('/').filter(Boolean)[0]
    if (username && !RUTAS_SIN_USERNAME.has(username)) obtenerSesionTracking(username)
    void enviarEventosPendientes()
  }, [location.pathname])
  useEffect(() => {
    const flush = () => { void enviarEventosPendientes() }
    window.addEventListener('online', flush); const timer = window.setInterval(flush, 30_000)
    return () => { window.removeEventListener('online', flush); window.clearInterval(timer) }
  }, [])
  return <Outlet />
}
