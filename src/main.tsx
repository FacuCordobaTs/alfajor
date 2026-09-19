import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { Toaster } from 'sonner'
import { ThemeProvider } from './components/ThemeProvider'
import Nombre from './pages/Nombre'
import Menu from './pages/Menu'
import { PagoExitoso, PagoFallido, PagoPendiente } from './pages/PagoResultado'
import MenuDelivery from './pages/MenuDelivery'
import CheckoutDelivery from './pages/CheckoutDelivery'
import SuccessDelivery from './pages/SuccessDelivery'
import SuccessGrupal from './pages/SuccessGrupal'
import PedidoStatus from './pages/PedidoStatus'
import { TrackingBootstrap } from './components/TrackingBootstrap'
import { CampanaLinkResolver, RecetaLinkResolver } from './pages/MarketingLinkResolver'
import TiendaRopa from './pages/TiendaRopa'
import ProductoRopaDetalle from './pages/ProductoRopaDetalle'

const rutas = [
  {
    path: "/",
    element: <MenuDelivery />,
  },
  {
    path: "/ropa",
    element: <TiendaRopa />,
  },
  {
    path: "/ropa/producto/:id",
    element: <ProductoRopaDetalle />,
  },
  {
    path: "/ropa/:id",
    element: <ProductoRopaDetalle />,
  },
  {
    path: "/mesa/:qrToken",
    element: <Nombre />,
  },
  {
    path: "/sala/:qrToken/nombre",
    element: <Nombre />,
  },
  {
    path: "/sala/:qrToken",
    element: <Menu />,
  },
  {
    path: "/sala/:qrToken/success",
    element: <SuccessGrupal />,
  },
  {
    path: "/mesa/:qrToken/pago-exitoso",
    element: <PagoExitoso />,
  },
  {
    path: "/mesa/:qrToken/pago-fallido",
    element: <PagoFallido />,
  },
  {
    path: "/mesa/:qrToken/pago-pendiente",
    element: <PagoPendiente />,
  },
  {
    path: "/checkout",
    element: <CheckoutDelivery />,
  },
  {
    path: "/pedido/:id",
    element: <PedidoStatus />,
  },
  {
    path: "/success",
    element: <SuccessDelivery />,
  },
  // Los enlaces de campañas/recetas deben resolverse antes de la tienda raíz.
  { path: "/c/:slug", element: <CampanaLinkResolver /> },
  { path: "/r/:token", element: <RecetaLinkResolver /> },
]

const router = createBrowserRouter([{ element: <TrackingBootstrap />, children: rutas }])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="piru-ui-theme">
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        richColors
        closeButton
      />
    </ThemeProvider>
  </StrictMode>,
)
