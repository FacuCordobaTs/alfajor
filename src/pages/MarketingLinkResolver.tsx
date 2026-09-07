import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { contextoParaResolverMarketing, guardarContextoTracking } from '@/lib/tracking'

type Destino = { tipo: 'tienda' } | { tipo: 'producto'; productoId: number } | { tipo: 'carrito'; carritoRep: string }
type Respuesta = { data?: { encontrada?: boolean; destino?: Destino; contexto?: { campaniaSlug?: string } } }
const API_URL = (import.meta.env.VITE_API_URL || 'https://api.piru.app/api').replace(/\/$/, '')
const USERNAME = 'alfajor'

function urlDestino(destino?: Destino) {
  if (destino?.tipo === 'producto') return `/?producto=${destino.productoId}`
  return destino?.tipo === 'carrito' ? `/?rep=${encodeURIComponent(destino.carritoRep)}` : '/'
}

function Resolver({ tipo }: { tipo: 'campana' | 'receta' }) {
  const navigate = useNavigate(); const { slug, token } = useParams()
  useEffect(() => {
    if ((tipo === 'campana' && !slug) || (tipo === 'receta' && !token)) return
    const abortador = new AbortController()
    const ejecutar = async () => {
      const identificador = tipo === 'campana' ? slug! : token!
      const endpoint = tipo === 'campana' ? 'campanas' : 'recetas'
      let respuesta: Respuesta | null = null
      try {
        const timeout = window.setTimeout(() => abortador.abort(), 4_000)
        const response = await fetch(`${API_URL}/public/marketing/${endpoint}/${USERNAME}/${encodeURIComponent(identificador)}?${new URLSearchParams(contextoParaResolverMarketing(USERNAME))}`, { signal: abortador.signal })
        window.clearTimeout(timeout)
        if (response.ok) respuesta = await response.json()
      } catch { /* fallback de tienda si el resolver o tracking no está disponible */ }
      if (tipo === 'campana' && respuesta?.data?.encontrada && respuesta.data.contexto?.campaniaSlug) guardarContextoTracking({ username: USERNAME, campaniaSlug: respuesta.data.contexto.campaniaSlug })
      if (tipo === 'receta' && respuesta?.data?.encontrada) guardarContextoTracking({ username: USERNAME, recetaToken: token! })
      navigate(urlDestino(respuesta?.data?.destino), { replace: true })
    }
    void ejecutar(); return () => abortador.abort()
  }, [navigate, slug, token, tipo])
  return null
}

export const CampanaLinkResolver = () => <Resolver tipo="campana" />
export const RecetaLinkResolver = () => <Resolver tipo="receta" />
